import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { randomBytes } from 'crypto';
import type multer from 'multer';

const buildClient = () => {
  const endpoint = env.r2Endpoint && String(env.r2Endpoint).trim()
    ? String(env.r2Endpoint).trim()
    : `https://${env.r2AccountId}.r2.cloudflarestorage.com`;

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    } as any,
    forcePathStyle: true
  });
};

const client = buildClient();

const makeFilename = (originalName: string) => {
  const ext = (originalName && originalName.includes('.')) ? `.${originalName.split('.').pop()}` : '.jpg';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${randomBytes(4).toString('hex')}`;
  return `${unique}${ext}`;
};

const r2Storage = (folder: string): multer.StorageEngine => {
  return {
    _handleFile: async (req: any, file: any, cb: any) => {
      try {
        const bucket = env.r2Bucket;
        if (!bucket) throw new Error('Missing R2 bucket configuration');

        const filename = makeFilename(file.originalname || 'file.jpg');
        const key = `${folder}/${filename}`;

        // Read the incoming stream into memory to determine content length
        const chunks: Buffer[] = [];
        for await (const chunk of file.stream) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = Buffer.concat(chunks);

        const put = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: file.mimetype,
          ContentLength: body.length
        });

        await client.send(put);

        const endpoint = env.r2Endpoint && String(env.r2Endpoint).trim()
          ? String(env.r2Endpoint).trim()
          : `https://${env.r2AccountId}.r2.cloudflarestorage.com`;

        // Construct a public URL using path-style endpoint: {endpoint}/{bucket}/{key}
        const url = `${endpoint.replace(/\/+$/,'')}/${bucket}/${key}`;

        // Provide multer the necessary file info
        // store r2 key on the file object so _removeFile can delete it later
        file.r2Key = key;
        cb(null, {
          filename,
          path: url,
          size: body.length
        });
      } catch (err) {
        cb(err as Error);
      }
    },
    _removeFile: async (_req: any, file: any, cb: any) => {
      try {
        const bucket = env.r2Bucket;
        if (!bucket) return cb(null);
        const key = file && (file.r2Key || (file.filename ? `${folder}/${file.filename}` : undefined));
        if (!key) return cb(null);
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
        cb(null);
      } catch (err) {
        cb(err as Error);
      }
    }
  } as multer.StorageEngine;
};

export default r2Storage;

import { Router } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { pipeline } from 'stream';
import { promisify } from 'util';

const router = Router();
const pipe = promisify(pipeline);

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

// Proxy GET for R2 objects. Query param: key=<bucket/key> (key is path inside bucket)
router.get('/r2', async (req, res) => {
  const key = String(req.query.key || '').trim();
  if (!key) return res.status(400).json({ message: 'key query parameter is required' });

  try {
    console.debug('[uploads/r2] requested key:', key);
    const bucket = env.r2Bucket;
    if (!bucket) return res.status(500).json({ message: 'R2 bucket not configured' });

    const get = new GetObjectCommand({ Bucket: bucket, Key: key });
    const resp = await client.send(get) as any;

    console.debug(`[uploads/r2] got object response for key=${key} ContentType=${resp.ContentType} ContentLength=${resp.ContentLength}`);
    // set headers
    const contentType = resp.ContentType || 'application/octet-stream';
    if (resp.CacheControl) res.setHeader('Cache-Control', resp.CacheControl);
    res.setHeader('Content-Type', contentType);

    // Body is a stream; pipe to response
    const body = resp.Body as NodeJS.ReadableStream;
    if (!body) return res.status(404).end();

    await pipe(body, res);
  } catch (err: any) {
    console.error('[uploads/r2] error fetching key=', key, err && err.message ? err.message : err);
    res.status(502).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;

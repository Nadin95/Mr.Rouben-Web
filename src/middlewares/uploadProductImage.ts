import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { env } from '../config/env';

// ── File filter (shared) ──────────────────────────────────────────────────────
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }
  cb(new Error('Solo se permiten archivos de imagen.'));
};

// ── Storage: Cloudinary (prod) vs disk (dev) ──────────────────────────────────
const buildStorage = (folder: string): multer.StorageEngine => {
  if (env.storageProvider === 'cloudinary' && isCloudinaryConfigured()) {
    return new CloudinaryStorage({
      cloudinary,
      params: {
        folder: `mr-rouben/${folder}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      } as Record<string, unknown>,
    });
  }

  // Local disk fallback
  const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads');
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      const safeExt = ext.replace(/[^.a-z0-9]/g, '') || '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${safeExt}`);
    },
  });
};

// ── Exports ───────────────────────────────────────────────────────────────────
export const uploadProductImage = multer({
  storage: buildStorage('products'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadPaymentProof = multer({
  storage: buildStorage('proofs'),
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});


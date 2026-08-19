import { env } from '../config/env';

export const diskUrlFor = (file?: Express.Multer.File, folder = 'products'): string => {
  if (!file) return '';
  // If it's already an external URL and we are not using R2 proxy, return it
  if (file.path && String(file.path).startsWith('http')) {
    if (env.storageProvider === 'r2') {
      // Prefer serving via same-origin proxy using the stored r2Key when available
      const key = (file as any).r2Key || `${folder}/${String(file.filename || '')}`;
      return `/uploads/r2?key=${encodeURIComponent(key)}`;
    }
    return file.path;
  }

  const filename = String(file.filename || '').replace(/\\/g, '/');
  return `/uploads/${folder}/${filename}`;
};

export default diskUrlFor;

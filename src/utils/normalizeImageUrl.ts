import { env } from '../config/env';

export const normalizeImageUrl = (url?: string): string => {
  if (!url) return '';
  const v = String(url).trim();
  if (!v) return '';

  // If using R2 and the URL points to the configured bucket, prefer the server proxy
  // so the server can fetch the object with credentials and stream it to the client.
  try {
    if (env.storageProvider === 'r2' && env.r2Bucket && v.startsWith('http')) {
      const m = v.match(new RegExp(`/${env.r2Bucket}/(.+)$`));
      if (m && m[1]) {
        const key = m[1];
        return `/uploads/r2?key=${encodeURIComponent(key)}`;
      }
    }
  } catch (err) {
    // ignore and fall back to default behavior
  }

  if (v.startsWith('http') || v.startsWith('/')) return v;
  return `/uploads/${v}`;
};

export default normalizeImageUrl;

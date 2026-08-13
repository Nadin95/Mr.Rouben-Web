export const normalizeImageUrl = (url?: string): string => {
  if (!url) return '';
  const v = String(url).trim();
  if (!v) return '';
  if (v.startsWith('http') || v.startsWith('/')) return v;
  return `/uploads/${v}`;
};

export default normalizeImageUrl;

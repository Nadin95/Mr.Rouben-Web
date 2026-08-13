export const diskUrlFor = (file?: Express.Multer.File, folder = 'products'): string => {
  if (!file) return '';
  if (file.path && String(file.path).startsWith('http')) return file.path;
  const filename = String(file.filename || '').replace(/\\/g, '/');
  return `/uploads/${folder}/${filename}`;
};

export default diskUrlFor;

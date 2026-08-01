export const ALLOWED_FILE_EXTENSIONS = [
  'doc', 'docx', 'pdf', 'rtf', 'txt',
  'ppt', 'pptx',
  'xls', 'xlsx', 'csv',
  'dwg', 'dxf', 'cdr', 'cdw', 'bak',
  'jpg', 'jpeg', 'png', 'bmp', 'svg',
  'zip', 'rar', '7z',
];

export const MAX_FILE_SIZE_MB = 50;

export const isFileExtensionAllowed = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_FILE_EXTENSIONS.includes(ext);
};

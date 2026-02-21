


export const MAX_FILE_SIZE_MB = 10;


export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;


export const SUPPORTED_FILE_TYPES = {
  documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  images: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  spreadsheets: ['.xls', '.xlsx', '.csv'],
  presentations: ['.ppt', '.pptx'],
  
  drawings: ['.dwg', '.dxf', '.cdr', '.cdw', '.bak'],
};


export const ALL_SUPPORTED_EXTENSIONS = [
  ...SUPPORTED_FILE_TYPES.documents,
  ...SUPPORTED_FILE_TYPES.images,
  ...SUPPORTED_FILE_TYPES.archives,
  ...SUPPORTED_FILE_TYPES.spreadsheets,
  ...SUPPORTED_FILE_TYPES.presentations,
  ...SUPPORTED_FILE_TYPES.drawings,
];


export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];


export const ORDER_FILE_TYPES = {
  TASK: 'task',
  SOLUTION: 'solution',
  REVISION: 'revision',
} as const;

export type OrderFileType = typeof ORDER_FILE_TYPES[keyof typeof ORDER_FILE_TYPES];

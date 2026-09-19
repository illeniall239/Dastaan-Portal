export const ALLOWED_FILE_EXTENSIONS = [
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf',
  // InPage (Urdu word processor)
  'inp',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp',
  // Video/Audio
  'mp4', 'mp3', 'ogg', 'wav', 'webm', 'mov', 'avi',
  // Archives
  'zip', 'rar',
];

export function isAllowedFileExtension(fileName: string): boolean {
  const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : '';
  if (!ext) return false;
  return ALLOWED_FILE_EXTENSIONS.includes(ext);
}

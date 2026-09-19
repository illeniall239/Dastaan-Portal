const DEFAULT_TITLE = 'Dashboard Section';

/** Strip HTML tags and return safe plain text for use in print window titles. */
export function sanitizeForPrintTitle(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_TITLE;
  // Strip all HTML tags
  const stripped = raw.replace(/<[^>]*>/g, '');
  return stripped || DEFAULT_TITLE;
}

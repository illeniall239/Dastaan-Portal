const ALLOWED_PATH_PREFIXES = [
  'call_reports', 'call_report',
  'one_liners', 'one_liner',
  'episodes', 'episode',
];

interface DownloadAccessInput {
  userId: string | null;
  externalToken: string | null;
  filePath: string;
}

interface DownloadAccessResult {
  allowed: boolean;
  reason?: 'unauthorized' | 'invalid_path';
}

export function validateDownloadAccess(input: DownloadAccessInput): DownloadAccessResult {
  const { userId, externalToken, filePath } = input;

  // Validate path structure
  const segments = filePath.split('/');
  if (
    segments.some(seg => seg === '..' || seg === '.' || seg === '') ||
    segments.length < 2 ||
    segments.length > 4
  ) {
    return { allowed: false, reason: 'invalid_path' };
  }

  const prefix = segments[0];
  if (!ALLOWED_PATH_PREFIXES.includes(prefix)) {
    return { allowed: false, reason: 'invalid_path' };
  }

  // Must be either authenticated or have a valid external token
  if (!userId && !externalToken) {
    return { allowed: false, reason: 'unauthorized' };
  }

  return { allowed: true };
}

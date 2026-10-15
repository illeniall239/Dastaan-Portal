/**
 * Episode file upload with progress tracking
 * Uses XMLHttpRequest to support upload progress callbacks
 */

export interface EpisodeUploadResult {
  publicUrl: string;
  filePath: string;
}

export async function uploadEpisodeFile(
  file: File,
  bucket: string,
  filePath: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  onProgress?: (progress: number) => void,
  accessToken?: string
): Promise<EpisodeUploadResult> {
  const attempt = () =>
    new Promise<EpisodeUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = 5 * 60 * 1000; // 5 minutes for large files

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            JSON.parse(xhr.responseText);
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
            resolve({ publicUrl, filePath });
          } catch {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          let msg = `Upload failed with status ${xhr.status}`;
          try {
            const error = JSON.parse(xhr.responseText);
            if (error.message) msg = error.message;
          } catch { /* keep default msg */ }
          reject(new Error(msg));
        }
      });

      xhr.addEventListener('error', () => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        reject(new Error(`Network error uploading ${file.name} (${sizeMB} MB) — check your connection and try again`));
      });

      xhr.addEventListener('timeout', () => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        reject(new Error(`Upload timed out for ${file.name} (${sizeMB} MB) — file may be too large or connection too slow`));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('File upload was cancelled'));
      });

      const url = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken || supabaseAnonKey}`);
      xhr.setRequestHeader('apikey', supabaseAnonKey);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });

  try {
    return await attempt();
  } catch (err) {
    // Single retry on network/timeout errors
    const msg = (err as Error).message || '';
    if (msg.includes('Network error') || msg.includes('timed out')) {
      onProgress?.(0);
      return attempt();
    }
    throw err;
  }
}

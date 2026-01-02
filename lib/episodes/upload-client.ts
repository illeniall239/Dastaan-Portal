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
  onProgress?: (progress: number) => void
): Promise<EpisodeUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);

          // Construct public URL
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;

          resolve({
            publicUrl,
            filePath,
          });
        } catch (parseError) {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || `Upload failed with status ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle network errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload'));
    });

    // Handle aborts
    xhr.addEventListener('abort', () => {
      reject(new Error('File upload was cancelled'));
    });

    // Prepare request
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseAnonKey}`);
    xhr.setRequestHeader('apikey', supabaseAnonKey);

    // Send file
    xhr.send(file);
  });
}

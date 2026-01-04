import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// Function to upload files via server API route to avoid client-side Supabase storage issues
export async function uploadFile(
  file: File,
  entityType: string,
  entityId: string,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);

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
      // Check content type before parsing
      const contentType = xhr.getResponseHeader('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        logger.error('Server returned non-JSON response:', {
          status: xhr.status,
          contentType,
        });
        logger.error('Response body:', xhr.responseText.substring(0, 500));
        reject(new Error(`Upload failed with status ${xhr.status}: Server returned HTML instead of JSON`));
        return;
      }

      try {
        const result = JSON.parse(xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(result.attachment);
        } else {
          logger.error('Upload failed:', {
            status: xhr.status,
            error: result.error,
            details: result.details,
            message: result.message
          });
          reject(new Error(result.message || result.error || 'Failed to upload file'));
        }
      } catch (parseError) {
        logger.error('Failed to parse response:', parseError);
        reject(new Error('Failed to parse server response'));
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

    // Send the request
    xhr.open('POST', '/api/attachments/upload');
    xhr.send(formData);
  });
}

// Function to delete a file (still uses client-side Supabase for now)
export async function deleteFile(fileId: string, filePath: string) {
  const supabase = createClient();
  
  // Remove the file from storage
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([filePath]);

  if (storageError) {
    logger.error('Error deleting file from storage:', storageError);
    throw new Error(`Failed to delete file from storage: ${storageError.message}`);
  }

  // Remove the record from the attachments table
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    logger.error('Error deleting attachment record:', dbError);
    throw new Error(`Failed to delete attachment record: ${dbError.message}`);
  }
}

// Function to get attachments for an entity
export async function getAttachmentsForEntity(entityType: string, entityId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    logger.error('Error fetching attachments:', error);
    throw new Error(`Failed to fetch attachments: ${error.message}`);
  }

  return data;
}

// Function to get a signed URL for a file (for private access)
export async function getSignedUrl(filePath: string, expiresIn = 3600) {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    logger.error('Error creating signed URL:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
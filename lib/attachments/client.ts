import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// Upload files directly to Supabase Storage via signed URL (bypasses server body size limits)
export async function uploadFile(
  file: File,
  entityType: string,
  entityId: string,
  onProgress?: (progress: number) => void
) {
  // Step 1: Get signed upload URL from server
  const presignRes = await fetch('/api/attachments/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'presign',
      entityType,
      entityId,
      fileName: file.name,
      fileType: file.type,
    }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({ message: 'Failed to prepare upload' }));
    throw new Error(err.message || 'Failed to prepare upload');
  }

  const { signedUrl, path, token } = await presignRes.json();

  // Step 2: Upload file directly to Supabase Storage via signed URL (no server proxy)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 90);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        logger.error('Direct upload failed:', { status: xhr.status, response: xhr.responseText.substring(0, 500) });
        reject(new Error(`Upload to storage failed (status ${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during file upload')));
    xhr.addEventListener('abort', () => reject(new Error('File upload was cancelled')));

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.send(file);
  });

  // Step 3: Register the attachment in the database
  onProgress?.(95);

  const registerRes = await fetch('/api/attachments/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'register',
      entityType,
      entityId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || 'application/octet-stream',
      filePath: path,
    }),
  });

  if (!registerRes.ok) {
    const err = await registerRes.json().catch(() => ({ message: 'Failed to save attachment record' }));
    throw new Error(err.message || 'Failed to save attachment record');
  }

  const result = await registerRes.json();
  onProgress?.(100);
  return result.attachment;
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
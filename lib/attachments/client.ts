import { createClient } from '@/lib/supabase/client';

// Function to upload files via server API route to avoid client-side Supabase storage issues
export async function uploadFile(file: File, entityType: string, entityId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);

  const response = await fetch('/api/attachments/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('Error uploading file:', result);
    throw new Error(result.error || 'Failed to upload file');
  }

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
    console.error('Error deleting file from storage:', storageError);
    throw new Error(`Failed to delete file from storage: ${storageError.message}`);
  }

  // Remove the record from the attachments table
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', fileId);

  if (dbError) {
    console.error('Error deleting attachment record:', dbError);
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
    console.error('Error fetching attachments:', error);
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
    console.error('Error creating signed URL:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
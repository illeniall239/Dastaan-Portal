import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// Function to get attachments for an entity (server-side)
export async function getAttachmentsForEntityServer(entityType: string, entityId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('attachments')
    .select(`
      *,
      users:uploaded_by (name)
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('Error fetching attachments:', error);
    throw new Error(`Failed to fetch attachments: ${error.message}`);
  }

  return data;
}

// Function to get a single attachment by ID
export async function getAttachmentById(attachmentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('attachments')
    .select(`
      *,
      users:uploaded_by (name)
    `)
    .eq('id', attachmentId)
    .single();

  if (error) {
    console.error('Error fetching attachment:', error);
    throw new Error(`Failed to fetch attachment: ${error.message}`);
  }

  return data;
}

// Function to delete an attachment (server-side)
export async function deleteAttachmentServer(attachmentId: string) {
  const supabase = await createClient();

  // First, get the file path before deleting the record
  const { data: attachment, error: fetchError } = await supabase
    .from('attachments')
    .select('file_path')
    .eq('id', attachmentId)
    .single();

  if (fetchError) {
    console.error('Error fetching attachment to delete:', fetchError);
    throw new Error(`Failed to fetch attachment: ${fetchError.message}`);
  }

  // Remove the file from storage
  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([attachment.file_path]);

  if (storageError) {
    console.error('Error deleting file from storage:', storageError);
    throw new Error(`Failed to delete file from storage: ${storageError.message}`);
  }

  // Remove the record from the attachments table
  const { error: dbError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', attachmentId);

  if (dbError) {
    console.error('Error deleting attachment record:', dbError);
    throw new Error(`Failed to delete attachment record: ${dbError.message}`);
  }
}

// Function to get a signed URL for a file (server-side)
export async function getSignedUrlServer(filePath: string, expiresIn = 3600) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('Error creating signed URL:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
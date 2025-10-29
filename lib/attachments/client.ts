import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Function to upload files to Supabase storage
export async function uploadFile(file: File, entityType: string, entityId: string) {
  const supabase = createClient();
  
  // Generate a unique filename with UUID to avoid conflicts
  const fileExtension = file.name.split('.').pop();
  const fileName = `${entityType}/${entityId}/${uuidv4()}.${fileExtension}`;
  
  // Upload the file to Supabase storage
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get the public URL for the uploaded file
  const { data: publicUrlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);

  // Insert a record in the attachments table to track this file
  const { data: attachmentData, error: insertError } = await supabase
    .from('attachments')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      file_type: file.type || `.${fileExtension}`,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating attachment record:', insertError);
    // Clean up the uploaded file if the database insert fails
    await supabase.storage
      .from('attachments')
      .remove([fileName]);
    throw new Error(`Failed to create attachment record: ${insertError.message}`);
  }

  return {
    ...attachmentData,
    publicUrl: publicUrlData.publicUrl
  };
}

// Function to delete a file
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
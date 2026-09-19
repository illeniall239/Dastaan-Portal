import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Uploads a file to Supabase Storage and verifies it was actually saved.
 * If verification fails, cleans up the partial upload and throws.
 *
 * Returns the public URL for the uploaded file.
 */
export async function uploadAndVerify(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File | Blob,
  options?: { upsert?: boolean; cacheControl?: string; contentType?: string }
): Promise<string> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Verify the file actually exists in storage
  const { error: verifyError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 10);

  if (verifyError) {
    await supabase.storage.from(bucket).remove([path]).catch(() => {});
    throw new Error(
      "Upload verification failed \u2014 the file was not saved correctly. Please check your connection and try again."
    );
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
}

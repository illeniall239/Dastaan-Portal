import { SupabaseClient } from "@supabase/supabase-js";

export interface DraftAttachment {
  file_name: string;
  file_path: string;
  file_size?: number | null;
  file_type?: string | null;
}

export interface LinkResult {
  linked: number;
  failed: { fileName: string; error: string }[];
}

export async function linkDraftAttachments(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
  uploadedBy: string,
  attachments: DraftAttachment[]
): Promise<LinkResult> {
  let linked = 0;
  const failed: { fileName: string; error: string }[] = [];

  for (const att of attachments) {
    const { error } = await supabase.from("attachments").insert({
      entity_type: entityType,
      entity_id: entityId,
      file_name: att.file_name,
      file_path: att.file_path,
      file_size: att.file_size,
      file_type: att.file_type || "application/octet-stream",
      uploaded_by: uploadedBy,
    });

    if (error) {
      failed.push({ fileName: att.file_name, error: error.message });
    } else {
      linked++;
    }
  }

  return { linked, failed };
}

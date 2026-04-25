import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entity_type and entity_id are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("attachments")
      .select("id, entity_id, file_name, file_path, file_size, file_type, uploaded_at, uploader:users!uploaded_by(name, email)")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      console.error("Error fetching attachments:", error);
      return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 });
    }

    return NextResponse.json({ attachments: data || [] });
  } catch (error) {
    console.error("Error in attachments GET:", error);
    return NextResponse.json({ error: "Failed to fetch attachments" }, { status: 500 });
  }
}

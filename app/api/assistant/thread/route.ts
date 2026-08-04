import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — load thread (messages + memory) for current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("assistant_threads")
    .select("messages, memory")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    messages: data?.messages ?? [],
    memory: data?.memory ?? [],
  });
}

// POST — save thread (messages + memory) for current user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, memory } = await request.json();

  const { error } = await supabase
    .from("assistant_threads")
    .upsert(
      {
        user_id: user.id,
        messages: messages ?? [],
        memory: memory ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Failed to save assistant thread:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — clear thread for current user
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("assistant_threads")
    .update({ messages: [], updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

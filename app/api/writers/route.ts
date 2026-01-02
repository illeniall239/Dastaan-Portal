import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';

// GET /api/writers - Fetch all active writers
export async function GET() {
  try {
    const supabase = await createClient();

    const { data: writers, error } = await supabase
      .from("writers")
      .select("id, name, email, phone, status, created_at, updated_at")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching writers:", error);
      return NextResponse.json(
        { error: "Failed to fetch writers" },
        { status: 500 }
      );
    }

    return NextResponse.json(writers);
  } catch (error) {
    console.error("Error in GET /api/writers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/writers - Create a new writer
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { name, email, phone } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Writer name is required" },
        { status: 400 }
      );
    }

    // Check if writer already exists
    const { data: existingWriter } = await supabase
      .from("writers")
      .select("id, name")
      .eq("name", name.trim())
      .single();

    if (existingWriter) {
      return NextResponse.json(
        { error: "A writer with this name already exists" },
        { status: 409 }
      );
    }

    // Insert new writer
    const { data: newWriter, error } = await supabase
      .from("writers")
      .insert({
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        status: "active",
      })
      .select("id, name, email, phone, status, created_at, updated_at")
      .single();

    if (error) {
      console.error("Error creating writer:", error);
      return NextResponse.json(
        { error: "Failed to create writer" },
        { status: 500 }
      );
    }

    // Revalidate pages that display writers list
    revalidatePath('/content-department/log-call-report');
    revalidatePath('/evaluator/log-call-report');

    return NextResponse.json(newWriter, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/writers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from 'next/cache';
import { logger } from "@/lib/logger";
import { createWriterSchema } from "@/lib/validations/writers";

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
      logger.error("Error fetching writers:", error);
      return NextResponse.json(
        { error: "Failed to fetch writers" },
        { status: 500 }
      );
    }

    return NextResponse.json(writers);
  } catch (error) {
    logger.error("Error in GET /api/writers:", error);
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

    // Validate request body
    const validation = createWriterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, email, phone } = validation.data;

    // Check if writer already exists
    const { data: existingWriter } = await supabase
      .from("writers")
      .select("id, name")
      .eq("name", name)
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
        name,
        email: email || null,
        phone: phone || null,
        status: "active",
      })
      .select("id, name, email, phone, status, created_at, updated_at")
      .single();

    if (error) {
      logger.error("Error creating writer:", error);
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
    logger.error("Error in POST /api/writers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

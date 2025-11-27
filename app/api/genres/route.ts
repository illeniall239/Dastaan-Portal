import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const createGenreSchema = z.object({
  name: z.string().min(1, "Genre name is required").max(100, "Genre name too long"),
});

/**
 * GET /api/genres
 * Fetch all active genres (predefined + custom user-created)
 */
export async function GET() {
  const supabase = await createClient();

  const { data: genres, error } = await supabase
    .from("genres")
    .select("id, name, is_predefined")
    .eq("status", "active")
    .order("is_predefined", { ascending: false }) // Predefined first
    .order("name", { ascending: true }); // Then alphabetically

  if (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json(
      { error: "Failed to fetch genres" },
      { status: 500 }
    );
  }

  return NextResponse.json({ genres });
}

/**
 * POST /api/genres
 * Create a new custom genre
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = createGenreSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid genre data",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name } = validation.data;
    const trimmedName = name.trim();

    // Check if genre already exists (case-insensitive)
    const { data: existing } = await supabase
      .from("genres")
      .select("id, name")
      .ilike("name", trimmedName)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: `Genre "${existing.name}" already exists`,
          genre: existing,
        },
        { status: 409 } // Conflict
      );
    }

    // Create new genre
    const { data: genre, error: insertError } = await supabase
      .from("genres")
      .insert({
        name: trimmedName,
        is_predefined: false,
        status: "active",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating genre:", insertError);
      return NextResponse.json(
        { error: "Failed to create genre" },
        { status: 500 }
      );
    }

    return NextResponse.json({ genre }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/genres:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

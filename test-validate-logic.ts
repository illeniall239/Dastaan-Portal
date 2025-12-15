
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testQuery(token: string) {
    console.log("Testing token:", token);

    const { data: link, error: linkError } = await adminSupabase
        .from("external_evaluation_links")
        .select("*")
        .eq("token", token)
        .single();

    if (linkError) {
        console.error("Link Error:", linkError);
        return;
    }

    console.log("Link found:", link.content_type, link.content_id);

    if (link.content_type === "call_report") {
        const { data: callReport, error: callReportError } = await adminSupabase
            .from("call_reports")
            .select(`
          id,
          call_report_id,
          working_title,
          logline,
          genre,
          content_type,
          contact_type,
          overall_rating,
          meeting_notes,
          logline_image_url,
          short_synopsis,
          episodic_synopsis,
          category,
          writers!left(
            writer_id,
            display_order,
            writer:writers(
              id,
              name,
              email,
              phone
            )
          ),
          stories(
            id,
            title,
            synopsis,
            writer_originator_name
          )
        `)
            .eq("id", link.content_id)
            .single();

        if (callReportError) {
            console.error("Call Report Error:", callReportError);
        } else {
            console.log("Call Report SUCCESS");
        }
    } else if (link.content_type === "episode") {
        const { data: episode, error: episodeError } = await adminSupabase
            .from("episodes")
            .select(`
          id,
          episode_number,
          title,
          attachment_url,
          attachment_name,
          additional_info,
          story_id,
          stories!inner(
            title,
            genre,
            writer_originator_name
          )
        `)
            .eq("id", link.content_id)
            .single();

        if (episodeError) {
            console.error("Episode Error:", episodeError);
        } else {
            console.log("Episode SUCCESS");
        }
    }
}

// Read tokens from evaluation_links.txt
try {
    const fileContent = fs.readFileSync("evaluation_links.txt", "utf-8");
    const lines = fileContent.split("\n").filter(line => line.trim() !== "");

    for (const line of lines) {
        // Format: [TYPE] http://.../token
        const match = line.match(/\/evaluate\/([a-f0-9]+)/);
        if (match && match[1]) {
            testQuery(match[1]);
        }
    }
} catch (e) {
    console.error("Error reading links file:", e);
}

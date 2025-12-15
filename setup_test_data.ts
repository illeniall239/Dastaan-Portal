
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomBytes } from "crypto";
import fs from "fs";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupTestData() {
    console.log("Setting up test data...");

    // 1. Get a valid user for 'created_by'
    const { data: user, error: userError } = await adminSupabase
        .from("users")
        .select("id")
        .limit(1)
        .single();

    if (userError || !user) {
        console.error("Error finding user:", userError);
        return;
    }
    console.log("Found user ID:", user.id);

    // 2. Get valid Call Report
    const { data: callReport, error: crError } = await adminSupabase
        .from("call_reports")
        .select("id")
        .limit(1)
        .single();

    if (crError || !callReport) {
        console.error("Error finding call report:", crError);
    } else {
        await createLink("call_report", callReport.id, user.id);
    }

    // 3. Get valid Episode
    const { data: episode, error: epError } = await adminSupabase
        .from("episodes")
        .select("id")
        .limit(1)
        .single();

    if (epError || !episode) {
        console.error("Error finding episode:", epError);
    } else {
        await createLink("episode", episode.id, user.id);
    }
}

async function createLink(contentType: string, contentId: string, userId: string) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { data: link, error } = await adminSupabase
        .from("external_evaluation_links")
        .insert({
            token,
            content_type: contentType,
            content_id: contentId,
            created_by: userId,
            expires_at: expiresAt.toISOString(),
            is_active: true,
            current_submissions: 0
        })
        .select()
        .single();

    if (error) {
        console.error(`Error creating ${contentType} link:`, error);
    } else {
        const url = `http://localhost:3000/public/evaluate/${token}`;
        console.log(`\n[${contentType.toUpperCase()}] Evaluation Link:`);
        console.log(url);
        fs.appendFileSync("evaluation_links.txt", `[${contentType.toUpperCase()}] ${url}\n`);
    }
}

setupTestData();

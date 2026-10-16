/**
 * Fixes the staging DB after initial migration run:
 *  1. Recreates get_current_user with correct return type
 *  2. Creates episodes storage bucket
 *  3. Fixes email domain validation trigger ownership
 *
 * Usage: node scripts/fix-staging.mjs <DB_PASSWORD> [region]
 */
import pg from "pg";

const password = process.argv[2];
const region = process.argv[3] || "ap-northeast-1";
if (!password) { console.error("Usage: node scripts/fix-staging.mjs <DB_PASSWORD> [region]"); process.exit(1); }

import { readFileSync } from "fs";
import { join } from "path";
const envContent = readFileSync(join(process.cwd(), ".env.staging"), "utf8");
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="https:\/\/(.+?)\.supabase\.co"/);
const projectRef = urlMatch[1];

const client = new pg.Client({
  host: `aws-0-${region}.pooler.supabase.com`,
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
});

const fixes = [
  {
    name: "Fix get_current_user return type",
    sql: `
      DROP FUNCTION IF EXISTS get_current_user() CASCADE;
      CREATE OR REPLACE FUNCTION get_current_user()
      RETURNS TABLE(
        id uuid, email text, name text, role text, department text,
        phone text, "position" text, avatar_url text, status text,
        created_at timestamp without time zone, last_login timestamp without time zone
      )
      LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
      AS $$
      BEGIN
        RETURN QUERY
        SELECT u.id, u.email::text, u.full_name::text, u.role::text,
               u.department::text, u.phone::text, u."position"::text,
               u.avatar_url::text, u.status::text, u.created_at, u.last_login
        FROM users u WHERE u.id = auth.uid();
      END;
      $$;
    `,
  },
  {
    name: "Ensure episodes storage bucket exists",
    sql: `
      INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
      VALUES ('episodes', 'episodes', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `,
  },
  {
    name: "Storage policies for episodes bucket",
    sql: `
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload episodes 1ok9tjs_0' AND tablename = 'objects') THEN
          CREATE POLICY "Authenticated users can upload episodes 1ok9tjs_0" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'episodes');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read episodes 1ok9tjs_0' AND tablename = 'objects') THEN
          CREATE POLICY "Authenticated users can read episodes 1ok9tjs_0" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'episodes');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete episodes 1ok9tjs_0' AND tablename = 'objects') THEN
          CREATE POLICY "Users can delete episodes 1ok9tjs_0" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'episodes');
        END IF;
      END $$;
    `,
  },
];

async function run() {
  await client.connect();
  console.log("Connected to staging DB\n");

  for (const fix of fixes) {
    process.stdout.write(`  ${fix.name} ... `);
    try {
      await client.query("BEGIN");
      await client.query(fix.sql);
      await client.query("COMMIT");
      console.log("OK");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.log(`FAIL: ${err.message.split("\n")[0]}`);
    }
  }

  await client.end();
  console.log("\nDone.");
}

run().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });

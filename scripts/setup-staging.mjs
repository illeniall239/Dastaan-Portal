/**
 * Applies all migration files to the staging Supabase database.
 *
 * Usage:
 *   node scripts/setup-staging.mjs <DB_PASSWORD>
 *
 * Connection goes to the staging project defined in .env.staging.
 * Reads NEXT_PUBLIC_SUPABASE_URL from .env.staging to derive the
 * host (db.<project-ref>.supabase.co) and applies every .sql file
 * in supabase/migrations/ in sorted order.
 */

import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/setup-staging.mjs <DB_PASSWORD>");
  process.exit(1);
}

// Parse project ref from .env.staging
const envContent = readFileSync(join(process.cwd(), ".env.staging"), "utf8");
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL="https:\/\/(.+?)\.supabase\.co"/);
if (!urlMatch) {
  console.error("Could not parse project ref from .env.staging");
  process.exit(1);
}
const projectRef = urlMatch[1];

// Accept optional region arg (default ap-south-1)
const region = process.argv[3] || "ap-south-1";

const client = new pg.Client({
  host: `aws-0-${region}.pooler.supabase.com`,
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
});

const migrationsDir = join(process.cwd(), "supabase", "migrations");

async function run() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files`);
  console.log(`Connecting to db.${projectRef}.supabase.co ...`);

  await client.connect();
  console.log("Connected.\n");

  let applied = 0;
  let skipped = 0;
  const errors = [];

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8").trim();
    if (!sql) {
      skipped++;
      continue;
    }

    process.stdout.write(`  ${file} ... `);
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("COMMIT");
      console.log("OK");
      applied++;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      const msg = err.message.split("\n")[0];
      if (
        msg.includes("already exists") ||
        msg.includes("duplicate key") ||
        msg.includes("does not exist")
      ) {
        console.log(`SKIP (${msg.slice(0, 80)})`);
        skipped++;
      } else {
        console.log(`FAIL (${msg.slice(0, 120)})`);
        errors.push({ file, error: msg });
      }
    }
  }

  await client.end();

  console.log(`\n--- Summary ---`);
  console.log(`  Applied: ${applied}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors:  ${errors.length}`);
  if (errors.length > 0) {
    console.log("\nFailed migrations:");
    errors.forEach((e) => console.log(`  ${e.file}: ${e.error}`));
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});

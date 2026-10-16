/**
 * Starts the dev server pointing at the staging Supabase project.
 * Reads .env.staging vars and passes them to `next dev` so they
 * override .env.local without touching it.
 *
 * Usage: node scripts/dev-staging.mjs
 */
import { readFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

const envPath = join(process.cwd(), ".env.staging");
const content = readFileSync(envPath, "utf8");

const env = { ...process.env };

for (const line of content.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=["']?(.+?)["']?$/);
  if (match) env[match[1]] = match[2];
}

console.log("Starting dev server against STAGING environment...");
console.log(`  URL: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
console.log("");

const child = spawn("npx", ["next", "dev"], {
  env,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));

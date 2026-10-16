/**
 * Seeds the staging DB with test users (one per role) and sample data.
 * Uses Supabase Admin API to create auth users, then inserts profiles.
 *
 * Usage: node scripts/seed-staging.mjs
 * Reads credentials from .env.staging
 */
import { readFileSync } from "fs";
import { join } from "path";

const envContent = readFileSync(join(process.cwd(), ".env.staging"), "utf8");
function envVal(key) {
  const m = envContent.match(new RegExp(`^${key}=["']?(.+?)["']?$`, "m"));
  return m ? m[1] : null;
}

const supabaseUrl = envVal("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = envVal("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.staging");
  process.exit(1);
}

const TEST_PASSWORD = "Test@12345";

const testUsers = [
  { email: "admin@geo.tv", name: "Test Admin", role: "admin", department: "Administration" },
  { email: "content.manager@geo.tv", name: "Test Content Manager", role: "content_manager", department: "Content" },
  { email: "content.creator@geo.tv", name: "Test Content Creator", role: "content_creator", department: "Content" },
  { email: "evaluator@geo.tv", name: "Test Evaluator", role: "evaluator", department: "Evaluation" },
  { email: "programmer@geo.tv", name: "Test Programmer", role: "programmer", department: "Programming" },
  { email: "executive@geo.tv", name: "Test Executive", role: "executive", department: "Executive" },
  { email: "gcm@geo.tv", name: "Test GCM", role: "gcm", department: "GCM" },
  { email: "management@geo.tv", name: "Test Management", role: "management", department: "Management" },
  { email: "legal@geo.tv", name: "Test Legal", role: "legal", department: "Legal" },
  { email: "finance@geo.tv", name: "Test Finance", role: "finance", department: "Finance" },
];

async function adminFetch(path, body) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function run() {
  console.log("Seeding staging with test users...");
  console.log(`  URL: ${supabaseUrl}`);
  console.log(`  Password for all: ${TEST_PASSWORD}\n`);

  for (const user of testUsers) {
    process.stdout.write(`  ${user.email} (${user.role}) ... `);
    try {
      // Create auth user via Admin API
      const { status, data } = await adminFetch("/auth/v1/admin/users", {
        email: user.email,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          department: user.department,
        },
      });

      if (status === 200 || status === 201) {
        console.log(`OK (${data.id?.slice(0, 8)}...)`);
      } else if (data?.msg?.includes("already been registered") || data?.message?.includes("already been registered")) {
        console.log("EXISTS");
      } else {
        console.log(`FAIL (${status}: ${data.msg || data.message || JSON.stringify(data).slice(0, 80)})`);
      }
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Create a test story + call report for evaluation testing
  console.log("\nSeeding test data...");
  try {
    // Get the content manager's ID
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    const listData = await listRes.json();
    const users = listData.users || [];

    const cmUser = users.find((u) => u.email === "content.manager@geo.tv");
    const evalUser = users.find((u) => u.email === "evaluator@geo.tv");

    if (cmUser) {
      // Insert a test call report via REST API
      const crRes = await fetch(`${supabaseUrl}/rest/v1/call_reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          call_report_id: `CR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          working_title: "Test Drama - Staging",
          writer_name: "Test Writer",
          logline: "A test drama for staging environment validation",
          meeting_type: "call_report",
          logged_by: cmUser.id,
          created_by: cmUser.id,
          status: "ready",
          meeting_date: new Date().toISOString(),
          meeting_attendees: ["Test Content Manager"],
          meeting_notes: "Test call report for staging environment",
          category: "writer_pitch",
        }),
      });

      if (crRes.ok) {
        const crData = await crRes.json();
        console.log(`  Call report created: ${crData[0]?.call_report_id || crData[0]?.id || "OK"}`);
      } else {
        const errText = await crRes.text();
        console.log(`  Call report: ${crRes.status} - ${errText.slice(0, 100)}`);
      }
    }

    if (evalUser) {
      // Create a team for the evaluator
      const teamRes = await fetch(`${supabaseUrl}/rest/v1/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          name: "Test Evaluator Team",
          team_type: "evaluator",
          head_id: evalUser.id,
        }),
      });

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        const teamId = teamData[0]?.id;
        console.log(`  Evaluator team created: ${teamId?.slice(0, 8) || "OK"}...`);

        // Assign evaluator to team
        if (teamId) {
          await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${evalUser.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: serviceRoleKey,
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ team_id: teamId }),
          });
        }
      } else {
        const errText = await teamRes.text();
        console.log(`  Evaluator team: ${teamRes.status} - ${errText.slice(0, 100)}`);
      }
    }
  } catch (err) {
    console.log(`  Data seeding error: ${err.message}`);
  }

  console.log(`\n--- Login credentials ---`);
  console.log(`Password: ${TEST_PASSWORD}`);
  console.log(`Emails:`);
  for (const u of testUsers) {
    console.log(`  ${u.role.padEnd(18)} → ${u.email}`);
  }
  console.log(`\nRun: npm run dev:staging`);
}

run().catch((err) => { console.error("Fatal:", err.message); process.exit(1); });

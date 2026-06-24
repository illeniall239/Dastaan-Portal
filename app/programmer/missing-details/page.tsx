import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveIdeasDetails } from "@/lib/management/active-ideas-details";
import { MissingDetailsTable } from "./missing-details-table";
import { BackButton } from "@/components/ui/back-button";

export const revalidate = 60;

export default async function ProgrammerMissingDetailsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["programmer", "evaluator", "admin", "management"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch all active ideas
  const activeIdeasDetails = await getActiveIdeasDetails();

  // Fetch teams for name mapping
  const adminClient = createAdminClient();
  const { data: teams } = await adminClient
    .from("teams")
    .select("id, name, team_head_id");

  const teamMap: Record<string, string> = {};
  for (const t of teams || []) {
    teamMap[t.id] = t.name;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 sm:p-6">
      <div className="max-w-[1600px] w-full mx-auto space-y-4 px-4 2xl:px-0">
        <div className="flex flex-col gap-4 sm:gap-6 mb-4">
          <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
        </div>
        <MissingDetailsTable ideas={activeIdeasDetails.details} teamMap={teamMap} />
      </div>
    </div>
  );
}

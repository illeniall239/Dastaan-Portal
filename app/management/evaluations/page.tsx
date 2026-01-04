import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EvaluationsDashboard } from "@/components/management/evaluations/evaluations-dashboard";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function ManagementEvaluationsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is management (admin, management, or executive)
  const { data: userData } = await supabase
    .from("users")
    .select("role, team_id, name")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "management", "executive"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch external evaluation links
  const { data: externalLinks } = await supabase
    .from("external_evaluation_links")
    .select(`
      *,
      users!external_evaluation_links_created_by_fkey(
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  // Fetch episodes for external link generation
  const { data: episodes } = await supabase
    .from("episodes")
    .select(`
      id,
      episode_number,
      call_report_id,
      call_reports!inner(
        id,
        working_title
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch one-liners for external link generation
  const { data: oneLiners } = await supabase
    .from("detailed_one_liners")
    .select(`
      id,
      call_report_id,
      call_reports!inner(
        id,
        working_title
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch call reports for external link generation
  const { data: callReports } = await supabase
    .from("call_reports")
    .select("id, working_title, call_report_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch external evaluations (submissions)
  // Limit to 500 most recent to prevent performance issues with large datasets
  const { data: rawEvaluations } = await supabase
    .from("external_evaluations")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(500);

  // Group evaluations by submission (link_id + evaluator_email)
  const evaluationsBySubmission = new Map<string, any[]>();

  (rawEvaluations || []).forEach((evaluation: any) => {
    const key = `${evaluation.link_id}_${evaluation.evaluator_email}`;
    if (!evaluationsBySubmission.has(key)) {
      evaluationsBySubmission.set(key, []);
    }
    evaluationsBySubmission.get(key)!.push(evaluation);
  });

  // Convert to array of grouped evaluations
  const groupedEvaluations = Array.from(evaluationsBySubmission.values()).map(group => ({
    // Use first evaluation for submission metadata
    id: group[0].id,
    link_id: group[0].link_id,
    evaluator_name: group[0].evaluator_name,
    evaluator_email: group[0].evaluator_email,
    submitted_at: group[0].submitted_at,
    // Add array of all evaluations in this submission
    evaluations: group,
    // Add count for display
    evaluation_count: group.length,
  }));

  const evaluations = groupedEvaluations;

  // Build content counts map
  const contentCountsMap: Record<string, { total: number; call_report: number; episode: number }> = {};

  // Count submissions per link
  (evaluations || []).forEach((evaluation: any) => {
    if (!contentCountsMap[evaluation.link_id]) {
      contentCountsMap[evaluation.link_id] = { total: 0, call_report: 0, episode: 0 };
    }
    contentCountsMap[evaluation.link_id].total++;
    if (evaluation.content_type === 'call_report') {
      contentCountsMap[evaluation.link_id].call_report++;
    } else if (evaluation.content_type === 'episode') {
      contentCountsMap[evaluation.link_id].episode++;
    }
  });

  // Fetch all teams
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("name");

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/management" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Comprehensive view of all evaluations - internal and external
          </p>
        </div>
      </div>

      <EvaluationsDashboard
        externalLinks={externalLinks || []}
        episodes={episodes || []}
        oneLiners={oneLiners || []}
        callReports={callReports || []}
        evaluations={evaluations || []}
        contentCountsMap={contentCountsMap}
        teams={teams || []}
        currentUser={userData}
      />
    </div>
  );
}

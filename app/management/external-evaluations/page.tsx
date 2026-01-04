import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ExternalEvaluationsManager } from "@/components/management/external-evaluations-manager";

export const dynamic = "force-dynamic";

export default async function ManagementExternalEvaluationsPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user is management (admin or executive)
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["admin", "management", "executive"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch all external evaluation links
  const { data: links, error: linksError } = await supabase
    .from("external_evaluation_links")
    .select(`
      *,
      users!external_evaluation_links_created_by_fkey(
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (linksError) {
    console.error("Error fetching external evaluation links:", linksError);
  }

  // Fetch all episodes (for link generation)
  const { data: episodes, error: episodesError } = await supabase
    .from("episodes")
    .select(`
      id,
      episode_number,
      title,
      story_id,
      stories!inner(
        title,
        genre,
        writer_originator_name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (episodesError) {
    console.error("Error fetching episodes:", episodesError);
  }

  // Fetch all one-liners (for link generation)
  const { data: oneLiners, error: oneLinersError } = await supabase
    .from("one_liners")
    .select(`
      id,
      one_liner_summary,
      writer_name,
      story_id,
      stories!inner(
        title,
        genre
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (oneLinersError) {
    console.error("Error fetching one-liners:", oneLinersError);
  }

  // Fetch all call reports (for link generation)
  const { data: callReports, error: callReportsError } = await supabase
    .from("call_reports")
    .select(`
      id,
      call_report_id,
      working_title,
      status
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (callReportsError) {
    console.error("Error fetching call reports:", callReportsError);
  }

  // Fetch all external evaluations
  const { data: evaluations, error: evaluationsError } = await supabase
    .from("external_evaluations")
    .select(`
      *,
      external_evaluation_links!inner(
        content_type,
        token
      )
    `)
    .order("submitted_at", { ascending: false });

  if (evaluationsError) {
    console.error("Error fetching external evaluations:", evaluationsError);
  }

  // Group evaluations by evaluator + link combination
  const submissionsMap = new Map<string, any>();
  (evaluations || []).forEach((evaluation) => {
    // Group by unique evaluator + link combination
    const key = `${evaluation.evaluator_email || 'anonymous'}-${evaluation.link_id}`;

    if (!submissionsMap.has(key)) {
      submissionsMap.set(key, {
        id: key, // Unique ID for submission
        link_id: evaluation.link_id,
        evaluator_name: evaluation.evaluator_name,
        evaluator_email: evaluation.evaluator_email,
        evaluator_organization: evaluation.evaluator_organization,
        submitted_at: evaluation.submitted_at, // Use first evaluation's timestamp
        token: evaluation.external_evaluation_links?.token,
        evaluation_count: 0,
        evaluations: []
      });
    }

    const submission = submissionsMap.get(key)!;
    submission.evaluations.push(evaluation);
    submission.evaluation_count = submission.evaluations.length;

    // Keep the earliest submission time
    if (new Date(evaluation.submitted_at) < new Date(submission.submitted_at)) {
      submission.submitted_at = evaluation.submitted_at;
    }
  });

  const groupedSubmissions = Array.from(submissionsMap.values());

  // Fetch content counts for each link from junction table
  const { data: linkContents, error: linkContentsError } = await supabase
    .from("external_link_contents")
    .select("link_id, content_type, content_id");

  if (linkContentsError) {
    console.error("Error fetching link contents:", linkContentsError);
  }

  // Create a map of link_id to content count
  const contentCountsMap: Record<string, { total: number; call_report: number; episode: number }> = {};
  if (linkContents) {
    linkContents.forEach((item) => {
      if (!contentCountsMap[item.link_id]) {
        contentCountsMap[item.link_id] = { total: 0, call_report: 0, episode: 0 };
      }
      contentCountsMap[item.link_id].total++;
      if (item.content_type === "call_report") {
        contentCountsMap[item.link_id].call_report++;
      } else if (item.content_type === "episode") {
        contentCountsMap[item.link_id].episode++;
      }
    });
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        <h1 className="text-xl sm:text-2xl font-bold">External Evaluations</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Generate shareable links and manage external evaluator submissions
        </p>
      </div>

      <ExternalEvaluationsManager
        links={links || []}
        episodes={episodes || []}
        oneLiners={oneLiners || []}
        callReports={callReports || []}
        evaluations={groupedSubmissions}
        contentCountsMap={contentCountsMap}
      />
    </div>
  );
}

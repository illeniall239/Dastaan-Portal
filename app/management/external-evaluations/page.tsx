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
        evaluations={evaluations || []}
      />
    </div>
  );
}

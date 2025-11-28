import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function NewContentDepartmentNegotiationPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user data including team_id for team isolation
  const { data: userData } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_manager", "content_creator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  const hasGlobalAccess = userData.role && ['admin', 'management'].includes(userData.role);

  // Fetch approved stories that don't have contract terms yet, with team filtering
  let storiesQuery = supabase
    .from("stories")
    .select(`
      id,
      story_id,
      title,
      writer_originator_name,
      genre,
      status,
      team_id,
      negotiations!left(id)
    `)
    .eq("status", "approved")
    .is("negotiations.id", null)
    .order("created_at", { ascending: false });

  // TEAM ISOLATION: Filter stories by team
  if (!hasGlobalAccess && userData.team_id) {
    storiesQuery = storiesQuery.eq("team_id", userData.team_id);
  }

  const { data: stories, error } = await storiesQuery;

  if (error) {
    console.error("Error fetching approved stories:", error);
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        <BackButton fallbackHref="/content-department/contract-terms" className="mb-4" />
        <h1 className="text-xl sm:text-2xl font-bold">Create New Contract Term</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Start a new negotiation for an approved project
        </p>
      </div>

      <ContractTermForm
        stories={stories || []}
        redirectPath="/content-department/contract-terms"
      />
    </div>
  );
}

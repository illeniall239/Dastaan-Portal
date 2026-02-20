import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";
import { BackButton } from "@/components/ui/back-button";
import type { ProjectForContractTerm } from "@/lib/contract-terms/client";

export const dynamic = "force-dynamic";

export default async function EditContentDepartmentNegotiationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
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

  // Fetch contract term with team verification
  let contractTermQuery = supabase
    .from("negotiations")
    .select(
      `
      *,
      stories!inner(
        story_id,
        title,
        writer_originator_name,
        genre,
        team_id
      )
    `
    )
    .eq("id", resolvedParams.id);

  // TEAM ISOLATION: Verify user can access this contract term
  if (!hasGlobalAccess && userData.team_id) {
    contractTermQuery = contractTermQuery.eq("stories.team_id", userData.team_id);
  }

  const { data: contractTerm, error: contractTermError } = await contractTermQuery.single();

  // If no data returned, user doesn't have access to this contract term
  if (contractTermError || !contractTerm) {
    console.error("Error fetching contract term:", contractTermError);
    redirect("/content-department/contract-terms");
  }

  // Fetch approved stories with team filtering (needed for the form, even though selection is disabled in edit mode)
  let storiesQuery = supabase
    .from("stories")
    .select("id, story_id, title, writer_originator_name, genre, status, team_id")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // TEAM ISOLATION: Filter stories by team
  if (!hasGlobalAccess && userData.team_id) {
    storiesQuery = storiesQuery.eq("team_id", userData.team_id);
  }

  const { data: stories, error: storiesError } = await storiesQuery;

  if (storiesError) {
    console.error("Error fetching approved stories:", storiesError);
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref={`/content-department/contract-terms/${resolvedParams.id}`} variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Contract Terms</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update contract terms and negotiation details
          </p>
        </div>
      </div>

      <ContractTermForm
        stories={(stories || []).map((s): ProjectForContractTerm => ({
          id: s.id,
          display_id: s.story_id,
          title: s.title,
          writer_name: s.writer_originator_name,
          genre: s.genre,
          item_type: "story",
        }))}
        redirectPath="/content-department/contract-terms"
        mode="edit"
        initialData={contractTerm}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContractTermDetails } from "@/components/contract-terms/contract-term-details";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function ContentDepartmentContractTermDetailsPage({
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

  if (
    !userData ||
    !["content_manager", "content_creator", "admin"].includes(userData.role)
  ) {
    redirect("/dashboard");
  }

  const hasGlobalAccess = userData.role && ['admin', 'management'].includes(userData.role);

  // Fetch contract term with team verification
  let query = supabase
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
    query = query.eq("stories.team_id", userData.team_id);
  }

  const { data: contractTerm, error } = await query.single();

  // If no data returned, user doesn't have access to this contract term
  if (error || !contractTerm) {
    console.error("Error fetching contract term:", error);
    redirect("/content-department/contract-terms");
  }

  // Only content_manager can edit
  const canEdit = userData.role === "content_manager" || userData.role === "admin";

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/content-department/contract-terms" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Contract Terms</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage project contract terms and term sheets
          </p>
        </div>
      </div>
      <ContractTermDetails
        contractTerm={contractTerm}
        basePath="/content-department/contract-terms"
        canEdit={canEdit}
      />
    </div>
  );
}

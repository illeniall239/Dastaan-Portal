import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContractTermList } from "@/components/contract-terms/contract-term-list";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function ContentDepartmentContractTermsPage() {
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

  // Fetch contract terms with team verification
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
    .order("created_at", { ascending: false });

  // TEAM ISOLATION: Filter through stories.team_id
  if (!hasGlobalAccess && userData.team_id) {
    query = query.eq("stories.team_id", userData.team_id);
  }

  const { data: contractTerms, error } = await query;

  if (error) {
    console.error("Error fetching contract terms:", error);
  }

  // Content department users can create contract terms
  const canCreate = userData.role === "content_manager" || userData.role === "content_creator" || userData.role === "admin";

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/content-department" variant="outline" size="sm" className="w-fit" />
          {canCreate && (
            <Button asChild className="touch-target">
              <Link href="/content-department/contract terms/new">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Negotiation</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Contract Terms</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage project contract terms and term sheets
          </p>
        </div>
      </div>

      <ContractTermList
        contractTerms={contractTerms || []}
        basePath="/content-department/contract-terms"
      />
    </div>
  );
}

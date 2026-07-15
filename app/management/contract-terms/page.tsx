import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ContractTermList } from "@/components/contract-terms/contract-term-list";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function ManagementContractTermsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["management", "management_viewer", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  const adminClient = createAdminClient();

  const { data: contractTerms } = await adminClient
    .from("negotiations")
    .select(
      `
      *,
      stories!left(
        story_id,
        title,
        writer_originator_name,
        genre
      ),
      call_reports!left(
        call_report_id,
        working_title
      )
    `
    )
    .order("created_at", { ascending: false });

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        <BackButton fallbackHref="/management" className="mb-4" />
        <h1 className="text-xl sm:text-2xl font-bold">Contract Terms</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          All contract term negotiations across the organisation
        </p>
      </div>

      <ContractTermList
        contractTerms={contractTerms || []}
        basePath="/management/contract-terms"
      />
    </div>
  );
}

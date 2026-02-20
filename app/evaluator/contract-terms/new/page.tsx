import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";
import { BackButton } from "@/components/ui/back-button";
import type { ProjectForContractTerm } from "@/lib/contract-terms/client";
import { getApprovedCallReportIds } from "@/lib/contract-terms/approved-call-reports";

export const dynamic = "force-dynamic";

export default async function NewEvaluatorNegotiationPage() {
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

  if (!userData || !["evaluator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  const adminClient = createAdminClient();

  // Fetch approved stories without contract terms
  const { data: stories } = await supabase
    .from("stories")
    .select(`id, story_id, title, writer_originator_name, genre, status, negotiations!left(id)`)
    .eq("status", "approved")
    .is("negotiations.id", null)
    .order("created_at", { ascending: false });

  // Compute approved call_report_ids directly from story_approvals + evaluator_forms
  const approvedCrIds = await getApprovedCallReportIds(adminClient);

  let callReportProjects: ProjectForContractTerm[] = [];
  if (approvedCrIds.length > 0) {
    // Exclude call_reports that already have a negotiation
    const { data: existingNegs } = await adminClient
      .from("negotiations")
      .select("call_report_id")
      .in("call_report_id", approvedCrIds);

    const negotiatedIds = new Set((existingNegs || []).map((n) => n.call_report_id).filter(Boolean));
    const eligibleIds = approvedCrIds.filter((id) => !negotiatedIds.has(id));

    if (eligibleIds.length > 0) {
      const { data: crs } = await adminClient
        .from("call_reports")
        .select("id, call_report_id, working_title, genre, call_report_writers(writer_name, display_order)")
        .in("id", eligibleIds)
        .order("created_at", { ascending: false });

      callReportProjects = (crs || []).map((cr) => ({
        id: cr.id,
        display_id: cr.call_report_id,
        title: cr.working_title || "(Untitled)",
        writer_name: ((cr.call_report_writers || []) as any[])
          .sort((a, b) => a.display_order - b.display_order)
          .map((w) => w.writer_name)
          .join(", ") || "N/A",
        genre: Array.isArray(cr.genre) ? cr.genre.join(", ") : (cr.genre || null),
        item_type: "call_report" as const,
      }));
    }
  }

  const storyProjects: ProjectForContractTerm[] = (stories || []).map((s) => ({
    id: s.id,
    display_id: s.story_id,
    title: s.title,
    writer_name: s.writer_originator_name,
    genre: s.genre,
    item_type: "story" as const,
  }));

  const allProjects = [...storyProjects, ...callReportProjects];

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        <BackButton fallbackHref="/evaluator/contract-terms" className="mb-4" />
        <h1 className="text-xl sm:text-2xl font-bold">Create New Contract Term</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Start a new negotiation for an approved project
        </p>
      </div>

      <ContractTermForm
        stories={allProjects}
        redirectPath="/evaluator/contract-terms"
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";
import { BackButton } from "@/components/ui/back-button";
import type { ProjectForContractTerm } from "@/lib/contract-terms/client";

export const dynamic = "force-dynamic";

export default async function NewContentDepartmentNegotiationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_manager", "content_creator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  const hasGlobalAccess = userData.role && ["admin", "management"].includes(userData.role);

  // Fetch approved stories without contract terms, joining linked call report for writers/genre
  let storiesQuery = supabase
    .from("stories")
    .select(`
      id, story_id, title, writer_originator_name, genre, status, team_id,
      negotiations!left(id),
      call_reports!story_id(
        call_report_id, logline, genre, content_type, target_slot,
        call_report_writers(display_order, writer:writers(name))
      )
    `)
    .eq("status", "approved")
    .is("negotiations.id", null)
    .order("created_at", { ascending: false });

  if (!hasGlobalAccess && userData.team_id) {
    storiesQuery = storiesQuery.eq("team_id", userData.team_id);
  }

  const { data: stories } = await storiesQuery;

  const allProjects: ProjectForContractTerm[] = (stories || []).map((s) => {
    const crs = (s as any).call_reports || [];
    const cr = crs[0] || null;

    const writers: string[] = cr
      ? ((cr.call_report_writers || []) as any[])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((w: any) => {
            const wr = w.writer;
            return Array.isArray(wr) ? wr[0]?.name : wr?.name;
          })
          .filter(Boolean)
      : s.writer_originator_name ? [s.writer_originator_name] : [];

    const genres: string[] = cr?.genre
      ? (Array.isArray(cr.genre) ? cr.genre : [cr.genre]).filter(Boolean)
      : s.genre ? [s.genre] : [];

    return {
      id: s.id,
      display_id: s.story_id,
      title: s.title,
      writer_name: writers.join(", ") || s.writer_originator_name || "",
      genre: s.genre,
      item_type: "story" as const,
      writers,
      genres,
      logline: cr?.logline || null,
      content_type: cr?.content_type || null,
      target_slot: cr?.target_slot || null,
      call_report_display_id: cr?.call_report_id || null,
    };
  });

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
        stories={allProjects}
        redirectPath="/content-department/contract-terms"
      />
    </div>
  );
}

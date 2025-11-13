import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function NewEvaluatorNegotiationPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["evaluator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch approved stories that don't have contract terms yet
  const { data: stories, error } = await supabase
    .from("stories")
    .select(`
      id,
      story_id,
      title,
      writer_originator_name,
      genre,
      status,
      negotiations!left(id)
    `)
    .eq("status", "approved")
    .is("negotiations.id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching approved stories:", error);
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        <BackButton fallbackHref="/evaluator/contract-terms" className="mb-4" />
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Contract Term</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Start a new negotiation for an approved project
        </p>
      </div>

      <ContractTermForm
        stories={stories || []}
        redirectPath="/evaluator/contract-terms"
      />
    </div>
  );
}

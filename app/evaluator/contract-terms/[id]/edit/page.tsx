import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function EditEvaluatorNegotiationPage({
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

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["evaluator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch contract term
  const { data: contractTerm, error: contractTermError } = await supabase
    .from("negotiations")
    .select(
      `
      *,
      stories!inner(
        story_id,
        title,
        writer_originator_name,
        genre
      )
    `
    )
    .eq("id", resolvedParams.id)
    .single();

  if (contractTermError || !contractTerm) {
    console.error("Error fetching contract term:", contractTermError);
    notFound();
  }

  // Fetch approved stories (needed for the form, even though selection is disabled in edit mode)
  const { data: stories, error: storiesError } = await supabase
    .from("stories")
    .select("id, story_id, title, writer_originator_name, genre, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (storiesError) {
    console.error("Error fetching approved stories:", storiesError);
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator/contract-terms" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Contract Term</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update contract term details for {(contractTerm as any).stories?.title || "this project"}
          </p>
        </div>
      </div>

      <ContractTermForm
        stories={stories || []}
        redirectPath="/evaluator/contract-terms"
        mode="edit"
        initialData={contractTerm}
      />
    </div>
  );
}

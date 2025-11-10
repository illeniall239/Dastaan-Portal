import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContractTermForm } from "@/components/contract-terms/contract-term-form";

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

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_manager", "content_creator", "admin"].includes(userData.role)) {
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
      <div className="mobile-header-spacing">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Contract Term</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Update contract term details for {(contractTerm as any).stories?.title || "this project"}
        </p>
      </div>

      <ContractTermForm
        stories={stories || []}
        redirectPath="/content-department/contract-terms"
        mode="edit"
        initialData={contractTerm}
      />
    </div>
  );
}

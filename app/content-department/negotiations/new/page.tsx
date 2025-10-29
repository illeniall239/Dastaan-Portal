import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NegotiationForm } from "@/components/negotiations/negotiation-form";

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

  // Get user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!userData || !["content_manager", "content_creator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch approved stories
  const { data: stories, error } = await supabase
    .from("stories")
    .select("id, story_id, title, writer_originator_name, genre, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching approved stories:", error);
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="mobile-header-spacing">
        <h1 className="text-2xl sm:text-3xl font-bold">Create New Negotiation</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Start a new negotiation for an approved project
        </p>
      </div>

      <NegotiationForm
        stories={stories || []}
        redirectPath="/content-department/negotiations"
      />
    </div>
  );
}

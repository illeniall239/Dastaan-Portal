import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { NegotiationDetails } from "@/components/negotiations/negotiation-details";

export const dynamic = "force-dynamic";

export default async function ContentDepartmentNegotiationDetailsPage({
  params,
}: {
  params: { id: string };
}) {
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

  if (
    !userData ||
    !["content_manager", "content_creator", "admin"].includes(userData.role)
  ) {
    redirect("/dashboard");
  }

  // Fetch negotiation
  const { data: negotiation, error } = await supabase
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
    .eq("id", params.id)
    .single();

  if (error || !negotiation) {
    console.error("Error fetching negotiation:", error);
    notFound();
  }

  // Only content_manager can edit
  const canEdit = userData.role === "content_manager" || userData.role === "admin";

  return (
    <div className="container mx-auto py-8 px-4">
      <NegotiationDetails
        negotiation={negotiation}
        basePath="/content-department/negotiations"
        canEdit={canEdit}
      />
    </div>
  );
}

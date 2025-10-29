import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { NegotiationDetails } from "@/components/negotiations/negotiation-details";

export const dynamic = "force-dynamic";

export default async function EvaluatorNegotiationDetailsPage({
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

  if (!userData || !["evaluator", "admin"].includes(userData.role)) {
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

  return (
    <div className="container mx-auto py-8 px-4">
      <NegotiationDetails
        negotiation={negotiation}
        basePath="/evaluator/negotiations"
        canEdit={true}
      />
    </div>
  );
}

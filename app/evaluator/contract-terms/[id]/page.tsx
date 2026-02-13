import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContractTermDetails } from "@/components/contract-terms/contract-term-details";
import { getAttachmentsForEntityServer } from "@/lib/attachments/server";

export const dynamic = "force-dynamic";

export default async function EvaluatorContractTermDetailsPage({
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
  const { data: contractTerm, error } = await supabase
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

  if (error || !contractTerm) {
    console.error("Error fetching contract term:", error);
    notFound();
  }

  // Fetch attachments
  let attachments: any[] = [];
  try {
    attachments = await getAttachmentsForEntityServer("negotiation", resolvedParams.id);
  } catch (error) {
    console.error("Error fetching attachments:", error);
  }

  return (
    <div className="mobile-container mobile-section">
      <ContractTermDetails
        contractTerm={contractTerm}
        basePath="/evaluator/contract-terms"
        canEdit={true}
        attachments={attachments}
      />
    </div>
  );
}

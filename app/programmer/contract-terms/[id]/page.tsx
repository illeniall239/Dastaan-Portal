import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ContractTermDetails } from "@/components/contract-terms/contract-term-details";

export const dynamic = "force-dynamic";

export default async function ProgrammerContractTermDetailsPage({
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

    if (!userData || !["programmer", "evaluator", "admin", "management"].includes(userData.role)) {
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

    return (
        <div className="mobile-container mobile-section">
            <ContractTermDetails
                contractTerm={contractTerm}
                basePath="/programmer/contract-terms"
                canEdit={true}
            />
        </div>
    );
}

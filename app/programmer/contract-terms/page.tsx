import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ContractTermList } from "@/components/contract-terms/contract-term-list";
import { BackButton } from "@/components/ui/back-button";

export const dynamic = "force-dynamic";

export default async function ProgrammerContractTermsPage() {
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

    // Fetch contract terms
    const { data: contractTerms, error } = await supabase
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
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching contract terms:", error);
    }

    return (
        <div className="mobile-container mobile-section">
            <div className="flex flex-col gap-4 sm:gap-6 mb-8">
                <div className="flex items-center justify-between">
                    <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
                    <Button asChild>
                        <Link href="/programmer/contract-terms/new">
                            <Plus className="h-4 w-4 mr-2" />
                            New Contract Term
                        </Link>
                    </Button>
                </div>
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Contract Terms</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Manage project contract terms and term sheets
                    </p>
                </div>
            </div>

            <ContractTermList
                contractTerms={contractTerms || []}
                basePath="/programmer/contract-terms"
            />
        </div>
    );
}

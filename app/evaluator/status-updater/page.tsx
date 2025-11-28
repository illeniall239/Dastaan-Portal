import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusUpdaterTable } from "@/components/status-updater/status-updater-table";
import { getActiveIdeasDetails } from "@/lib/management/active-ideas-details";
import { BackButton } from "@/components/ui/back-button";

export const revalidate = 60; // Revalidate every minute

export default async function StatusUpdaterPage() {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user data and check role
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData) redirect("/login");

  // Check if user has access (evaluator role)
  if (!["evaluator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch all ideas/call reports with details
  const activeIdeasDetails = await getActiveIdeasDetails();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" />
        <StatusUpdaterTable ideas={activeIdeasDetails.details} />
      </div>
    </div>
  );
}

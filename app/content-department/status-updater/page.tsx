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

  // Get user data including team_id for team isolation
  const { data: userData } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  if (!userData) redirect("/login");

  // Check if user has access (content_manager or evaluator)
  if (!["content_manager", "evaluator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  // Fetch all ideas/call reports with details, passing team context
  const activeIdeasDetails = await getActiveIdeasDetails(
    undefined,         // genre (no filter)
    userData.team_id,  // team_id for isolation
    userData.role      // user_role for global access check
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 sm:p-6">
      <div className="max-w-[1600px] w-full mx-auto space-y-4 px-4 2xl:px-0">
        <div className="flex flex-col gap-4 sm:gap-6 mb-8">
          <BackButton fallbackHref="/content-department" variant="outline" size="sm" className="w-fit" />
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Status Updater</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Update the status of Writer Engagement Reports in bulk
            </p>
          </div>
        </div>
        <StatusUpdaterTable ideas={activeIdeasDetails.details} />
      </div>
    </div>
  );
}

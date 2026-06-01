import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusUpdaterTable } from "@/components/status-updater/status-updater-table";
import { getActiveIdeasDetails } from "@/lib/management/active-ideas-details";
import { BackButton } from "@/components/ui/back-button";

export const revalidate = 60;

export default async function GcmStatusUpdaterPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userData) redirect("/login");

  if (!["gcm", "evaluator", "admin"].includes(userData.role)) {
    redirect("/dashboard");
  }

  const activeIdeasDetails = await getActiveIdeasDetails(
    undefined,
    userData.team_id,
    userData.role
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-4 sm:p-6">
      <div className="max-w-[1600px] w-full mx-auto space-y-4 px-4 2xl:px-0">
        <div className="mb-8">
          <BackButton fallbackHref="/gcm" variant="outline" size="sm" className="w-fit" />
        </div>
        <StatusUpdaterTable ideas={activeIdeasDetails.details} role="evaluator" />
      </div>
    </div>
  );
}

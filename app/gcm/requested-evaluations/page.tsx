import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { RequestedEvaluationsView } from "@/components/cross-team-shares/requested-evaluations-view";

export default async function GcmRequestedEvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "gcm") redirect("/dashboard");

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/gcm" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cross-Team Shares Tracking</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View results for cross-team shares your team has sent.
          </p>
        </div>
      </div>
      <RequestedEvaluationsView />
    </div>
  );
}

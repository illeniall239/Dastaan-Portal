import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { IncomingEvaluationRequests } from "@/components/cross-team-shares/incoming-evaluation-requests";

export default async function EvaluatorIncomingEvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "evaluator") redirect("/dashboard");

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Incoming Evaluations</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Evaluate one-liners and episodes that other teams have shared with your team.
          </p>
        </div>
      </div>
      <IncomingEvaluationRequests portalPrefix="evaluator" showEpisodeEvaluate={true} />
    </div>
  );
}

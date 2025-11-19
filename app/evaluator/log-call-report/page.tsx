import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CallReportForm } from "./call-report-form";
import { BackButton } from "@/components/ui/back-button";

export default async function LogCallReportPage() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated (handled by layout, but keeping for safety)
  if (!user) {
    redirect("/login");
  }

  // Allow only evaluators to access this page
  if (user.role !== "evaluator") {
    redirect("/evaluator");
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="flex items-center gap-4 mb-6">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" />
      </div>

      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Log Writer Engagement Report</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Document your meeting with a writer or producer
        </p>
      </div>

      <CallReportForm userId={user.id} userName={user.name || "Unknown"} userPosition={user.position} />
    </div>
  );
}

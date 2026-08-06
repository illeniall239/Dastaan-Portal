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

  // Allow only programmers to access this page
  if (user.role !== "programmer") {
    redirect("/programmer");
  }

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/programmer" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Log One-Liner Report</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Document your meeting with a writer or producer
          </p>
        </div>
      </div>

      <CallReportForm userId={user.id} userName={user.name || "Unknown"} userPosition={user.position} />
    </div>
  );
}

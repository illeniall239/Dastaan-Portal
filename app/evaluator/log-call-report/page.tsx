import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CallReportForm } from "./call-report-form";

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

  // Mock data for writers
  const writers = [
    { id: "1", name: "Ahmed Khan", email: "ahmed@example.com" },
    { id: "2", name: "Fatima Ali", email: "fatima@example.com" },
    { id: "3", name: "Omar Siddiqui", email: "omar@example.com" },
    { id: "4", name: "Zainab Raza", email: "zainab@example.com" },
  ];

  return (
    <div className="mobile-container mobile-section">
      <div className="mb-4 sm:mb-6 text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Log Writer Engagement Report</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Document your meeting with a writer or producer
        </p>
      </div>

      <CallReportForm writers={writers} userId={user.id} userName={user.name || "Unknown"} userPosition={user.position} />
    </div>
  );
}

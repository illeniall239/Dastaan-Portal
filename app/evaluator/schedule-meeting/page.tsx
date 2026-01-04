import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ClientScheduleMeetingForm } from "./client-form";
import { BackButton } from "@/components/ui/back-button";
import { CalendarPlus } from "lucide-react";

export default async function ScheduleMeetingPage() {
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
    <div className="mobile-container mobile-section max-w-4xl mx-auto">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Schedule Meeting</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Schedule a new meeting with writers or team members
          </p>
        </div>
      </div>

      <ClientScheduleMeetingForm userId={user.id} />
    </div>
  );
}

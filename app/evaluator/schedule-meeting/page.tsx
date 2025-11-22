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
      <div className="flex items-center gap-4 mb-6">
        <BackButton fallbackHref="/evaluator" variant="outline" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#224794] flex items-center justify-center">
            <CalendarPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Schedule Meeting</h1>
            <p className="text-sm text-slate-500">Schedule a new meeting with writers or team members</p>
          </div>
        </div>
      </div>

      <ClientScheduleMeetingForm userId={user.id} />
    </div>
  );
}

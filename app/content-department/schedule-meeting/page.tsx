import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, ClockIcon, UserIcon } from "lucide-react";
import { ClientScheduleMeetingForm } from "./client-form";

export default async function ScheduleMeetingPage() {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated (handled by layout, but keeping for safety)
  if (!user) {
    redirect("/login");
  }

  // Allow content department users to access this page
  if (user.role !== "content_creator") {
    redirect("/content-department");
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
      <div className="mobile-header-spacing">
        <h1 className="text-2xl sm:text-3xl font-bold">Schedule New Meeting</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Set up a meeting with a writer
        </p>
      </div>

      <ClientScheduleMeetingForm writers={writers} userId={user.id} />
    </div>
  );
}
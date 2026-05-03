import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsPageClient } from "@/components/shared/notifications-page-client";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="mobile-container mobile-section max-w-3xl mx-auto">
      <NotificationsPageClient />
    </div>
  );
}

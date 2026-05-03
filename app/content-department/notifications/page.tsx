import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsPageClient } from "@/components/shared/notifications-page-client";

export const dynamic = "force-dynamic";

export default async function ContentDeptNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "content_creator" && user.role !== "content_manager") redirect("/dashboard");

  return (
    <div className="mobile-container mobile-section max-w-3xl mx-auto">
      <NotificationsPageClient />
    </div>
  );
}

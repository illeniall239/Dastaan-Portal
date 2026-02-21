import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginActivityList } from "@/components/admin/login-activity-list";

export const dynamic = "force-dynamic";

export default async function LoginActivityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return <LoginActivityList />;
}

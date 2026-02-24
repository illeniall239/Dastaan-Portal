import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PendingEvaluationsList } from "@/components/management/pending-evaluations-list";

export default async function PendingEvaluationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!["management", "admin", "executive"].includes(user.role)) {
    redirect("/dashboard");
  }

  return <PendingEvaluationsList userRole={user.role} userId={user.id} />;
}

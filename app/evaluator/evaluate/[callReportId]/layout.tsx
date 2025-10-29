import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EvaluatorEvaluateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect if user is not authenticated
  if (!user) {
    redirect("/login");
  }

  // Only allow evaluators
  if (user.role !== "evaluator") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EvaluatorEvaluationsPage() {
  // Redirect to the new evaluations page structure
  redirect("/evaluator/evaluations-list");
}
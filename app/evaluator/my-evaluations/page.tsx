import { redirect } from "next/navigation";

export default async function EvaluatorMyEvaluationsPage() {
  // Redirect to the consolidated evaluations list page with completed view
  redirect("/evaluator/evaluations-list?view=completed");
}
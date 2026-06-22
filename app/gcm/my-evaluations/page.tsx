import { redirect } from "next/navigation";

export default async function GcmMyEvaluationsPage() {
  // Redirect to the consolidated evaluations list page with completed view
  redirect("/gcm/evaluations-list?view=completed");
}
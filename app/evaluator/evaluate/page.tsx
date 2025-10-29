import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function EvaluatorRootEvaluatePage() {
  // Redirect to the evaluator's main evaluations page
  redirect("/evaluator/evaluations");
}
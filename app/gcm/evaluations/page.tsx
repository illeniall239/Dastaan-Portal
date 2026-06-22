import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function GcmEvaluationsPage() {
  // Redirect to the new evaluations page structure
  redirect("/gcm/evaluations-list");
}
import { redirect } from "next/navigation";

export default function ManagementEvaluationsListRedirect() {
  redirect("/management/pending-evaluations");
}

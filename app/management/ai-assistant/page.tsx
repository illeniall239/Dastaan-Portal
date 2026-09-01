import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ManagementAIAssistantClient } from "./client";

export default async function ManagementAIAssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "management_viewer") redirect("/management");

  return <ManagementAIAssistantClient role={user.role} />;
}

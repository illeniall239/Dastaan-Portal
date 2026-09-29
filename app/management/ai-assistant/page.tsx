import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ManagementAIAssistantClient } from "./client";

export default async function ManagementAIAssistantPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <ManagementAIAssistantClient role={user.role} />;
}

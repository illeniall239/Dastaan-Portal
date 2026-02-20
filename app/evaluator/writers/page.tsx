import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WriterEngagementTracker } from "@/components/writers/writer-engagement-tracker";

export default async function EvaluatorWriterEngagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: writers } = await supabase
    .from("writers")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <WriterEngagementTracker
      userId={user.id}
      initialWriters={writers || []}
    />
  );
}

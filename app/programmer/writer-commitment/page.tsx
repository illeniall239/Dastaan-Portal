import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WriterCommitmentTracker } from "@/components/writers/writer-commitment-tracker";

export default async function WriterCommitmentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: callReports } = await supabase
    .from("call_reports")
    .select(`
      id,
      working_title,
      call_report_id,
      call_report_writers(
        writer_id,
        writer:writers!writer_id(id, name)
      )
    `)
    .order("working_title");

  return (
    <WriterCommitmentTracker
      userId={user.id}
      initialCallReports={callReports || []}
    />
  );
}

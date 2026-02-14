import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWriterEngagements } from "@/lib/writers/server";
import { WriterEngagementTracker } from "@/components/writers/writer-engagement-tracker";
import { startOfMonth, endOfMonth, format } from "date-fns";

export default async function EvaluatorWriterEngagementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const dateFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const dateTo = format(endOfMonth(now), "yyyy-MM-dd");
  const { engagements, writers } = await getWriterEngagements(dateFrom, dateTo);

  return (
    <WriterEngagementTracker
      userId={user.id}
      initialEngagements={engagements}
      initialWriters={writers}
    />
  );
}

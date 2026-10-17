import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllCallReports } from "@/lib/meetings/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { OneLinersClient } from "@/components/call-reports/one-liners-client";

export const dynamic = "force-dynamic";

export default async function EvaluatorOneLinersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <OneLinersContent userId={user.id} teamId={user.team_id ?? null} />
    </Suspense>
  );
}

async function OneLinersContent({ userId, teamId }: { userId: string; teamId: string | null }) {
  const [callReports, isTeamHead] = await Promise.all([
    getAllCallReports(),
    (async () => {
      if (!teamId) return false;
      const adminClient = createAdminClient();
      const { data: team } = await adminClient
        .from("teams")
        .select("team_head_id")
        .eq("id", teamId)
        .single();
      return team?.team_head_id === userId;
    })(),
  ]);

  return (
    <OneLinersClient
      initialReports={callReports}
      isTeamHead={isTeamHead}
      currentTeamId={teamId ?? undefined}
      portalPrefix="evaluator"
      backHref="/evaluator"
      logHref="/evaluator/log-call-report"
    />
  );
}

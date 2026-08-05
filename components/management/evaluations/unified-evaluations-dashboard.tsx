"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompactStatsStrip } from "./compact-stats-strip";
import { ExternalEvaluationsTab } from "./external-evaluations-tab";
import { InternalEvaluationsTab } from "./internal-evaluations-tab";
import { PendingApprovalsUnified } from "@/components/management/pending-approvals-unified";

interface UnifiedEvaluationsDashboardProps {
  externalLinks: any[];
  episodes: any[];
  oneLiners: any[];
  callReports: any[];
  evaluations: any[];
  contentCountsMap: Record<string, { total: number; call_report: number; episode: number }>;
  teams: any[];
  currentUser: any;
  userId: string;
  userRole: string;
}

export function UnifiedEvaluationsDashboard({
  externalLinks,
  episodes,
  oneLiners,
  callReports,
  evaluations,
  contentCountsMap,
  teams,
  currentUser,
  userId,
  userRole,
}: UnifiedEvaluationsDashboardProps) {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="space-y-4">
      <CompactStatsStrip teams={teams} externalEvaluations={evaluations} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Evaluations</TabsTrigger>
          <TabsTrigger value="internal">Internal Evaluations</TabsTrigger>
          <TabsTrigger value="external">External Evaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <PendingApprovalsUnified userId={userId} userRole={userRole} />
        </TabsContent>

        <TabsContent value="internal" className="mt-4">
          <InternalEvaluationsTab currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="external" className="mt-4">
          <ExternalEvaluationsTab
            links={externalLinks}
            episodes={episodes}
            oneLiners={oneLiners}
            callReports={callReports}
            evaluations={evaluations}
            contentCountsMap={contentCountsMap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompactStatsStrip } from "./compact-stats-strip";
import { ExternalEvaluationsTab } from "./external-evaluations-tab";
import { InternalEvaluationsTab } from "./internal-evaluations-tab";
import { BiasPageClient } from "@/components/management/evaluator-bias/bias-page-client";
import { PendingEvaluationsList } from "@/components/management/pending-evaluations-list";
import { PendingEpisodeApprovalsList } from "@/components/management/pending-episode-approvals-list";

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
  const [pendingSubTab, setPendingSubTab] = useState<"oneliners" | "episodes">("oneliners");

  const activeSubStyle = "bg-[#224794] text-white border-[#224794]";
  const inactiveSubStyle = "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300";

  return (
    <div className="space-y-4">
      <CompactStatsStrip teams={teams} externalEvaluations={evaluations} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="by-story">By Story</TabsTrigger>
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="external">External</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {/* Sub-tab toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setPendingSubTab("oneliners")}
              className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                pendingSubTab === "oneliners" ? activeSubStyle : inactiveSubStyle
              }`}
            >
              One-Liners
            </button>
            <button
              onClick={() => setPendingSubTab("episodes")}
              className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                pendingSubTab === "episodes" ? activeSubStyle : inactiveSubStyle
              }`}
            >
              Episodes
            </button>
          </div>

          {pendingSubTab === "oneliners" ? (
            <PendingEvaluationsList userRole={userRole} userId={userId} embedded />
          ) : (
            <PendingEpisodeApprovalsList userId={userId} userRole={userRole} embedded />
          )}
        </TabsContent>

        <TabsContent value="by-story" className="mt-4">
          <BiasPageClient />
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

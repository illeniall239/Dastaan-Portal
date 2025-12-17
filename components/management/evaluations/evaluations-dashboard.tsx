"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ExternalEvaluationsTab } from "./external-evaluations-tab";
import { InternalEvaluationsTab } from "./internal-evaluations-tab";
import { OverviewTab } from "./overview-tab";

interface EvaluationsDashboardProps {
  externalLinks: any[];
  episodes: any[];
  oneLiners: any[];
  callReports: any[];
  evaluations: any[];
  contentCountsMap: Record<string, { total: number; call_report: number; episode: number }>;
  teams: any[];
  currentUser: any;
}

export function EvaluationsDashboard({
  externalLinks,
  episodes,
  oneLiners,
  callReports,
  evaluations,
  contentCountsMap,
  teams,
  currentUser,
}: EvaluationsDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="internal">Internal Evaluations</TabsTrigger>
          <TabsTrigger value="external">External Evaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab
            teams={teams}
            currentUser={currentUser}
            externalEvaluations={evaluations}
          />
        </TabsContent>

        <TabsContent value="internal" className="mt-6">
          <InternalEvaluationsTab teams={teams} currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="external" className="mt-6">
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

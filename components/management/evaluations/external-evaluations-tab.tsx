"use client";

import { ExternalEvaluationsManager } from "../external-evaluations-manager";

interface ExternalEvaluationsTabProps {
  links: any[];
  episodes: any[];
  oneLiners: any[];
  callReports: any[];
  evaluations: any[];
  contentCountsMap: Record<string, { total: number; call_report: number; episode: number }>;
}

export function ExternalEvaluationsTab({
  links,
  episodes,
  oneLiners,
  callReports,
  evaluations,
  contentCountsMap,
}: ExternalEvaluationsTabProps) {
  return (
    <div>
      <ExternalEvaluationsManager
        links={links}
        episodes={episodes}
        oneLiners={oneLiners}
        callReports={callReports}
        evaluations={evaluations}
        contentCountsMap={contentCountsMap}
      />
    </div>
  );
}

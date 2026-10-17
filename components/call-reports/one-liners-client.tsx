"use client";

import { useState, useEffect, useRef } from "react";
import { useRealtimeRefresh } from "@/lib/hooks/useRealtimeRefresh";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { CallReportSearchableList } from "@/components/call-reports/call-report-searchable-list";
import Link from "next/link";

interface OneLinersClientProps {
  initialReports: any[];
  isTeamHead: boolean;
  currentTeamId?: string;
  portalPrefix: string;
  backHref: string;
  logHref: string;
  subtitle?: string;
  readOnly?: boolean;
  userRole?: string;
}

export function OneLinersClient({
  initialReports,
  isTeamHead,
  currentTeamId,
  portalPrefix,
  backHref,
  logHref,
  subtitle = "View reports, upload revisions, and evaluate",
  readOnly,
  userRole,
}: OneLinersClientProps) {
  const [callReports, setCallReports] = useState(initialReports);
  const realtimeVersion = useRealtimeRefresh(["call_reports", "call_report_revisions"]);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    const fetchReports = async () => {
      try {
        const res = await fetch(`/api/call-reports/list?_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCallReports(data.callReports || []);
      } catch (error: any) {
        console.error("Error fetching call reports:", error);
        toast.error("Failed to load reports");
      }
    };
    fetchReports();
  }, [realtimeVersion]);

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref={backHref} variant="outline" size="sm" className="w-fit" />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">One-Liners</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
          </div>
          <Button asChild className="bg-[#224794] hover:bg-[#1a3670] shrink-0">
            <Link href={logHref}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Log New One-Liner
            </Link>
          </Button>
        </div>
      </div>

      <CallReportSearchableList
        callReports={callReports}
        portalPrefix={portalPrefix}
        emptyStateHref={logHref}
        isTeamHead={isTeamHead}
        currentTeamId={currentTeamId}
        readOnly={readOnly}
        userRole={userRole}
      />
    </div>
  );
}

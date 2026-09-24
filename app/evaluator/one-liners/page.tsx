"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, PlusIcon } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { CallReportSearchableList } from "@/components/call-reports/call-report-searchable-list";
import Link from "next/link";

export default function EvaluatorOneLinersPage() {
  const supabase = createClient();

  const [callReports, setCallReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [isTeamHead, setIsTeamHead] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  // Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("role, team_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setCurrentTeamId(profile.team_id || null);
        if (profile.team_id) {
          const { data: team } = await supabase
            .from("teams")
            .select("team_head_id")
            .eq("id", profile.team_id)
            .single();
          setIsTeamHead(team?.team_head_id === user.id);
        }
      }
    };
    fetchUser();
  }, [supabase]);

  // Fetch call reports on mount
  useEffect(() => {
    const fetchReports = async () => {
      setReportsLoading(true);
      try {
        const res = await fetch(`/api/call-reports/list?_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCallReports(data.callReports || []);
      } catch (error: any) {
        console.error("Error fetching call reports:", error);
        toast.error("Failed to load reports");
      } finally {
        setReportsLoading(false);
      }
    };
    fetchReports();
  }, []);

  return (
    <div className="mobile-container mobile-section">
      <div className="flex flex-col gap-4 sm:gap-6 mb-8">
        <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">One-Liners</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View reports, upload revisions, and evaluate
            </p>
          </div>
          <Button asChild className="bg-[#224794] hover:bg-[#1a3670] shrink-0">
            <Link href="/evaluator/log-call-report">
              <PlusIcon className="h-4 w-4 mr-2" />
              Log New One-Liner
            </Link>
          </Button>
        </div>
      </div>

      {reportsLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <CallReportSearchableList
          callReports={callReports}
          portalPrefix="evaluator"
          emptyStateHref="/evaluator/log-call-report"
          isTeamHead={isTeamHead}
          currentTeamId={currentTeamId || undefined}
        />
      )}
    </div>
  );
}

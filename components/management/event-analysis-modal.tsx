"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EventAnalysisChart } from "./charts/event-analysis-chart";
import { EventAnalysisData } from "@/lib/management/episode-pipeline";
import { getSampleEventAnalysisForDrama } from "@/lib/management/sample-data";
import { Loader2 } from "lucide-react";

interface EventAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  callReportId: string;
  dramaTitle: string;
}

export function EventAnalysisModal({
  isOpen,
  onClose,
  callReportId,
  dramaTitle,
}: EventAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EventAnalysisData[]>([]);

  const fetchEventAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      // Check if this is sample data (sample callReportIds start with "cr-")
      const isSampleData = callReportId.startsWith('cr-');

      let analysisData: EventAnalysisData[];
      if (isSampleData) {
        // Use sample data generator
        analysisData = getSampleEventAnalysisForDrama(callReportId);
      } else {
        // Fetch real data from API
        const response = await fetch(`/api/management/event-analysis/${callReportId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch event analysis data");
        }
        const result = await response.json();
        analysisData = result.data;
      }

      setData(analysisData);
    } catch (error) {
      console.error("Error fetching event analysis:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [callReportId]);

  useEffect(() => {
    if (isOpen && callReportId) {
      fetchEventAnalysis();
    }
  }, [isOpen, callReportId, fetchEventAnalysis]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Event Analysis</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-muted-foreground">Loading event analysis...</span>
          </div>
        ) : (
          <div className="mt-4">
            <EventAnalysisChart data={data} dramaTitle={dramaTitle} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

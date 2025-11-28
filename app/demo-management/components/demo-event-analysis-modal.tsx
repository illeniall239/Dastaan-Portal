'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DemoEventAnalysisChart } from './charts/demo-event-analysis-chart';
import { DummyEventAnalysisData } from '../lib/dummy-data';

interface DemoEventAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  callReportId: string;
  dramaTitle: string;
  eventData: Record<string, DummyEventAnalysisData[]>;
}

export function DemoEventAnalysisModal({
  isOpen,
  onClose,
  callReportId,
  dramaTitle,
  eventData,
}: DemoEventAnalysisModalProps) {
  const data = eventData[callReportId] || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Event Analysis</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <DemoEventAnalysisChart data={data} dramaTitle={dramaTitle} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

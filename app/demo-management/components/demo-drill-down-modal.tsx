'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export interface DrillDownData {
  title: string;
  subtitle: string;
  type: 'table';
  data: Array<{
    evaluator: string;
    status: string;
    score: string;
    grade: string;
    date: string;
  }>;
  columns: Array<{
    key: string;
    label: string;
  }>;
}

interface DemoDrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrillDownData | null;
}

export function DemoDrillDownModal({ isOpen, onClose, data }: DemoDrillDownModalProps) {
  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{data.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{data.subtitle}</p>
        </DialogHeader>

        <div className="mt-4">
          {data.type === 'table' && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr>
                    {data.columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-sm font-semibold text-slate-900"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{row.evaluator}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={row.status === 'Completed' ? 'default' : 'secondary'}
                          className={
                            row.status === 'Completed'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">{row.score}</td>
                      <td className="px-4 py-3 text-sm">{row.grade}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportButton } from "./export-button";

export interface DrillDownData {
  title: string;
  subtitle?: string;
  type: "table" | "list" | "details";
  data: any[];
  columns?: { key: string; label: string; format?: (value: any) => string }[];
}

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DrillDownData | null;
}

export function DrillDownModal({ isOpen, onClose, data }: DrillDownModalProps) {
  if (!isOpen || !data) return null;

  const renderTable = () => {
    if (!data.columns || data.data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No data available
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                {data.columns!.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderList = () => {
    if (data.data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No items to display
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {data.data.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
          >
            <h4 className="font-semibold text-slate-900">{item.title || item.name}</h4>
            {item.subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
            )}
            {item.description && (
              <p className="text-sm text-slate-700 mt-2">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderDetails = () => {
    if (data.data.length === 0) return null;
    const item = data.data[0]; // Show first item's details

    return (
      <div className="space-y-4">
        {Object.entries(item).map(([key, value]) => (
          <div key={key} className="border-b border-slate-100 pb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
              {key.replace(/_/g, " ")}
            </p>
            <p className="text-slate-900">
              {typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-slate-200">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{data.title}</h2>
              {data.subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{data.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {data.type === "table" && data.data.length > 0 && (
                <ExportButton
                  data={data.data}
                  filename={data.title.toLowerCase().replace(/\s+/g, "-")}
                  formats={["excel", "csv"]}
                  compact
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {data.type === "table" && renderTable()}
            {data.type === "list" && renderList()}
            {data.type === "details" && renderDetails()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
            <p className="text-sm text-muted-foreground">
              Showing {data.data.length} {data.data.length === 1 ? "item" : "items"}
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

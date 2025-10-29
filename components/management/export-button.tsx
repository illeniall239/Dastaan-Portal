"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, Table } from "lucide-react";
import { exportAsPNG, exportAsPDF, exportAsExcel, exportAsCSV } from "./export-utils";

interface ExportButtonProps {
  elementId?: string;
  data?: any[];
  filename: string;
  formats?: Array<"png" | "pdf" | "excel" | "csv">;
  compact?: boolean;
}

export function ExportButton({
  elementId,
  data,
  filename,
  formats = ["png", "pdf"],
  compact = false,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      switch (format) {
        case "png":
          if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
              await exportAsPNG(element, filename);
            }
          }
          break;
        case "pdf":
          if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
              await exportAsPDF(element, filename);
            }
          }
          break;
        case "excel":
          if (data) {
            exportAsExcel(data, filename);
          }
          break;
        case "csv":
          if (data) {
            exportAsCSV(data, filename);
          }
          break;
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (compact) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
          className="h-8 w-8 p-0"
        >
          <Download className="h-4 w-4" />
        </Button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={isExporting}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                >
                  {format === "png" && <ImageIcon className="h-4 w-4" />}
                  {format === "pdf" && <FileText className="h-4 w-4" />}
                  {(format === "excel" || format === "csv") && <Table className="h-4 w-4" />}
                  <span className="uppercase">{format}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2">
            <p className="text-xs font-semibold text-slate-500 uppercase px-2 py-1">
              Export as
            </p>
            <div className="space-y-1">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  disabled={isExporting}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2"
                >
                  {format === "png" && <ImageIcon className="h-4 w-4 text-blue-500" />}
                  {format === "pdf" && <FileText className="h-4 w-4 text-red-500" />}
                  {format === "excel" && <Table className="h-4 w-4 text-green-500" />}
                  {format === "csv" && <Table className="h-4 w-4 text-orange-500" />}
                  <span className="uppercase">{format === "excel" ? "Excel" : format}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { Download, Printer } from "lucide-react";
import { DateRangeSelector, DateRange } from "./date-range-selector";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { printDashboard } from "./export-utils";

interface ManagementHeaderProps {
  userName: string;
}

export function ManagementHeader({ userName }: ManagementHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateRangeChange = (range: DateRange) => {
    // Update URL with date range params
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
    if (range.preset) {
      params.set("preset", range.preset);
    }
    router.push(`?${params.toString()}`);
  };

  const handleExportDashboard = async () => {
    try {
      // Generate PDF report of all dashboard sections
      const sections = [
        "executive-summary",
        "episodes-section",
        "pipeline-section",
        "evaluator-performance",
        "financial-overview",
        "performance-metrics"
      ].map(id => ({
        element: document.getElementById(id)!,
        title: document.getElementById(id)?.querySelector("h2, h3")?.textContent || "Section"
      })).filter(s => s.element);

      if (sections.length === 0) {
        alert("No sections found to export. Please wait for the page to fully load.");
        return;
      }

      const { generateDashboardReport } = await import("./export-utils");
      await generateDashboardReport(sections);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export dashboard. Please try again.");
    }
  };

  const handlePrintDashboard = () => {
    try {
      printDashboard();
    } catch (error) {
      console.error("Print error:", error);
      alert("Failed to print dashboard. Please try again.");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight">
          Welcome back, <span className="text-[#224794]">{userName}</span>.
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
          Complete oversight of content production pipeline
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        <DateRangeSelector onChange={handleDateRangeChange} />
        <Button
          onClick={handlePrintDashboard}
          variant="outline"
          className="hidden md:flex items-center gap-2 no-print"
        >
          <Printer className="h-4 w-4" />
          <span className="hidden lg:inline">Print</span>
        </Button>
        <Button
          onClick={handleExportDashboard}
          variant="outline"
          className="hidden md:flex items-center gap-2 no-print"
        >
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline">Export Report</span>
        </Button>
      </div>
    </div>
  );
}

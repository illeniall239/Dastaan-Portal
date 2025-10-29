"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";

export interface DateRange {
  from: Date;
  to: Date;
  preset?: string;
}

interface DateRangeSelectorProps {
  onChange: (range: DateRange) => void;
  className?: string;
}

const PRESETS = [
  { label: "Last 7 days", value: "7d", getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", value: "30d", getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "Last 3 months", value: "3m", getDates: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: "Last 6 months", value: "6m", getDates: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: "All time", value: "all", getDates: () => ({ from: new Date(2020, 0, 1), to: new Date() }) },
];

export function DateRangeSelector({ onChange, className }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Try to load from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("management-date-range");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          from: new Date(parsed.from),
          to: new Date(parsed.to),
          preset: parsed.preset,
        };
      }
    }
    // Default to last 30 days
    const preset = PRESETS.find(p => p.value === "30d")!;
    return { ...preset.getDates(), preset: "30d" };
  });

  // Initialize with saved or default range
  useEffect(() => {
    onChange(dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetClick = (presetValue: string) => {
    const preset = PRESETS.find(p => p.value === presetValue);
    if (preset) {
      const dates = preset.getDates();
      const newRange = {
        from: startOfDay(dates.from),
        to: endOfDay(dates.to),
        preset: presetValue,
      };
      setDateRange(newRange);
      setSelectedPreset(presetValue);

      // Save to localStorage
      localStorage.setItem("management-date-range", JSON.stringify({
        from: newRange.from.toISOString(),
        to: newRange.to.toISOString(),
        preset: presetValue,
      }));

      onChange(newRange);
      setIsOpen(false);
    }
  };

  const formatDateRange = () => {
    const preset = PRESETS.find(p => p.value === selectedPreset);
    return preset ? preset.label : `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <CalendarIcon className="h-4 w-4" />
        <span>{formatDateRange()}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
            <div className="p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Quick Select</p>
              <div className="space-y-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedPreset === preset.value
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { startOfDay, startOfWeek, startOfMonth, subDays } from "date-fns";

export interface TimeRange {
  from: Date;
  to: Date;
  preset: string;
  label: string;
}

interface EvaluatorTimeFilterProps {
  selectedPreset: string;
  onChange: (range: TimeRange) => void;
}

const TIME_PRESETS = [
  {
    value: "today",
    label: "Today",
    getDates: () => ({ from: startOfDay(new Date()), to: new Date() }),
  },
  {
    value: "week",
    label: "This Week",
    getDates: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() }),
  },
  {
    value: "month",
    label: "This Month",
    getDates: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    value: "7d",
    label: "Last 7 Days",
    getDates: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    value: "30d",
    label: "Last 30 Days",
    getDates: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    value: "all",
    label: "All Time",
    getDates: () => ({ from: new Date(2020, 0, 1), to: new Date() }),
  },
];

export function EvaluatorTimeFilter({ selectedPreset, onChange }: EvaluatorTimeFilterProps) {
  const handlePresetClick = (preset: typeof TIME_PRESETS[0]) => {
    const dates = preset.getDates();
    onChange({
      from: dates.from,
      to: dates.to,
      preset: preset.value,
      label: preset.label,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {TIME_PRESETS.map((preset) => (
        <Button
          key={preset.value}
          onClick={() => handlePresetClick(preset)}
          size="sm"
          variant={selectedPreset === preset.value ? "default" : "outline"}
          className={
            selectedPreset === preset.value
              ? "bg-[#224794] hover:bg-[#1a3670] text-white"
              : "bg-white hover:bg-slate-50 text-slate-700"
          }
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}

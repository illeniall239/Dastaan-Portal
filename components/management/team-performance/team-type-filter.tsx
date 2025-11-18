"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

interface TeamTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const TEAM_TYPES = [
  { value: "all", label: "All Teams", icon: "🔵" },
  { value: "production", label: "Production Teams", icon: "🎬" },
  { value: "channel", label: "Channel Teams", icon: "📺" },
  { value: "adaptation", label: "Adaptation Teams", icon: "✨" },
  { value: "evaluator", label: "Evaluator Teams", icon: "⭐" },
  { value: "other", label: "Other Teams", icon: "📁" },
];

export function TeamTypeFilter({ value, onChange }: TeamTypeFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 whitespace-nowrap">
        <Filter className="h-4 w-4 text-teal-600" />
        Filter by Type
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] border-teal-200 focus:ring-teal-500">
          <SelectValue placeholder="Select team type" />
        </SelectTrigger>
        <SelectContent>
          {TEAM_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              <div className="flex items-center gap-2">
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewSwitcherProps {
  currentView: "day" | "week" | "month";
  onViewChange: (view: "day" | "week" | "month") => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <Tabs value={currentView} onValueChange={(v) => onViewChange(v as any)}>
      <TabsList>
        <TabsTrigger value="day">Day</TabsTrigger>
        <TabsTrigger value="week">Week</TabsTrigger>
        <TabsTrigger value="month">Month</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

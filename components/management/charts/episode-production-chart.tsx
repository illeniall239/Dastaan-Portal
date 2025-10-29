"use client";

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film } from "lucide-react";
import { ExportButton } from "../export-button";
import { DrillDownModal, DrillDownData } from "../drill-down-modal";

interface EpisodeProductionChartProps {
  data: {
    date: string;
    callReportEpisodes: number;
    storyEpisodes: number;
    total: number;
  }[];
}

export function EpisodeProductionChart({ data }: EpisodeProductionChartProps) {
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Format data for chart
  const chartData = data.map(item => ({
    week: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    date: item.date,
    "Call Reports": item.callReportEpisodes,
    "Stories": item.storyEpisodes,
  }));

  const handleBarClick = (data: any) => {
    // Show drill-down with weekly episode breakdown
    setDrillDownData({
      title: `Episodes for ${data.week}`,
      subtitle: `Breakdown of episodes logged during this week`,
      type: "table",
      data: [
        { source: "Call Reports", count: data["Call Reports"], percentage: `${((data["Call Reports"] / (data["Call Reports"] + data["Stories"])) * 100).toFixed(0)}%` },
        { source: "Stories", count: data["Stories"], percentage: `${((data["Stories"] / (data["Call Reports"] + data["Stories"])) * 100).toFixed(0)}%` },
        { source: "Total", count: data["Call Reports"] + data["Stories"], percentage: "100%" },
      ],
      columns: [
        { key: "source", label: "Source" },
        { key: "count", label: "Episodes" },
        { key: "percentage", label: "Percentage" },
      ],
    });
    setIsModalOpen(true);
  };

  return (
    <>
      <Card id="episode-production-chart">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Episode Production Trends</CardTitle>
              <CardDescription>Episodes logged over time by source (click bars for details)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                elementId="episode-production-chart"
                data={chartData}
                filename="episode-production-trends"
                formats={["png", "pdf", "excel"]}
                compact
              />
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              fontSize={12}
              tickMargin={10}
            />
            <YAxis fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="Call Reports" fill="#3b82f6" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer" />
            <Bar dataKey="Stories" fill="#8b5cf6" radius={[4, 4, 0, 0]} onClick={handleBarClick} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <DrillDownModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      data={drillDownData}
    />
    </>
  );
}

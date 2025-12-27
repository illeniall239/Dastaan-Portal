"use client";

import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { getCategoryLabel } from "@/lib/management/color-palettes";

interface TimelineChartProps {
  ideas: ActiveIdeaDetail[];
}

export function TimelineChart({ ideas }: TimelineChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);

  // Helper function to get Monday of the current week
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const data = useMemo(() => {
    // Get the last 12 weeks of data (Monday-Sunday)
    const now = new Date();
    const currentMonday = getMondayOfWeek(now);
    const weeks: { week: string; weekStart: Date; weekEnd: Date; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(currentMonday);
      weekStart.setDate(weekStart.getDate() - (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      weekEnd.setHours(23, 59, 59, 999); // End of Sunday

      // Format week label (Monday's date)
      const monthDay = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      weeks.push({
        week: monthDay,
        weekStart,
        weekEnd,
        count: 0
      });
    }

    // Count projects per week based on created_at
    ideas.forEach(idea => {
      const createdAt = new Date(idea.created_at);

      for (let i = 0; i < weeks.length; i++) {
        if (createdAt >= weeks[i].weekStart && createdAt < weeks[i].weekEnd) {
          weeks[i].count++;
          break;
        }
      }
    });

    return weeks;
  }, [ideas]);

  const totalRecent = data.reduce((sum, d) => sum + d.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const handleAreaClick = (chartData: any) => {
    if (!chartData || !chartData.activePayload || !chartData.activePayload[0]) return;

    const clickedData = chartData.activePayload[0].payload;
    const weekLabel = clickedData.week;
    const weekStart = clickedData.weekStart;
    const weekEnd = clickedData.weekEnd;

    // Filter ideas for this specific week
    const filteredIdeas = ideas.filter(idea => {
      const createdAt = new Date(idea.created_at);
      return createdAt >= weekStart && createdAt < weekEnd;
    });

    if (filteredIdeas.length === 0) return;

    // Format week range for title
    const endDate = new Date(weekEnd);
    endDate.setDate(endDate.getDate() - 1); // Get actual Sunday
    const weekEndLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Prepare modal data
    setModalData({
      title: `Week of ${weekLabel} - ${weekEndLabel}`,
      subtitle: `${filteredIdeas.length} ${filteredIdeas.length === 1 ? 'project' : 'projects'} added`,
      type: "table",
      data: filteredIdeas,
      columns: [
        { key: "working_title", label: "Title" },
        {
          key: "writer_names",
          label: "Writer",
          format: (value: string[]) => value && value.length > 0 ? value.join(', ') : 'N/A'
        },
        {
          key: "genre",
          label: "Genre",
          format: (value: string[]) => value && value.length > 0 ? value.join(', ') : 'N/A'
        },
        {
          key: "category",
          label: "Category",
          format: (value: string) => getCategoryLabel(value)
        },
        {
          key: "meeting_date",
          label: "Meeting Date",
          format: (value: string) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'
        },
        {
          key: "status",
          label: "Status",
          format: (value: string) => value?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'
        },
        {
          key: "overall_rating",
          label: "Score",
          format: (value: number) => value !== null && value !== undefined ? value.toFixed(1) : 'N/A'
        }
      ]
    });
    setModalOpen(true);
  };

  return (
    <Card className="p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Projects Added</h3>
        <span className="text-xs text-gray-500">{totalRecent} in last 12 weeks</span>
      </div>
      
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
            onClick={handleAreaClick}
          >
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#224794" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#224794" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="week" 
              tick={{ fontSize: 9, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              interval={2}
              angle={-45}
              textAnchor="end"
              height={40}
            />
            <YAxis hide domain={[0, maxCount * 1.2]} />
            <Tooltip
              formatter={(value: number) => [`${value} projects`, "Added"]}
              labelFormatter={(label) => `Week of ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#224794"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
              cursor="pointer"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </Card>
  );
}


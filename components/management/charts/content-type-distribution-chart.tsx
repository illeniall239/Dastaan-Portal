"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Film } from "lucide-react";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { CONTENT_TYPE_COLORS } from "@/lib/management/color-palettes";

interface ContentTypeDistributionChartProps {
  ideas: ActiveIdeaDetail[];
}

export function ContentTypeDistributionChart({ ideas }: ContentTypeDistributionChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(false);

  const distributionData = useMemo(() => {
    const typeGroups: Record<string, ActiveIdeaDetail[]> = {
      'Serial': [],
      'Long Serial': [],
      'Telefilm': [],
      'Mini-serial': [],
      'Ramadan Serial': [],
      'Series Sitcom': [],
      'Soap': [],
      'Unspecified': []
    };

    ideas.forEach(idea => {
      if (idea.content_type && typeGroups[idea.content_type]) {
        typeGroups[idea.content_type].push(idea);
      } else {
        typeGroups['Unspecified'].push(idea);
      }
    });

    return Object.entries(typeGroups)
      .map(([name, ideasInType]) => ({
        name,
        value: ideasInType.length,
        color: CONTENT_TYPE_COLORS[name] || CONTENT_TYPE_COLORS['Unspecified'],
        percentage: ideas.length > 0 ? ((ideasInType.length / ideas.length) * 100).toFixed(1) : '0'
      }))
      .filter(item => item.value > 0) // Only show types that have ideas
      .sort((a, b) => b.value - a.value); // Sort by count descending
  }, [ideas]);

  const handlePieClick = async (data: any) => {
    const contentType = data.name;
    setLoading(true);

    try {
      const url = contentType === 'Unspecified'
        ? `/api/management/active-ideas-details`
        : `/api/management/active-ideas-details?content_type=${encodeURIComponent(contentType)}`;

      const response = await fetch(url);
      const result = await response.json();

      let details: ActiveIdeaDetail[] = result.details || [];

      // Filter for unspecified if needed
      if (contentType === 'Unspecified') {
        details = details.filter(d => !d.content_type || d.content_type === null);
      }

      setModalData({
        title: `${contentType} - Active Story Ideas`,
        subtitle: `${details.length} active one-liners for this content type`,
        type: "table",
        data: details,
        columns: [
          { key: "call_report_id", label: "One-Liner ID" },
          { key: "working_title", label: "Working Title" },
          { key: "writer_name", label: "Writer Name" },
          { key: "genre", label: "Genre" },
          {
            key: "category",
            label: "Category",
            format: (value: string) => value?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'
          },
          {
            key: "status",
            label: "Status",
            format: (value: string) => value?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          },
          {
            key: "meeting_date",
            label: "Meeting Date",
            format: (value: string) => new Date(value).toLocaleDateString()
          },
          {
            key: "days_active",
            label: "Days Active",
            format: (value: number) => `${value} days`
          },
          {
            key: "logline",
            label: "Logline",
            format: (value: string | null) => value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'N/A'
          },
        ]
      });
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching content type details:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIdeas = ideas.length;

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label if less than 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Content Type Distribution</CardTitle>
              <CardDescription>
                {totalIdeas} ideas across {distributionData.length} content types
              </CardDescription>
            </div>
            <Film className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {totalIdeas === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Film className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No active ideas to display</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={handlePieClick}
                    cursor="pointer"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      const percentage = props.payload.percentage;
                      return [`${value} ideas (${percentage}%)`, props.payload.name];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                {distributionData.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handlePieClick(item)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-muted-foreground font-medium text-xs">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900 text-lg">{item.value}</span>
                    <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                  </div>
                ))}
              </div>
              {loading && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Loading content type details...
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={modalData}
      />
    </>
  );
}

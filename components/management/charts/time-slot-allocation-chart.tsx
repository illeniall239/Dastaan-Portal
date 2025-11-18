"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";
import { SLOT_COLORS } from "@/lib/management/color-palettes";

interface TimeSlotAllocationChartProps {
  ideas: ActiveIdeaDetail[];
}

export function TimeSlotAllocationChart({ ideas }: TimeSlotAllocationChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(false);

  const slotData = useMemo(() => {
    const slotGroups: Record<string, ActiveIdeaDetail[]> = {
      '6 PM': [],
      '7 PM': [],
      '8 PM': [],
      '9 PM': [],
      'Unassigned': []
    };

    ideas.forEach(idea => {
      if (idea.slot && slotGroups[idea.slot]) {
        slotGroups[idea.slot].push(idea);
      } else {
        slotGroups['Unassigned'].push(idea);
      }
    });

    return Object.entries(slotGroups).map(([slot, ideasInSlot]) => {
      const ratingsWithValues = ideasInSlot.filter(i => i.overall_rating !== null);
      const avgRating = ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, i) => sum + (i.overall_rating || 0), 0) / ratingsWithValues.length
        : 0;

      return {
        slot,
        count: ideasInSlot.length,
        avgRating: avgRating > 0 ? Number(avgRating.toFixed(1)) : null,
        color: SLOT_COLORS[slot] || SLOT_COLORS['Unassigned']
      };
    });
  }, [ideas]);

  const handleBarClick = async (barData: any) => {
    const slot = barData.slot;
    setLoading(true);

    try {
      const url = slot === 'Unassigned'
        ? `/api/management/active-ideas-details`
        : `/api/management/active-ideas-details?slot=${encodeURIComponent(slot)}`;

      const response = await fetch(url);
      const result = await response.json();

      let details: ActiveIdeaDetail[] = result.details || [];

      // Filter for unassigned if needed
      if (slot === 'Unassigned') {
        details = details.filter(d => !d.slot || d.slot === null);
      }

      setModalData({
        title: `${slot} Time Slot - Active Story Ideas`,
        subtitle: `${details.length} active call reports for this time slot`,
        type: "table",
        data: details,
        columns: [
          { key: "call_report_id", label: "Call Report ID" },
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
      console.error('Error fetching slot details:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalIdeas = slotData.reduce((sum, item) => sum + item.count, 0);
  const assignedIdeas = totalIdeas - (slotData.find(s => s.slot === 'Unassigned')?.count || 0);
  const assignmentRate = totalIdeas > 0 ? ((assignedIdeas / totalIdeas) * 100).toFixed(0) : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Time Slot Allocation</CardTitle>
              <CardDescription>
                {totalIdeas} ideas - {assignmentRate}% assigned to time slots
              </CardDescription>
            </div>
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {totalIdeas === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No active ideas to display</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={slotData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="slot"
                    fontSize={12}
                    stroke="#6b7280"
                  />
                  <YAxis
                    fontSize={12}
                    stroke="#6b7280"
                    label={{ value: 'Number of Ideas', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === 'count') {
                        return [`${value} ideas`, 'Count'];
                      }
                      return [value, name];
                    }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                            <p className="font-bold text-gray-900">{data.slot}</p>
                            <p className="text-sm text-gray-600">Count: {data.count} ideas</p>
                            {data.avgRating !== null && (
                              <p className="text-sm text-gray-600">Avg Rating: {data.avgRating}/10</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={80}
                    onClick={handleBarClick}
                    cursor="pointer"
                  >
                    {slotData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                {slotData.map((item, index) => (
                  <div
                    key={index}
                    className="flex flex-col p-3 bg-slate-50 rounded"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-muted-foreground font-medium">{item.slot}</span>
                    </div>
                    <span className="font-bold text-slate-900 text-lg">{item.count}</span>
                    {item.avgRating !== null && (
                      <span className="text-xs text-muted-foreground">Avg: {item.avgRating}/10</span>
                    )}
                  </div>
                ))}
              </div>
              {loading && (
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Loading slot details...
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

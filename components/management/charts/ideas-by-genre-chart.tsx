"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ActiveIdeaDetail } from "@/lib/management/active-ideas-details";

interface IdeasByGenreChartProps {
  data: {
    genre: string;
    count: number;
  }[];
}

// All bars in blue for active ideas
const GENRE_COLORS: Record<string, string> = {
  'Drama': '#3b82f6',      // blue-500
  'Comedy': '#3b82f6',     // blue-500
  'Action': '#3b82f6',     // blue-500
  'Thriller': '#3b82f6',   // blue-500
  'Romance': '#3b82f6',    // blue-500
  'Horror': '#3b82f6',     // blue-500
  'Sci-Fi': '#3b82f6',     // blue-500
  'Fantasy': '#3b82f6',    // blue-500
  'Documentary': '#3b82f6', // blue-500
  'Other': '#3b82f6',      // blue-500
};

export function IdeasByGenreChart({ data }: IdeasByGenreChartProps) {
  const totalIdeas = data.reduce((sum, item) => sum + item.count, 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBarClick = async (barData: any) => {
    const genre = barData.genre;
    setLoading(true);

    try {
      // Check if we should use sample data from URL params
      const searchParams = new URLSearchParams(window.location.search);
      const useSampleData = searchParams.get('sample') === 'true';
      const url = `/api/management/active-ideas-details?genre=${encodeURIComponent(genre)}${useSampleData ? '&sample=true' : ''}`;

      const response = await fetch(url);
      const result = await response.json();

      const details: ActiveIdeaDetail[] = result.details || [];

      // Transform data for modal
      setModalData({
        title: `${genre} - Active Story Ideas`,
        subtitle: `${details.length} active call reports awaiting evaluation`,
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
      console.error('Error fetching active ideas details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Active Ideas Archive</CardTitle>
            <CardDescription>
              {totalIdeas} active story ideas awaiting review and evaluation
            </CardDescription>
          </div>
          <Lightbulb className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No active ideas in storage</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="genre"
                  angle={-45}
                  textAnchor="end"
                  height={100}
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
                  formatter={(value: number) => [`${value} ideas`, 'Count']}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                  onClick={handleBarClick}
                  cursor="pointer"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GENRE_COLORS[entry.genre] || '#6b7280'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
              {data.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: GENRE_COLORS[item.genre] || '#6b7280' }}
                    ></div>
                    <span className="text-muted-foreground">{item.genre}:</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
            {loading && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Loading active ideas details...
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

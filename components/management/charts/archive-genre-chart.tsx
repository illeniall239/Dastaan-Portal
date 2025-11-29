"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive } from "lucide-react";
import { DrillDownModal, DrillDownData } from "@/components/management/drill-down-modal";
import type { ArchiveDetail } from "@/lib/management/archive-details";

interface ArchiveGenreChartProps {
  data: {
    genre: string;
    count: number;
  }[];
}

// All bars in orange for rejected ideas
const GENRE_COLORS: Record<string, string> = {
  'Drama': '#f97316',      // orange-500
  'Comedy': '#f97316',     // orange-500
  'Action': '#f97316',     // orange-500
  'Thriller': '#f97316',   // orange-500
  'Romance': '#f97316',    // orange-500
  'Horror': '#f97316',     // orange-500
  'Sci-Fi': '#f97316',     // orange-500
  'Fantasy': '#f97316',    // orange-500
  'Documentary': '#f97316', // orange-500
  'Other': '#f97316',      // orange-500
};

export function ArchiveGenreChart({ data }: ArchiveGenreChartProps) {
  const totalArchived = data.reduce((sum, item) => sum + item.count, 0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<DrillDownData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBarClick = async (barData: any) => {
    const genre = barData.genre;
    setLoading(true);

    try {
      const url = `/api/management/archive-details?genre=${encodeURIComponent(genre)}`;

      const response = await fetch(url);
      const result = await response.json();

      const details: ArchiveDetail[] = result.details || [];

      // Transform data for modal
      setModalData({
        title: `${genre} - Archived/Rejected Stories`,
        subtitle: `${details.length} total (${details.filter(d => d.type === 'story_archive').length} story archives, ${details.filter(d => d.type === 'call_report_rejection').length} call report rejections)`,
        type: "table",
        data: details,
        columns: [
          {
            key: "type",
            label: "Type",
            format: (value: string) => value === 'story_archive' ? 'Story Archive' : 'Call Report Rejection'
          },
          { key: "title", label: "Title" },
          { key: "writer_name", label: "Writer" },
          { key: "genre", label: "Genre" },
          { key: "category", label: "Category", format: (value: string) => value?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A' },
          {
            key: "rejection_date",
            label: "Rejection Date",
            format: (value: string) => new Date(value).toLocaleDateString()
          },
          {
            key: "days_in_system",
            label: "Days in System",
            format: (value: number | null) => value !== null ? `${value} days` : 'N/A'
          },
          {
            key: "average_score",
            label: "Score",
            format: (value: number | undefined) => value !== undefined ? value.toFixed(2) : 'N/A'
          },
          { key: "rejection_stage", label: "Stage", format: (value: string) => value || 'N/A' },
          { key: "rejection_reason", label: "Reason" },
        ]
      });
      setModalOpen(true);
    } catch (error) {
      console.error('Error fetching archive details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base lg:text-lg">Rejected Ideas Archive</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Distribution of {totalArchived} rejected ideas across genres
              </CardDescription>
            </div>
            <Archive className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <ResponsiveContainer width="100%" height={280} className="sm:!h-[350px]">
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
          <div className="mt-4 sm:mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 text-xs sm:text-sm">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-1.5 sm:p-2 bg-slate-50 rounded"
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: GENRE_COLORS[item.genre] || '#6b7280' }}
                  ></div>
                  <span className="text-muted-foreground">{item.genre}:</span>
                </div>
                <span className="font-bold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
          {loading && (
            <div className="mt-3 sm:mt-4 text-center text-xs sm:text-sm text-muted-foreground">
              Loading archive details...
            </div>
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

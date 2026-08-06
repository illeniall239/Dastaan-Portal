"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { DrillDownModal, type DrillDownData } from "@/components/management/drill-down-modal";

interface TeamComparisonData {
  team_id: string;
  team_name: string;
  team_type: string;
  call_reports: number;
  evaluations: number;
  one_liners: number;
  stories_approved: number;
  rank: number;
}

interface TeamComparisonBarChartProps {
  data: TeamComparisonData[];
  metric: 'call_reports' | 'evaluations' | 'one_liners' | 'stories_approved';
  title?: string;
  description?: string;
}

const TEAM_TYPE_COLORS: Record<string, string> = {
  production: '#3b82f6',
  channel: '#a855f7',
  adaptation: '#10b981',
  evaluator: '#eab308',
  other: '#6b7280',
};

const METRIC_LABELS: Record<string, string> = {
  call_reports: 'One-Liner Reports',
  evaluations: 'Evaluations',
  one_liners: 'One-Liners',
  stories_approved: 'Stories Approved',
};

const DRILL_DOWN_COLUMNS: Record<string, DrillDownData['columns']> = {
  call_reports: [
    { key: 'working_title', label: 'Title' },
    { key: 'writer_name', label: 'Writer' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ],
  evaluations: [
    { key: 'working_title', label: 'Story' },
    { key: 'evaluator_name', label: 'Evaluator' },
    { key: 'average_score', label: 'Score', format: (v) => v != null ? Number(v).toFixed(1) : '—' },
    { key: 'created_at', label: 'Date', format: (v) => v ? new Date(v).toLocaleDateString() : '—' },
  ],
};

export function TeamComparisonBarChart({
  data,
  metric,
  title,
  description,
}: TeamComparisonBarChartProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);

  const sortedData = [...data].sort((a, b) => b[metric] - a[metric]);

  const chartData = sortedData.slice(0, 10).map(team => ({
    name: team.team_name.length > 20 ? team.team_name.substring(0, 18) + '...' : team.team_name,
    value: team[metric],
    color: TEAM_TYPE_COLORS[team.team_type] || TEAM_TYPE_COLORS.other,
    fullName: team.team_name,
    team_id: team.team_id,
  }));

  const handleBarClick = async (barData: any) => {
    if (!barData?.team_id || !DRILL_DOWN_COLUMNS[metric]) return;

    setLoading(true);
    setModalOpen(true);
    setDrillDownData({
      title: `${barData.fullName}`,
      subtitle: `${METRIC_LABELS[metric]} — all time`,
      type: "table",
      data: [],
      columns: DRILL_DOWN_COLUMNS[metric],
    });

    try {
      const res = await fetch(
        `/api/management/team-drill-down?teamId=${barData.team_id}&metric=${metric}&_t=${Date.now()}`
      );
      const json = await res.json();

      setDrillDownData({
        title: json.teamName || barData.fullName,
        subtitle: `${METRIC_LABELS[metric]} — all time (${json.data?.length ?? 0} records)`,
        type: "table",
        data: json.data || [],
        columns: DRILL_DOWN_COLUMNS[metric],
      });
    } catch {
      setDrillDownData(prev => prev ? { ...prev, subtitle: "Failed to load data" } : null);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm text-gray-900">{payload[0].payload.fullName}</p>
          <p className="text-sm text-gray-600">
            {METRIC_LABELS[metric]}: <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-xs text-teal-600 mt-1">Click to drill down</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Card className="min-w-0 w-full overflow-hidden">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <TrendingUp className="h-4 w-4 text-teal-600" />
            {title || `Teams by ${METRIC_LABELS[metric]}`}
          </CardTitle>
          {description && <CardDescription className="text-xs mt-0.5">{description} · Click a bar to drill down</CardDescription>}
        </CardHeader>
        <CardContent className="p-3 pt-1">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 2, right: 16, left: 0, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#6b7280"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  onClick={handleBarClick}
                  style={{ cursor: 'pointer' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <DrillDownModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        data={loading && drillDownData ? { ...drillDownData, subtitle: "Loading..." } : drillDownData}
      />
    </>
  );
}

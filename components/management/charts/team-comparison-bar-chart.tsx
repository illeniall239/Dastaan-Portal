"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

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
  production: '#3b82f6', // blue
  channel: '#a855f7', // purple
  adaptation: '#10b981', // green
  evaluator: '#eab308', // yellow
  other: '#6b7280', // gray
};

const METRIC_LABELS: Record<string, string> = {
  call_reports: 'One-Liners',
  evaluations: 'Evaluations',
  one_liners: 'One-Liners',
  stories_approved: 'Stories Approved',
};

export function TeamComparisonBarChart({
  data,
  metric,
  title,
  description,
}: TeamComparisonBarChartProps) {
  // Sort data by the selected metric (descending)
  const sortedData = [...data].sort((a, b) => b[metric] - a[metric]);

  // Show first 10 teams
  const chartData = sortedData.slice(0, 10).map(team => ({
    name: team.team_name.length > 20 ? team.team_name.substring(0, 18) + '...' : team.team_name,
    value: team[metric],
    color: TEAM_TYPE_COLORS[team.team_type] || TEAM_TYPE_COLORS.other,
    fullName: team.team_name,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm text-gray-900">{payload[0].payload.fullName}</p>
          <p className="text-sm text-gray-600">
            {METRIC_LABELS[metric]}: <span className="font-medium">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <TrendingUp className="h-4 w-4 text-teal-600" />
          {title || `Teams by ${METRIC_LABELS[metric]}`}
        </CardTitle>
        {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
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
                width={80}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

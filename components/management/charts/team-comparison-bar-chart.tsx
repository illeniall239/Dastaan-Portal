"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              {title || `Teams by ${METRIC_LABELS[metric]}`}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#6b7280"
                width={90}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {Object.entries(TEAM_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-600 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

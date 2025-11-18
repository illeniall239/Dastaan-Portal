"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface TeamTypeData {
  type: string;
  count: number;
  percentage: number;
}

interface TeamTypePieChartProps {
  data: TeamTypeData[];
  title?: string;
  description?: string;
}

const COLORS: Record<string, string> = {
  production: '#3b82f6',
  channel: '#a855f7',
  adaptation: '#10b981',
  evaluator: '#eab308',
  other: '#6b7280',
};

const TYPE_LABELS: Record<string, string> = {
  production: 'Production Teams',
  channel: 'Channel Teams',
  adaptation: 'Adaptation Teams',
  evaluator: 'Evaluator Teams',
  other: 'Other Teams',
};

export function TeamTypePieChart({
  data,
  title = "Team Distribution by Type",
  description = "Breakdown of teams across different categories",
}: TeamTypePieChartProps) {
  const chartData = data.map(item => ({
    name: TYPE_LABELS[item.type] || item.type,
    value: item.count,
    percentage: item.percentage,
    color: COLORS[item.type] || COLORS.other,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            Count: <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-sm text-gray-600">
            Share: <span className="font-medium">{payload[0].payload.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage.toFixed(0)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-teal-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-2 gap-4">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {entry.value} team{entry.value !== 1 ? 's' : ''} ({entry.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface GradeDistributionChartProps {
  gradeDistribution: {
    [key: string]: number;
  };
}

const GRADE_COLORS = {
  'A+': '#10b981', // green
  'A': '#22c55e',
  'B+': '#3b82f6', // blue
  'B': '#60a5fa',
  'C': '#f59e0b', // orange
  'D': '#ef4444', // red
  'F': '#dc2626',
};

const GRADE_ORDER = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];

export function GradeDistributionChart({ gradeDistribution }: GradeDistributionChartProps) {
  // Convert to array and sort by grade order
  const data = GRADE_ORDER
    .map(grade => ({
      name: grade,
      value: gradeDistribution[grade] || 0,
      color: GRADE_COLORS[grade as keyof typeof GRADE_COLORS] || '#94a3b8',
    }))
    .filter(item => item.value > 0);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Grade Distribution</CardTitle>
              <CardDescription>Episodic evaluation grades breakdown</CardDescription>
            </div>
            <Award className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No grade data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Grade Distribution</CardTitle>
            <CardDescription>Episodic evaluation grades breakdown</CardDescription>
          </div>
          <Award className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Grade Breakdown Table */}
          <div className="mt-6 w-full max-w-md">
            <div className="grid grid-cols-2 gap-3">
              {data.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="font-bold text-lg">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-700">{item.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {((item.value / total) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4 w-full text-sm">
            <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
              <p className="text-muted-foreground text-xs">Excellent (A)</p>
              <p className="font-bold text-green-600 mt-1">
                {((gradeDistribution['A+'] || 0) + (gradeDistribution['A'] || 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {(((gradeDistribution['A+'] || 0) + (gradeDistribution['A'] || 0)) / total * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
              <p className="text-muted-foreground text-xs">Good (B)</p>
              <p className="font-bold text-blue-600 mt-1">
                {((gradeDistribution['B+'] || 0) + (gradeDistribution['B'] || 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {(((gradeDistribution['B+'] || 0) + (gradeDistribution['B'] || 0)) / total * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center border border-orange-200">
              <p className="text-muted-foreground text-xs">Needs Work</p>
              <p className="font-bold text-orange-600 mt-1">
                {((gradeDistribution['C'] || 0) + (gradeDistribution['D'] || 0) + (gradeDistribution['F'] || 0))}
              </p>
              <p className="text-xs text-muted-foreground">
                {(((gradeDistribution['C'] || 0) + (gradeDistribution['D'] || 0) + (gradeDistribution['F'] || 0)) / total * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

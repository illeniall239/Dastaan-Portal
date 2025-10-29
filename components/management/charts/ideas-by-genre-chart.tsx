"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

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

  return (
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
          </>
        )}
      </CardContent>
    </Card>
  );
}

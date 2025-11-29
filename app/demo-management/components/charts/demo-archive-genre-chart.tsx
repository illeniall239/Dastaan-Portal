'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Archive } from 'lucide-react';

interface ArchiveGenreData {
  genre: string;
  count: number;
}

interface DemoArchiveGenreChartProps {
  data: ArchiveGenreData[];
}

export function DemoArchiveGenreChart({ data }: DemoArchiveGenreChartProps) {
  const totalRejected = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-muted-foreground" />
              Rejected Stories by Genre
            </CardTitle>
            <CardDescription>Analysis of archived submissions</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">{totalRejected}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Total rejected</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="genre"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Bar dataKey="count" fill="#dc2626" name="Rejected Stories" />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-muted-foreground text-center">
            This chart helps identify which genres have higher rejection rates, informing content strategy decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

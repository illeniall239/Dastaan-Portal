"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface TeamVsAverageData {
  metric: string;
  team: number;
  average: number;
  fullLabel: string;
}

interface TeamVsAverageRadarProps {
  teamName: string;
  teamType: string;
  data: TeamVsAverageData[];
  title?: string;
  description?: string;
}

export function TeamVsAverageRadar({
  teamName,
  teamType,
  data,
  title,
  description,
}: TeamVsAverageRadarProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-sm text-gray-900 mb-1">
            {payload[0].payload.fullLabel}
          </p>
          <p className="text-sm text-teal-600">
            {teamName}: <span className="font-medium">{payload[0].value}</span>
          </p>
          <p className="text-sm text-gray-500">
            Type Avg: <span className="font-medium">{payload[1]?.value || 0}</span>
          </p>
          {payload[0].value > 0 && payload[1]?.value > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {payload[0].value > payload[1].value ? '+' : ''}
              {((payload[0].value - payload[1].value) / payload[1].value * 100).toFixed(1)}% vs avg
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const typeLabel = teamType.charAt(0).toUpperCase() + teamType.slice(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-teal-600" />
          {title || `${teamName} vs ${typeLabel} Team Average`}
        </CardTitle>
        <CardDescription>
          {description || `Compare performance against other ${typeLabel.toLowerCase()} teams`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No comparison data available
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={data}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'auto']}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <Radar
                  name={teamName}
                  dataKey="team"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Radar
                  name={`${typeLabel} Average`}
                  dataKey="average"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Performance Summary */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
              {data.map((item, index) => {
                const diff = item.average > 0
                  ? ((item.team - item.average) / item.average) * 100
                  : 0;
                const isAboveAverage = diff > 0;

                return (
                  <div key={index} className="text-center">
                    <p className="text-xs text-gray-500 mb-1">{item.fullLabel}</p>
                    <p className="text-lg font-semibold text-gray-900">{item.team}</p>
                    <p className={`text-xs font-medium ${
                      isAboveAverage ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {isAboveAverage ? '+' : ''}{diff.toFixed(0)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

interface EvalCriteriaRadarProps {
  criteriaAverages: {
    conflict: number;
    characterization: number;
    progression: number;
    freezes: number;
    whatsNext: number;
  };
}

export function EvalCriteriaRadar({ criteriaAverages }: EvalCriteriaRadarProps) {
  const data = [
    {
      criteria: 'Conflict',
      score: criteriaAverages.conflict,
      fullMark: 10,
    },
    {
      criteria: 'Character',
      score: criteriaAverages.characterization,
      fullMark: 10,
    },
    {
      criteria: 'Progression',
      score: criteriaAverages.progression,
      fullMark: 10,
    },
    {
      criteria: 'Freezes',
      score: criteriaAverages.freezes,
      fullMark: 10,
    },
    {
      criteria: "What's Next",
      score: criteriaAverages.whatsNext,
      fullMark: 10,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Evaluation Criteria Breakdown</CardTitle>
            <CardDescription>Average scores across all criteria</CardDescription>
          </div>
          <Target className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="criteria" fontSize={12} />
            <PolarRadiusAxis angle={90} domain={[0, 10]} fontSize={12} />
            <Radar
              name="Average Score"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {data.map((item, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded">
              <span className="text-muted-foreground">{item.criteria}:</span>
              <span className="font-bold text-blue-600">{item.score.toFixed(1)}/10</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface QualityDistributionChartProps {
  pagesDistribution: {
    belowStandard: number;
    nearStandard: number;
    standard: number;
    aboveStandard: number;
  };
  scenesDistribution: {
    belowStandard: number;
    nearStandard: number;
    standard: number;
    aboveStandard: number;
  };
}

const COLORS = {
  belowStandard: '#ef4444', // red
  nearStandard: '#f59e0b', // orange
  standard: '#10b981', // green
  aboveStandard: '#3b82f6', // blue
};

export function QualityDistributionChart({ pagesDistribution, scenesDistribution }: QualityDistributionChartProps) {
  const pagesData = [
    { name: 'Below Standard (<40)', value: pagesDistribution.belowStandard, color: COLORS.belowStandard },
    { name: 'Near Standard (40-44)', value: pagesDistribution.nearStandard, color: COLORS.nearStandard },
    { name: 'Standard (45-50)', value: pagesDistribution.standard, color: COLORS.standard },
    { name: 'Above Standard (>50)', value: pagesDistribution.aboveStandard, color: COLORS.aboveStandard },
  ].filter(item => item.value > 0);

  const scenesData = [
    { name: 'Below Standard (<20)', value: scenesDistribution.belowStandard, color: COLORS.belowStandard },
    { name: 'Near Standard (20-21)', value: scenesDistribution.nearStandard, color: COLORS.nearStandard },
    { name: 'Standard (22-25)', value: scenesDistribution.standard, color: COLORS.standard },
    { name: 'Above Standard (>25)', value: scenesDistribution.aboveStandard, color: COLORS.aboveStandard },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Episode Quality Distribution</CardTitle>
            <CardDescription>Pages and scenes comparison to standards</CardDescription>
          </div>
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pages Distribution */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-center">Pages Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pagesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pagesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-xs">
              {pagesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scenes Distribution */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-center">Scenes Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={scenesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {scenesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-xs">
              {scenesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

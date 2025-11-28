'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, Clock } from 'lucide-react';

interface DemoPipelineOverviewCardsProps {
  totalStories: number;
  activePipeline: number;
  avgTimeToCompletion: number;
}

export function DemoPipelineOverviewCards({
  totalStories,
  activePipeline,
  avgTimeToCompletion,
}: DemoPipelineOverviewCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">
            Total Stories
          </CardTitle>
          <FileText className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{totalStories}</div>
          <p className="text-xs text-blue-700 mt-1">
            All submissions in system
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-900">
            Active Pipeline
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900">{activePipeline}</div>
          <p className="text-xs text-green-700 mt-1">
            {totalStories > 0 ? ((activePipeline / totalStories) * 100).toFixed(0) : 0}% of total stories
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-orange-900">
            Avg Time to Completion
          </CardTitle>
          <Clock className="h-5 w-5 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-900">{avgTimeToCompletion}</div>
          <p className="text-xs text-orange-700 mt-1">
            Days from submission
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

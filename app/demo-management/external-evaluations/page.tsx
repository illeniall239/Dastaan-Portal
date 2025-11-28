'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, TrendingUp, Clock, Award } from 'lucide-react';
import { dummyEvaluators } from '../lib/dummy-data';

export default function ExternalEvaluationsPage() {
  const externalEvaluators = dummyEvaluators.filter((e) => e.type === 'external');
  const avgEvaluations =
    externalEvaluators.reduce((sum, e) => sum + e.evaluations_completed, 0) /
    externalEvaluators.length;
  const avgScore =
    externalEvaluators.reduce((sum, e) => sum + e.avg_score_given, 0) /
    externalEvaluators.length;
  const avgResponseTime =
    externalEvaluators.reduce((sum, e) => sum + e.response_time_hours, 0) /
    externalEvaluators.length;

  const chartData = externalEvaluators.map((e) => ({
    name: e.name,
    'Evaluations': e.evaluations_completed,
    'Avg Score': e.avg_score_given,
    'Response Time (hrs)': e.response_time_hours,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">External Evaluators</h1>
        <p className="text-muted-foreground mt-1">
          Performance and activity of external content evaluators
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{externalEvaluators.length}</div>
            <p className="text-xs text-muted-foreground">
              {externalEvaluators.filter((e) => e.active).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Evaluations</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEvaluations.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Per evaluator</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score Given</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore.toFixed(1)}/10</div>
            <p className="text-xs text-muted-foreground">Average rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime.toFixed(0)}h</div>
            <p className="text-xs text-muted-foreground">Average hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluator Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={100} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 10]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Evaluations" fill="#f97316" />
              <Bar yAxisId="right" dataKey="Avg Score" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Evaluator Details */}
      <div className="grid gap-6">
        {externalEvaluators.map((evaluator) => (
          <Card key={evaluator.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    {evaluator.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {evaluator.position}
                  </p>
                </div>
                <Badge variant={evaluator.active ? 'default' : 'secondary'}>
                  {evaluator.active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Evaluations Completed</p>
                  <p className="text-2xl font-bold">{evaluator.evaluations_completed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Avg Score Given</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {evaluator.avg_score_given.toFixed(1)}/10
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {evaluator.response_time_hours}h
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Evaluation Type</p>
                  <p className="text-lg font-medium">External</p>
                </div>
              </div>

              {/* Specializations */}
              <div>
                <h3 className="font-semibold mb-2 text-sm">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {evaluator.specialization.map((spec) => (
                    <Badge key={spec} variant="outline">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-muted-foreground">Performance Rating</span>
                <div className="flex items-center gap-2">
                  {evaluator.avg_score_given >= 8 && evaluator.response_time_hours <= 48 && (
                    <>
                      <Badge variant="default" className="bg-green-600">
                        Excellent
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        High quality, fast response
                      </span>
                    </>
                  )}
                  {evaluator.avg_score_given >= 7 &&
                    evaluator.avg_score_given < 8 &&
                    evaluator.response_time_hours <= 48 && (
                      <>
                        <Badge variant="default" className="bg-blue-600">
                          Good
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Consistent quality
                        </span>
                      </>
                    )}
                  {evaluator.response_time_hours > 48 && (
                    <>
                      <Badge variant="outline" className="border-orange-600 text-orange-600">
                        Slow Response
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Consider follow-up
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

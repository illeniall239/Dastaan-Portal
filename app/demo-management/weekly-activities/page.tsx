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
import {
  FileText,
  CheckCircle,
  DollarSign,
  Film,
  TrendingUp,
} from 'lucide-react';
import { dummyActivities } from '../lib/dummy-data';

export default function WeeklyActivitiesPage() {
  // Group activities by type
  const activityCounts = dummyActivities.reduce((acc, activity) => {
    acc[activity.type] = (acc[activity.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const activityChartData = [
    { activity: 'Stories Submitted', count: activityCounts.story_submitted || 0 },
    { activity: 'Evaluations', count: activityCounts.evaluation_completed || 0 },
    { activity: 'Approvals', count: activityCounts.approval_granted || 0 },
    { activity: 'Contracts Signed', count: activityCounts.contract_signed || 0 },
    { activity: 'Payments Made', count: activityCounts.payment_made || 0 },
    { activity: 'Episodes Completed', count: activityCounts.episode_completed || 0 },
  ];

  // Weekly trend data
  const weeklyTrendData = [
    { week: 'Week 1', activities: 6 },
    { week: 'Week 2', activities: 8 },
    { week: 'Week 3', activities: 5 },
    { week: 'Week 4', activities: 8 },
  ];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Activities</h1>
        <p className="text-muted-foreground mt-1">
          Recent activities and workflow progress
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyActivities.length}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stories Submitted</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {activityCounts.story_submitted || 0}
            </div>
            <p className="text-xs text-muted-foreground">New submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluations Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activityCounts.evaluation_completed || 0}
            </div>
            <p className="text-xs text-muted-foreground">Evaluations done</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Distribution by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="activity" angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="activities" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activities Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dummyActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 pb-4 border-b last:border-0"
              >
                <div className="mt-1 flex-shrink-0">
                  {activity.type === 'story_submitted' && (
                    <div className="bg-blue-100 dark:bg-blue-950 p-2 rounded-full">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  {activity.type === 'evaluation_completed' && (
                    <div className="bg-green-100 dark:bg-green-950 p-2 rounded-full">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  )}
                  {activity.type === 'approval_granted' && (
                    <div className="bg-emerald-100 dark:bg-emerald-950 p-2 rounded-full">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    </div>
                  )}
                  {activity.type === 'contract_signed' && (
                    <div className="bg-purple-100 dark:bg-purple-950 p-2 rounded-full">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                  )}
                  {activity.type === 'payment_made' && (
                    <div className="bg-amber-100 dark:bg-amber-950 p-2 rounded-full">
                      <DollarSign className="h-4 w-4 text-amber-600" />
                    </div>
                  )}
                  {activity.type === 'episode_completed' && (
                    <div className="bg-orange-100 dark:bg-orange-950 p-2 rounded-full">
                      <Film className="h-4 w-4 text-orange-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{activity.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>
                      {activity.user}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(activity.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{activity.related_item_id}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

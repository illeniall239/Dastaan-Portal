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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { dummyStories, dummyTeams } from '../lib/dummy-data';

const COLORS = ['#f97316', '#06b6d4', '#8b5cf6', '#ec4899', '#10b981'];

export default function PipelineValuePage() {
  // Budget by status
  const budgetByStatus = [
    {
      status: 'In Production',
      value: dummyStories
        .filter((s) => s.status === 'in_production')
        .reduce((sum, s) => sum + s.budget_estimate, 0) / 1000000,
    },
    {
      status: 'Contracted',
      value: dummyStories
        .filter((s) => s.status === 'contracted')
        .reduce((sum, s) => sum + s.budget_estimate, 0) / 1000000,
    },
    {
      status: 'Approved',
      value: dummyStories
        .filter((s) => s.status === 'approved')
        .reduce((sum, s) => sum + s.budget_estimate, 0) / 1000000,
    },
    {
      status: 'In Evaluation',
      value: dummyStories
        .filter((s) => s.status === 'in_evaluation')
        .reduce((sum, s) => sum + s.budget_estimate, 0) / 1000000,
    },
    {
      status: 'Submitted',
      value: dummyStories
        .filter((s) => s.status === 'submitted')
        .reduce((sum, s) => sum + s.budget_estimate, 0) / 1000000,
    },
  ];

  // Budget by team
  const budgetByTeam = dummyTeams.map((team) => ({
    name: team.name,
    budget: team.total_budget_managed / 1000000,
  }));

  // Budget by genre
  const genreMap = new Map<string, number>();
  dummyStories.forEach((story) => {
    story.genre.forEach((g) => {
      genreMap.set(g, (genreMap.get(g) || 0) + story.budget_estimate);
    });
  });
  const budgetByGenre = Array.from(genreMap.entries())
    .map(([name, value]) => ({ name, value: value / 1000000 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Total calculations
  const totalPipeline = dummyStories.reduce((sum, s) => sum + s.budget_estimate, 0);
  const activeBudget = dummyStories
    .filter((s) => ['in_production', 'contracted'].includes(s.status))
    .reduce((sum, s) => sum + s.budget_estimate, 0);
  const potentialBudget = dummyStories
    .filter((s) => ['approved', 'in_evaluation', 'submitted'].includes(s.status))
    .reduce((sum, s) => sum + s.budget_estimate, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pipeline Value</h1>
        <p className="text-muted-foreground mt-1">
          Financial overview of all content in the pipeline
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalPipeline / 1000000).toFixed(1)}M PKR
            </div>
            <p className="text-xs text-muted-foreground">
              Across {dummyStories.length} stories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(activeBudget / 1000000).toFixed(1)}M PKR
            </div>
            <p className="text-xs text-muted-foreground">
              {dummyStories.filter((s) =>
                ['in_production', 'contracted'].includes(s.status)
              ).length}{' '}
              projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Value</CardTitle>
            <Minus className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(potentialBudget / 1000000).toFixed(1)}M PKR
            </div>
            <p className="text-xs text-muted-foreground">
              {dummyStories.filter((s) =>
                ['approved', 'in_evaluation', 'submitted'].includes(s.status)
              ).length}{' '}
              projects
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget Distribution by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" angle={-15} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Million PKR', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}M PKR`} />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget by Team</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={budgetByTeam}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, budget }) => `${name}: ${budget.toFixed(1)}M`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="budget"
                >
                  {budgetByTeam.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}M PKR`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget by Genre</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={budgetByGenre} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" label={{ value: 'Million PKR', position: 'insideBottom', offset: -5 }} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value) => `${Number(value).toFixed(1)}M PKR`} />
              <Bar dataKey="value" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed List */}
      <Card>
        <CardHeader>
          <CardTitle>All Stories by Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dummyStories
              .sort((a, b) => b.budget_estimate - a.budget_estimate)
              .map((story) => (
                <div
                  key={story.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">
                        {story.title}
                      </h3>
                      <Badge variant="outline">{story.status.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {story.team} • {story.episode_count} episodes
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {(story.budget_estimate / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-xs text-muted-foreground">PKR</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, FileText } from 'lucide-react';
import { dummyStories } from '../lib/dummy-data';
import { useState } from 'react';

export default function StoryBankPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter stories based on search
  const filteredStories = dummyStories.filter((story) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      story.title.includes(query) ||
      story.writer.includes(query) ||
      story.logline.includes(query) ||
      story.genre.some((g) => g.toLowerCase().includes(query)) ||
      story.team.toLowerCase().includes(query) ||
      story.content_creator.includes(query)
    );
  });

  // Group stories by status
  const storiesByStatus = {
    in_production: filteredStories.filter((s) => s.status === 'in_production'),
    contracted: filteredStories.filter((s) => s.status === 'contracted'),
    approved: filteredStories.filter((s) => s.status === 'approved'),
    in_evaluation: filteredStories.filter((s) => s.status === 'in_evaluation'),
    submitted: filteredStories.filter((s) => s.status === 'submitted'),
    completed: filteredStories.filter((s) => s.status === 'completed'),
    rejected: filteredStories.filter((s) => s.status === 'rejected'),
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Story Bank</h1>
        <p className="text-muted-foreground mt-1">
          Complete repository of all submitted stories
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dummyStories.length}</div>
            <p className="text-xs text-muted-foreground">All submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {storiesByStatus.in_production.length +
                storiesByStatus.contracted.length +
                storiesByStatus.approved.length}
            </div>
            <p className="text-xs text-muted-foreground">In production or approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {storiesByStatus.completed.length}
            </div>
            <p className="text-xs text-muted-foreground">Finished productions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                ((storiesByStatus.approved.length +
                  storiesByStatus.contracted.length +
                  storiesByStatus.in_production.length +
                  storiesByStatus.completed.length) /
                  dummyStories.length) *
                100
              ).toFixed(0)}
              %
            </div>
            <p className="text-xs text-muted-foreground">Approval rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Stories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, writer, genre, team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-2">
              Found {filteredStories.length} stories matching &quot;{searchQuery}&quot;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stories by Status */}
      {Object.entries(storiesByStatus).map(([status, stories]) => {
        if (stories.length === 0) return null;

        const statusConfig = {
          in_production: { label: 'In Production', color: 'default' },
          contracted: { label: 'Contracted', color: 'secondary' },
          approved: { label: 'Approved', color: 'outline' },
          in_evaluation: { label: 'In Evaluation', color: 'outline' },
          submitted: { label: 'Submitted', color: 'outline' },
          completed: { label: 'Completed', color: 'default' },
          rejected: { label: 'Rejected', color: 'destructive' },
        };

        const config = statusConfig[status as keyof typeof statusConfig];

        return (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {config.label}
                <Badge variant="outline">{stories.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          {story.title}
                        </h3>
                        <Badge variant="outline">{story.id}</Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {story.logline}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {story.genre.map((g) => (
                          <Badge key={g} variant="secondary">
                            {g}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-sm pt-2 border-t">
                        <div>
                          <span className="text-muted-foreground">Writer: </span>
                          <span className="font-medium">
                            {story.writer}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Director: </span>
                          <span className="font-medium">
                            {story.director}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Team: </span>
                          <span className="font-medium">{story.team}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Episodes: </span>
                          <span className="font-medium">{story.episode_count}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4 space-y-2">
                      {story.overall_rating && (
                        <div>
                          <p className="text-2xl font-bold">{story.overall_rating.toFixed(1)}</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                      )}
                      {story.status === 'in_evaluation' && (
                        <Badge variant="outline" className="text-xs">
                          {story.evaluations_completed}/{story.evaluations_total} evals
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Film, Calendar, DollarSign, Users } from 'lucide-react';
import { dummyStories, dummyEpisodes } from '../lib/dummy-data';

export default function ActiveProjectsPage() {
  const activeProjects = dummyStories.filter((s) =>
    ['in_production', 'contracted', 'approved'].includes(s.status)
  );

  const getProjectProgress = (storyId: string) => {
    const episodes = dummyEpisodes.filter((e) => e.story_id === storyId);
    if (episodes.length === 0) return 0;
    const completedEpisodes = episodes.filter(
      (e) => e.status === 'completed' || e.status === 'aired'
    ).length;
    return (completedEpisodes / episodes.length) * 100;
  };

  const getProjectStats = (storyId: string) => {
    const episodes = dummyEpisodes.filter((e) => e.story_id === storyId);
    return {
      total: episodes.length,
      completed: episodes.filter((e) => e.status === 'completed' || e.status === 'aired').length,
      inProgress: episodes.filter((e) =>
        ['shooting', 'post_production', 'pre_production'].includes(e.status)
      ).length,
    };
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Active Projects</h1>
        <p className="text-muted-foreground mt-1">
          {activeProjects.length} projects currently in development
        </p>
      </div>

      <div className="grid gap-6">
        {activeProjects.map((project) => {
          const progress = getProjectProgress(project.id);
          const stats = getProjectStats(project.id);

          return (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      {project.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {project.id}
                    </p>
                  </div>
                  <Badge
                    variant={
                      project.status === 'in_production'
                        ? 'default'
                        : project.status === 'contracted'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-sm px-3 py-1"
                  >
                    {project.status === 'in_production'
                      ? 'In Production'
                      : project.status === 'contracted'
                      ? 'Contracted'
                      : 'Approved'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Writer</p>
                    <p className="font-medium text-sm">
                      {project.writer}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Director</p>
                    <p className="font-medium text-sm">
                      {project.director}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="font-medium text-sm">{project.team}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Content Creator</p>
                    <p className="font-medium text-sm">
                      {project.content_creator}
                    </p>
                  </div>
                </div>

                {/* Logline */}
                <div>
                  <p className="text-sm text-muted-foreground">
                    {project.logline}
                  </p>
                </div>

                {/* Genre Tags */}
                <div className="flex flex-wrap gap-2">
                  {project.genre.map((g) => (
                    <Badge key={g} variant="outline">
                      {g}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Episodes</p>
                      <p className="text-sm font-medium">
                        {stats.completed}/{stats.total}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Days Active</p>
                      <p className="text-sm font-medium">{project.days_active}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium">
                        {(project.budget_estimate / 1000000).toFixed(1)}M PKR
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <p className="text-sm font-medium">
                        {project.overall_rating ? `${project.overall_rating}/10` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                {stats.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Production Progress</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{stats.completed} completed</span>
                      <span>{stats.inProgress} in progress</span>
                      <span>
                        {stats.total - stats.completed - stats.inProgress} pending
                      </span>
                    </div>
                  </div>
                )}

                {/* Production Dates */}
                {project.production_start && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                    <span>
                      Started:{' '}
                      {new Date(project.production_start).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {project.production_end && (
                      <span>
                        Ended:{' '}
                        {new Date(project.production_end).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

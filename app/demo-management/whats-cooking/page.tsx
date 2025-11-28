'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Clock, Users, TrendingUp } from 'lucide-react';
import { dummyStories, dummyEpisodes } from '../lib/dummy-data';

export default function WhatsCookingPage() {
  // Get stories that are in active development (in_production or contracted)
  const activeStories = dummyStories.filter((s) =>
    ['in_production', 'contracted'].includes(s.status)
  );

  // Calculate production progress for each story
  const storiesWithProgress = activeStories.map((story) => {
    const episodes = dummyEpisodes.filter((e) => e.story_id === story.id);
    const completedEpisodes = episodes.filter(
      (e) => e.status === 'completed' || e.status === 'aired'
    ).length;
    const progress = episodes.length > 0 ? (completedEpisodes / episodes.length) * 100 : 0;

    return {
      ...story,
      episodes,
      completedEpisodes,
      progress,
      episodesInProduction: episodes.filter((e) =>
        ['shooting', 'post_production', 'pre_production'].includes(e.status)
      ).length,
    };
  }).sort((a, b) => b.progress - a.progress);

  const totalEpisodesInProduction = storiesWithProgress.reduce(
    (sum, s) => sum + s.episodes.length,
    0
  );
  const totalCompletedEpisodes = storiesWithProgress.reduce(
    (sum, s) => sum + s.completedEpisodes,
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          What&apos;s Cooking
        </h1>
        <p className="text-muted-foreground mt-1">
          Active drama productions and their current status
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Productions</CardTitle>
            <Flame className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {activeStories.length}
            </div>
            <p className="text-xs text-muted-foreground">Dramas in production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Episodes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEpisodesInProduction}</div>
            <p className="text-xs text-muted-foreground">In production pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stories Approved</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalCompletedEpisodes}
            </div>
            <p className="text-xs text-muted-foreground">Approved for production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalEpisodesInProduction > 0
                ? ((totalCompletedEpisodes / totalEpisodesInProduction) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Productions */}
      <div className="grid gap-6">
        {storiesWithProgress.map((story) => {
          const statusPhases = {
            completed: story.episodes.filter((e) => e.status === 'completed').length,
            post_production: story.episodes.filter((e) => e.status === 'post_production')
              .length,
            shooting: story.episodes.filter((e) => e.status === 'shooting').length,
            pre_production: story.episodes.filter((e) => e.status === 'pre_production')
              .length,
            script_writing: story.episodes.filter((e) => e.status === 'script_writing')
              .length,
          };

          return (
            <Card key={story.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <Flame className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-xl">
                        {story.title}
                      </CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{story.id}</p>
                  </div>
                  <Badge
                    variant={story.status === 'in_production' ? 'default' : 'secondary'}
                    className="text-sm px-3 py-1"
                  >
                    {story.status === 'in_production' ? 'In Production' : 'Contracted'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Writer</p>
                    <p className="font-medium text-sm">
                      {story.writer}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Director</p>
                    <p className="font-medium text-sm">
                      {story.director}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Team</p>
                    <p className="font-medium text-sm">{story.team}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Rating</p>
                    <p className="font-medium text-sm">
                      {story.overall_rating ? `${story.overall_rating}/10` : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Production Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Production Progress</span>
                    <span className="font-medium">
                      {story.completedEpisodes}/{story.episodes.length} episodes completed
                    </span>
                  </div>
                  <Progress value={story.progress} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{story.progress.toFixed(0)}% complete</span>
                    <span>{story.episodesInProduction} in active production</span>
                  </div>
                </div>

                {/* Episode Status Breakdown */}
                <div className="space-y-2 pt-2 border-t">
                  <h3 className="font-semibold text-sm">Episode Status Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-lg font-bold text-green-600">
                        {statusPhases.completed}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Post Production</p>
                      <p className="text-lg font-bold text-blue-600">
                        {statusPhases.post_production}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Shooting</p>
                      <p className="text-lg font-bold text-orange-600">
                        {statusPhases.shooting}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Pre Production</p>
                      <p className="text-lg font-bold text-purple-600">
                        {statusPhases.pre_production}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 dark:bg-slate-950/20 rounded-lg">
                      <p className="text-xs text-muted-foreground">Script Writing</p>
                      <p className="text-lg font-bold text-slate-600">
                        {statusPhases.script_writing}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 gap-4 pt-2 border-t">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Days in Production</p>
                    <p className="text-sm font-medium">{story.days_active} days</p>
                  </div>
                </div>

                {story.production_start && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Production started:{' '}
                    {new Date(story.production_start).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

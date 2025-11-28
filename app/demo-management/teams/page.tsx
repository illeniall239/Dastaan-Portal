'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, DollarSign, FileText } from 'lucide-react';
import { dummyTeams, dummyStories } from '../lib/dummy-data';

export default function TeamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Performance</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all content development teams
        </p>
      </div>

      <div className="grid gap-6">
        {dummyTeams.map((team) => {
          const teamStories = dummyStories.filter((s) =>
            team.stories.includes(s.id)
          );

          return (
            <Card key={team.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{team.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Team Lead: {team.lead}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {team.avg_evaluation_score.toFixed(1)}/10
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Team Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Team Members</span>
                    </div>
                    <p className="text-2xl font-bold">{team.members.length}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Active Projects</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {team.active_projects}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">Completed</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {team.completed_projects}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm">Budget Managed</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {(team.total_budget_managed / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h3 className="font-semibold mb-3">Team Members</h3>
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((member) => (
                      <Badge key={member} variant="secondary">
                        {member}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Active Stories */}
                <div>
                  <h3 className="font-semibold mb-3">Active Stories</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {teamStories
                      .filter((s) =>
                        ['in_production', 'contracted', 'approved', 'in_evaluation'].includes(
                          s.status
                        )
                      )
                      .map((story) => (
                        <div
                          key={story.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium">
                              {story.title}
                            </h4>
                            <Badge
                              variant={
                                story.status === 'in_production'
                                  ? 'default'
                                  : story.status === 'contracted'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {story.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>
                              {story.writer}
                            </span>
                            {story.overall_rating && (
                              <span className="font-medium text-foreground">
                                {story.overall_rating}/10
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{story.episode_count} Episodes</span>
                            <span>
                              {(story.budget_estimate / 1000000).toFixed(1)}M PKR
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEvaluatorTeam, getTeamMembers, getTeamWorkItems } from '@/lib/evaluations/team';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, ClipboardList, Mail } from 'lucide-react';
import Link from 'next/link';

export default async function EvaluatorTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const team = await getEvaluatorTeam();
    const members = await getTeamMembers(team.id);
    const workItems = await getTeamWorkItems(team.id);

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your team and track their work
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/evaluator/team/request-change">
              <Mail className="mr-2 h-4 w-4" />
              Request Team Change
            </Link>
          </Button>
        </div>

        {/* Team Overview */}
        <Card>
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
            <CardDescription>
              Team Lead: {team.team_head?.name} • {members.length} members
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{workItems.stories.length}</div>
                <div className="text-sm text-muted-foreground">Active Stories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{workItems.callReports.length}</div>
                <div className="text-sm text-muted-foreground">One-liners</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{workItems.evaluations.length}</div>
                <div className="text-sm text-muted-foreground">Evaluations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Members with Work Items */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Team Members</h2>
          {members.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No team members assigned yet. Request to add members using the button above.
              </CardContent>
            </Card>
          ) : (
            members.map((member) => {
              const memberStories = workItems.stories.filter(s => s.created_by === member.id);
              const memberEvaluations = workItems.evaluations.filter(e => e.evaluator_id === member.id);

              return (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <CardDescription>
                          {member.position || member.role} • {member.email}
                        </CardDescription>
                      </div>
                      <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                        {member.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Member's Stories */}
                    {memberStories.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2 flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          Stories
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {memberStories.map(story => (
                            <li key={story.id} className="flex items-center justify-between">
                              <Link
                                href={`/content-department/stories/${story.id}`}
                                className="hover:underline truncate"
                              >
                                {story.title}
                              </Link>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {story.status}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Member's Evaluations */}
                    {memberEvaluations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Evaluations
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {memberEvaluations.map(evaluation => (
                            <li key={evaluation.id} className="flex items-center justify-between">
                              <span className="truncate">
                                {evaluation.story?.title || 'Untitled Story'}
                              </span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {evaluation.status}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* No work items */}
                    {memberStories.length === 0 && memberEvaluations.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No active work items</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading team data:', error);
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Unable to load team data. You may not have a team assigned yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Please contact an administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
}

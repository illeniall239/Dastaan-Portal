import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEvaluatorTeam, getTeamMembers, getTeamWorkItems } from '@/lib/evaluations/team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Star, Clock, Film } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

function getRatingColor(rating: number) {
  if (rating >= 9) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (rating >= 7) return 'bg-green-100 text-green-800 border-green-200';
  if (rating >= 4) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

function formatCategory(category: string | null) {
  if (!category) return null;
  const map: Record<string, string> = {
    external_producer: 'External Producer',
    writer_pitch: 'Writer Pitch',
    inhouse_content: 'In-house Content',
    content_head_initiative: 'Content Head Initiative',
    given_by_management: 'Given by Management',
  };
  return map[category] || category;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

    const totalReports = workItems.callReports.length;

    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div className="flex flex-col gap-4 sm:gap-6 w-full lg:w-auto">
            <BackButton fallbackHref="/evaluator" variant="outline" size="sm" className="w-fit" />
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Team Activity</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {team.name} — see what your team has been working on
              </p>
            </div>
          </div>
        </div>

        {/* Team Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{members.length}</p>
                  <p className="text-sm text-muted-foreground">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalReports}</p>
                  <p className="text-sm text-muted-foreground">One-Liners Logged</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-Member Activity */}
        <div className="space-y-8">
          {members.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No team members assigned yet. Request to add members using the button above.
              </CardContent>
            </Card>
          ) : (
            members.map((member) => {
              const memberReports = workItems.callReports.filter(cr => cr.created_by === member.id);

              return (
                <div key={member.id} className="space-y-3">
                  {/* Member Header */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#224794] flex items-center justify-center text-white font-semibold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{member.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {member.position || member.role} — {memberReports.length} one-liner{memberReports.length !== 1 ? 's' : ''} logged
                      </p>
                    </div>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="ml-auto">
                      {member.status}
                    </Badge>
                  </div>

                  {/* Call Report Cards */}
                  {memberReports.length === 0 ? (
                    <Card>
                      <CardContent className="py-6 text-center text-sm text-muted-foreground italic">
                        No one-liners logged yet
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {memberReports.map(cr => (
                        <Card key={cr.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <CardTitle className="text-base">
                                    {cr.working_title || 'Untitled'}
                                  </CardTitle>
                                  {cr.call_report_id && (
                                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                      {cr.call_report_id}
                                    </Badge>
                                  )}
                                </div>
                                {cr.logline && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {cr.logline}
                                  </p>
                                )}
                              </div>
                              {/* Initial Assessment Score */}
                              {cr.overall_rating != null && (
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-sm font-bold shrink-0 ${getRatingColor(cr.overall_rating)}`}>
                                  <Star className="h-3.5 w-3.5" />
                                  {cr.overall_rating}/10
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-3">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                              {cr.category && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Source</span>
                                  <p className="font-medium truncate">{formatCategory(cr.category)}</p>
                                </div>
                              )}
                              {cr.genre && cr.genre.length > 0 && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Genre</span>
                                  <p className="font-medium truncate">{cr.genre.join(', ')}</p>
                                </div>
                              )}
                              {cr.content_type && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Content Type</span>
                                  <p className="font-medium">{cr.content_type}</p>
                                </div>
                              )}
                              {cr.slot && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Target Slot</span>
                                  <p className="font-medium">{cr.slot}</p>
                                </div>
                              )}
                            </div>

                            {/* Additional Notes */}
                            {cr.remarks && (
                              <div className="text-sm">
                                <span className="text-muted-foreground text-xs">Additional Notes</span>
                                <p className="text-gray-700 line-clamp-3">{cr.remarks}</p>
                              </div>
                            )}

                            {/* Next Steps */}
                            {cr.next_steps && (
                              <div className="text-sm">
                                <span className="text-muted-foreground text-xs">Next Steps</span>
                                <p className="text-gray-700 line-clamp-3">{cr.next_steps}</p>
                              </div>
                            )}

                            {/* Episodes */}
                            {cr.episodes.length > 0 && (
                              <div className="text-sm">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Film className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground text-xs">
                                    {cr.episodes.length} Episode{cr.episodes.length !== 1 ? 's' : ''} Linked
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {cr.episodes.map(ep => (
                                    <Badge key={ep.id} variant="secondary" className="text-xs">
                                      Ep {ep.episode_number}{ep.title ? `: ${ep.title}` : ''}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground border-t">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(cr.meeting_date)}</span>
                              {cr.status && (
                                <>
                                  <span className="mx-1">·</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {cr.status.replace(/_/g, ' ')}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
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

import { createClient } from '@/lib/supabase/server';

// Type definitions for team work items
type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  position: string | null;
  department: string | null;
  status: string | null;
  created_at: string;
};

type TeamStory = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  created_by: string;
  creator: { name: string } | null;
};

type TeamCallReport = {
  id: string;
  report_title: string | null;
  meeting_date: string;
  created_by: string;
  creator: { name: string } | null;
};

type TeamEvaluation = {
  id: string;
  status: string;
  created_at: string;
  evaluator_id: string;
  evaluator: { name: string } | null;
  story: { id: string; title: string } | null;
};

export type TeamWorkItems = {
  stories: TeamStory[];
  callReports: TeamCallReport[];
  evaluations: TeamEvaluation[];
};

export async function getEvaluatorTeam() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Get the team where current user is team head
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      team_type,
      created_at,
      updated_at,
      team_head:users!team_head_id(id, name, email)
    `)
    .eq('team_head_id', user.id)
    .single();

  if (teamError) throw teamError;
  
  // Transform team_head from array to single object (Supabase returns arrays for joins)
  return {
    ...team,
    team_head: Array.isArray(team.team_head) ? team.team_head[0] || null : team.team_head
  };
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from('users')
    .select('id, name, email, role, position, department, status, created_at')
    .eq('team_id', teamId)
    .order('name');

  if (error) throw error;
  return members;
}

export async function getTeamWorkItems(teamId: string): Promise<TeamWorkItems> {
  const supabase = await createClient();

  // Get team members first
  const members = await getTeamMembers(teamId);
  const memberIds = members.map(m => m.id);

  // Get stories assigned to this team
  const { data: stories } = await supabase
    .from('stories')
    .select('id, title, status, created_at, created_by, creator:users!created_by(name)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  // Get call reports for this team
  const { data: callReports } = await supabase
    .from('call_reports')
    .select('id, report_title, meeting_date, created_by, creator:users!created_by(name)')
    .eq('team_id', teamId)
    .order('meeting_date', { ascending: false });

  // Get active evaluations assigned to team members
  const { data: evaluations } = memberIds.length > 0 ? await supabase
    .from('evaluator_forms')
    .select(`
      id,
      status,
      created_at,
      evaluator_id,
      evaluator:users!evaluator_id(name),
      story:stories!story_id(id, title)
    `)
    .in('evaluator_id', memberIds)
    .order('created_at', { ascending: false }) : { data: [] };

  // Transform nested arrays to single objects (Supabase returns arrays for joins)
  const transformedStories: TeamStory[] = (stories || []).map(s => ({
    id: s.id,
    title: s.title,
    status: s.status,
    created_at: s.created_at,
    created_by: s.created_by,
    creator: Array.isArray(s.creator) ? s.creator[0] || null : s.creator
  }));

  const transformedCallReports: TeamCallReport[] = (callReports || []).map(cr => ({
    id: cr.id,
    report_title: cr.report_title,
    meeting_date: cr.meeting_date,
    created_by: cr.created_by,
    creator: Array.isArray(cr.creator) ? cr.creator[0] || null : cr.creator
  }));

  const transformedEvaluations: TeamEvaluation[] = (evaluations || []).map(e => ({
    id: e.id,
    status: e.status,
    created_at: e.created_at,
    evaluator_id: e.evaluator_id,
    evaluator: Array.isArray(e.evaluator) ? e.evaluator[0] || null : e.evaluator,
    story: Array.isArray(e.story) ? e.story[0] || null : e.story
  }));

  return {
    stories: transformedStories,
    callReports: transformedCallReports,
    evaluations: transformedEvaluations,
  };
}

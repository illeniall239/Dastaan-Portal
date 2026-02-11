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

type TeamCallReport = {
  id: string;
  call_report_id: string | null;
  working_title: string | null;
  logline: string | null;
  category: string | null;
  genre: string[] | null;
  content_type: string | null;
  slot: string | null;
  remarks: string | null;
  next_steps: string | null;
  overall_rating: number | null;
  meeting_date: string;
  status: string | null;
  created_by: string;
  creator: { name: string } | null;
  episodes: { id: string; episode_number: number; title: string | null }[];
};

export type TeamWorkItems = {
  callReports: TeamCallReport[];
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

  // Get call reports for this team with rich fields
  const { data: callReports } = await supabase
    .from('call_reports')
    .select(`
      id, call_report_id, working_title, logline, category,
      genre, content_type, slot, remarks, next_steps,
      overall_rating, meeting_date, status,
      created_by, creator:users!created_by(name)
    `)
    .eq('team_id', teamId)
    .order('meeting_date', { ascending: false });

  // Get episodes linked to these call reports
  const crIds = (callReports || []).map(cr => cr.id);
  const { data: episodes } = crIds.length > 0
    ? await supabase
        .from('episodes')
        .select('id, episode_number, title, call_report_id')
        .in('call_report_id', crIds)
        .order('episode_number')
    : { data: [] };

  // Group episodes by call_report_id
  const episodesByReport = new Map<string, { id: string; episode_number: number; title: string | null }[]>();
  for (const ep of episodes || []) {
    const key = ep.call_report_id;
    if (!episodesByReport.has(key)) episodesByReport.set(key, []);
    episodesByReport.get(key)!.push({ id: ep.id, episode_number: ep.episode_number, title: ep.title });
  }

  const transformedCallReports: TeamCallReport[] = (callReports || []).map(cr => ({
    id: cr.id,
    call_report_id: cr.call_report_id,
    working_title: cr.working_title,
    logline: cr.logline,
    category: cr.category,
    genre: cr.genre,
    content_type: cr.content_type,
    slot: cr.slot,
    remarks: cr.remarks,
    next_steps: cr.next_steps,
    overall_rating: cr.overall_rating,
    meeting_date: cr.meeting_date,
    status: cr.status,
    created_by: cr.created_by,
    creator: Array.isArray(cr.creator) ? cr.creator[0] || null : cr.creator,
    episodes: episodesByReport.get(cr.id) || [],
  }));

  return {
    callReports: transformedCallReports,
  };
}

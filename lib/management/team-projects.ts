import { createAdminClient } from "@/lib/supabase/admin";

export interface TeamProjectEpisode {
  id: string;
  episode_number: number;
  title: string | null;
  approval_status: string | null;
}

export interface TeamProjectReport {
  id: string;
  call_report_id: string;
  working_title: string;
  meeting_date: string;
  evaluation_status: string | null;
  genre: string[] | null;
  category: string | null;
  target_slot: string | null;
  story_id: string | null;
  created_at: string;
  episodes: TeamProjectEpisode[];
}

export interface TeamProjectGroup {
  team_id: string;
  team_name: string;
  team_type: string;
  call_reports: TeamProjectReport[];
}

export async function getTeamProjects(): Promise<TeamProjectGroup[]> {
  const admin = createAdminClient();

  const [{ data: teams, error: teamsError }, { data: reports, error: reportsError }] =
    await Promise.all([
      admin.from("teams").select("id, name, team_type").order("name"),
      admin
        .from("call_reports")
        .select(
          `id, call_report_id, working_title, meeting_date, evaluation_status,
          genre, category, target_slot, story_id, created_at, team_id,
          episodes(id, episode_number, title, approval_status)`
        )
        .is("archived_at", null)
        .eq("meeting_type", "call_report")
        .order("meeting_date", { ascending: false }),
    ]);

  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return [];
  }
  if (reportsError) {
    console.error("Error fetching team projects:", reportsError);
  }

  // Build a map of team_id → call_reports
  const reportsByTeam: Record<string, TeamProjectReport[]> = {};
  for (const report of reports ?? []) {
    if (!report.team_id) continue;
    if (!reportsByTeam[report.team_id]) reportsByTeam[report.team_id] = [];
    reportsByTeam[report.team_id].push({
      id: report.id,
      call_report_id: report.call_report_id,
      working_title: report.working_title,
      meeting_date: report.meeting_date,
      evaluation_status: report.evaluation_status,
      genre: report.genre,
      category: report.category,
      target_slot: (report as any).target_slot ?? null,
      story_id: report.story_id,
      created_at: report.created_at,
      episodes: ((report.episodes as any[]) ?? []).sort(
        (a, b) => a.episode_number - b.episode_number
      ),
    });
  }

  // Return ALL teams (even those with no projects)
  return (teams ?? []).map((team) => ({
    team_id: team.id,
    team_name: team.name,
    team_type: team.team_type,
    call_reports: reportsByTeam[team.id] ?? [],
  }));
}

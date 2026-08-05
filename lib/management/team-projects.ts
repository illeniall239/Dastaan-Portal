import { createAdminClient } from "@/lib/supabase/admin";
import { formatTeamDisplayName, getTeamDisplayLabel } from "@/lib/management/team-display";

export interface TeamProjectEpisode {
  id: string;
  episode_number: number;
  title: string | null;
  approval_status: string | null;
  evalCompleted: number;
  evalTotal: number;
  evalStatus: "completed" | "in_progress" | "pending" | null;
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
  total_episodes: number | null;
  creator: { id: string; name: string } | null;
  scriptProgress: number | null;
  scriptStatus: "on_schedule" | "on_hold" | "behind_schedule" | null;
  scriptCurrentPhase: string | null;
  evaluatedEpisodes: number;
}

export interface TeamProjectGroup {
  team_id: string;
  team_name: string;
  team_type: string;
  call_reports: TeamProjectReport[];
  display_label: string;
}

export async function getTeamProjects(): Promise<TeamProjectGroup[]> {
  const admin = createAdminClient();

  const [{ data: allTeams, error: teamsError }, { data: reports, error: reportsError }, { data: episodicEvals }] =
    await Promise.all([
      admin.from("teams").select("id, name, team_type, team_head_id, team_head:users!teams_team_head_id_fkey(id, name, email)").order("name"),
      admin
        .from("call_reports")
        .select(
          `id, call_report_id, working_title, meeting_date, evaluation_status,
          genre, category, target_slot, story_id, created_at, team_id, total_episodes,
          creator:users!created_by(id, name),
          episodes(id, episode_number, title, approval_status),
          story:stories(
            id,
            contracts(
              id,
              script_phases(id, step_number, status, is_late)
            )
          )`
        )
        .is("archived_at", null)
        .eq("meeting_type", "call_report")
        .order("meeting_date", { ascending: false }),
      admin
        .from("episodic_evaluations")
        .select("id, episode_id"),
    ]);

  if (teamsError) {
    console.error("Error fetching teams:", teamsError);
    return [];
  }
  if (reportsError) {
    console.error("Error fetching team projects:", reportsError);
  }

  // Exclude management teams that aren't Humera's
  const teams = (allTeams ?? []).filter(
    (t) => t.team_type !== "management" || (t as any).team_head?.email === "humera.safder@geo.tv"
  );

  // Build eval counts per episode: { episode_id → count of completed evaluations }
  const evalsByEpisode: Record<string, number> = {};
  for (const ev of (episodicEvals || []) as any[]) {
    evalsByEpisode[ev.episode_id] = (evalsByEpisode[ev.episode_id] || 0) + 1;
  }

  // Build a map of team_id → call_reports
  const reportsByTeam: Record<string, TeamProjectReport[]> = {};
  for (const report of reports ?? []) {
    if (!report.team_id) continue;
    if (!reportsByTeam[report.team_id]) reportsByTeam[report.team_id] = [];

    // Compute script phase progress
    let scriptProgress: number | null = null;
    let scriptStatus: "on_schedule" | "on_hold" | "behind_schedule" | null = null;
    let scriptCurrentPhase: string | null = null;

    const story = (report as any).story;
    if (story?.contracts?.length > 0) {
      const allPhases = story.contracts.flatMap((c: any) => c.script_phases || []);
      if (allPhases.length > 0) {
        const totalSteps = 6;
        const completed = allPhases.filter(
          (p: any) => p.status === "completed" || p.status === "approved"
        ).length;
        scriptProgress = Math.round((completed / totalSteps) * 100);

        const hasDelays = allPhases.some((p: any) => p.is_late === true);
        if (hasDelays || completed === 0) {
          scriptStatus = "behind_schedule";
        } else if (completed >= 4) {
          scriptStatus = "on_schedule";
        } else {
          scriptStatus = "on_hold";
        }

        const inProgress = allPhases.find(
          (p: any) => p.status === "in_progress" || p.status === "submitted"
        );
        scriptCurrentPhase = inProgress
          ? `Step ${inProgress.step_number}/6`
          : completed === totalSteps
            ? "Completed"
            : `${completed}/6 done`;
      }
    }

    const episodes: TeamProjectEpisode[] = ((report.episodes as any[]) ?? [])
      .sort((a, b) => a.episode_number - b.episode_number)
      .map((ep) => {
        const completed = evalsByEpisode[ep.id] || 0;
        let evalStatus: TeamProjectEpisode["evalStatus"] = null;
        if (completed > 0) {
          evalStatus = "completed";
        }
        return {
          id: ep.id,
          episode_number: ep.episode_number,
          title: ep.title,
          approval_status: ep.approval_status,
          evalCompleted: completed,
          evalTotal: completed, // total assigned not tracked separately, use completed count
          evalStatus,
        };
      });

    const evaluatedEpisodes = episodes.filter((ep) => ep.evalCompleted > 0).length;

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
      episodes,
      total_episodes: (report as any).total_episodes ?? null,
      creator: (report as any).creator ?? null,
      scriptProgress,
      scriptStatus,
      scriptCurrentPhase,
      evaluatedEpisodes,
    });
  }

  // Return filtered teams with friendly display names/labels
  return teams.map((team) => {
    const teamHead = (team as any).team_head;
    return {
      team_id: team.id,
      team_name: formatTeamDisplayName(team.name, teamHead?.name),
      team_type: team.team_type,
      call_reports: reportsByTeam[team.id] ?? [],
      display_label: getTeamDisplayLabel(teamHead?.email),
    };
  });
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Star, Clock, Film, User, History } from "lucide-react";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCategory(category: string | null) {
  if (!category) return null;
  const map: Record<string, string> = {
    external_producer: "External Producer",
    writer_pitch: "Writer Pitch",
    inhouse_content: "In-house Content",
    content_head_initiative: "Content Head Initiative",
    given_by_management: "Given by Management",
  };
  return map[category] || category;
}

function scoreColor(score: number) {
  if (score >= 8) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 6) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 4) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export default async function EvaluatorTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get user's team
  const admin = createAdminClient();
  const { data: userProfile } = await admin
    .from("users")
    .select("team_id")
    .eq("id", user.id)
    .single();

  if (!userProfile?.team_id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You are not assigned to a team yet. Please contact an administrator.
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamId = userProfile.team_id;

  // Fetch team info, members, call reports, episodes, and assessments in parallel
  const [
    { data: team },
    { data: members },
    { data: callReports },
  ] = await Promise.all([
    admin.from("teams").select("id, name, team_head_id").eq("id", teamId).single(),
    admin
      .from("users")
      .select("id, name, email, role, position, status")
      .eq("team_id", teamId)
      .order("name"),
    admin
      .from("call_reports")
      .select(
        "id, call_report_id, working_title, writer_name, logline, category, genre, content_type, target_slot, meeting_date, status, created_by, created_at, overall_rating, average_initial_assessment, assessment_count"
      )
      .eq("team_id", teamId)
      .eq("meeting_type", "call_report")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const teamMembers = (members || []) as any[];
  const reports = (callReports || []) as any[];
  const memberMap = new Map(teamMembers.map((m) => [m.id, m.name]));
  const teamHead = teamMembers.find((m) => m.id === team?.team_head_id);

  // Get episodes for all call reports (linked via call_report_id FK)
  const crIds = reports.map((r) => r.id);
  const { data: episodes } = crIds.length
    ? await admin
        .from("episodes")
        .select(
          "id, call_report_id, episode_number, title, initial_assessment"
        )
        .in("call_report_id", crIds)
        .order("episode_number")
    : { data: [] };

  const allEpisodes = (episodes || []) as any[];
  const episodesByReport = new Map<string, any[]>();
  for (const ep of allEpisodes) {
    if (!ep.call_report_id) continue;
    if (!episodesByReport.has(ep.call_report_id))
      episodesByReport.set(ep.call_report_id, []);
    episodesByReport.get(ep.call_report_id)!.push(ep);
  }

  // Get call report revisions
  const { data: revisions } = crIds.length
    ? await admin
        .from("call_report_revisions")
        .select("call_report_id, revision_number, comment, created_at, original_submission_date")
        .in("call_report_id", crIds)
        .order("revision_number", { ascending: false })
    : { data: [] };

  const revisionsByReport = new Map<string, { count: number; latest_comment: string | null; latest_date: string | null }>();
  for (const rev of revisions || []) {
    const rid = rev.call_report_id;
    if (!revisionsByReport.has(rid)) {
      revisionsByReport.set(rid, { count: 1, latest_comment: rev.comment, latest_date: rev.original_submission_date || rev.created_at });
    } else {
      revisionsByReport.get(rid)!.count++;
    }
  }

  // Get episode revisions
  const allEpisodeIds = allEpisodes.map((e) => e.id);
  const { data: episodeRevisions } = allEpisodeIds.length
    ? await admin
        .from("episode_revisions")
        .select("episode_id, revision_number, comment, created_at, original_submission_date")
        .in("episode_id", allEpisodeIds)
        .order("revision_number", { ascending: false })
    : { data: [] };

  const revisionsByEpisode = new Map<string, { count: number; latest_comment: string | null; latest_date: string | null }>();
  for (const rev of episodeRevisions || []) {
    const eid = rev.episode_id;
    if (!revisionsByEpisode.has(eid)) {
      revisionsByEpisode.set(eid, { count: 1, latest_comment: rev.comment, latest_date: rev.original_submission_date || rev.created_at });
    } else {
      revisionsByEpisode.get(eid)!.count++;
    }
  }

  // Get all initial assessments for call reports and episodes
  const allEntityIds = [...crIds, ...allEpisodes.map((e) => e.id)];
  const { data: assessments } = allEntityIds.length
    ? await admin
        .from("initial_assessments")
        .select("entity_type, entity_id, assessor_id, score")
        .in("entity_id", allEntityIds)
    : { data: [] };

  const allAssessments = (assessments || []) as any[];

  // Group assessments by entity
  const assessmentsByEntity = new Map<string, { assessor_id: string; score: number }[]>();
  for (const a of allAssessments) {
    const key = `${a.entity_type}:${a.entity_id}`;
    if (!assessmentsByEntity.has(key)) assessmentsByEntity.set(key, []);
    assessmentsByEntity.get(key)!.push({
      assessor_id: a.assessor_id,
      score: a.score,
    });
  }

  const totalEpisodes = allEpisodes.length;

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Team Activity
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {team?.name || "Your Team"} — all logged projects and assessments
        </p>
      </div>

      {/* Team Members Strip */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Team Members ({teamMembers.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm"
              >
                <div className="h-6 w-6 rounded-full bg-[#224794] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{m.name}</span>
                {m.id === team?.team_head_id && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Head
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            <span className="text-xs font-medium">One-Liners</span>
          </div>
          <p className="text-2xl font-bold">{reports.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Film className="h-4 w-4" />
            <span className="text-xs font-medium">Episodes</span>
          </div>
          <p className="text-2xl font-bold">{totalEpisodes}</p>
        </div>
        <div className="rounded-lg border bg-white p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="h-4 w-4" />
            <span className="text-xs font-medium">Assessments</span>
          </div>
          <p className="text-2xl font-bold">{allAssessments.length}</p>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Logged Projects ({reports.length})
        </h2>

        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No one-liners have been logged by the team yet.
            </CardContent>
          </Card>
        ) : (
          reports.map((cr) => {
            const crAssessments = assessmentsByEntity.get(`call_report:${cr.id}`) || [];
            const crEpisodes = episodesByReport.get(cr.id) || [];
            const crRevisions = revisionsByReport.get(cr.id);

            return (
              <Card key={cr.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {cr.working_title || "Untitled"}
                        </CardTitle>
                        {cr.call_report_id && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-mono shrink-0"
                          >
                            {cr.call_report_id}
                          </Badge>
                        )}
                        {cr.status && (
                          <Badge variant="secondary" className="text-[10px]">
                            {cr.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      {cr.logline && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {cr.logline}
                        </p>
                      )}
                    </div>
                    {/* Average Initial Assessment */}
                    {cr.average_initial_assessment != null && (
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-sm font-bold shrink-0 ${scoreColor(cr.average_initial_assessment)}`}
                      >
                        <Star className="h-3.5 w-3.5" />
                        {Number(cr.average_initial_assessment).toFixed(1)}/10
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    {cr.writer_name && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Writer
                        </span>
                        <p className="font-medium truncate">{cr.writer_name}</p>
                      </div>
                    )}
                    {cr.category && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Source
                        </span>
                        <p className="font-medium truncate">
                          {formatCategory(cr.category)}
                        </p>
                      </div>
                    )}
                    {cr.genre && cr.genre.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Genre
                        </span>
                        <p className="font-medium truncate">
                          {cr.genre.join(", ")}
                        </p>
                      </div>
                    )}
                    {cr.content_type && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Content Type
                        </span>
                        <p className="font-medium">{cr.content_type}</p>
                      </div>
                    )}
                    {cr.target_slot && (
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Target Slot
                        </span>
                        <p className="font-medium">{cr.target_slot}</p>
                      </div>
                    )}
                  </div>

                  {/* Initial Assessments for this call report */}
                  {crAssessments.length > 0 && (
                    <div className="border-t pt-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        Initial Assessments
                      </span>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {crAssessments.map((a) => (
                          <div
                            key={a.assessor_id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${scoreColor(a.score)}`}
                          >
                            <span>{memberMap.get(a.assessor_id) || "Unknown"}</span>
                            <span className="font-bold">{a.score}/10</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Episodes */}
                  {crEpisodes.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Film className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Episodes ({crEpisodes.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {crEpisodes.map((ep) => {
                          const epAssessments =
                            assessmentsByEntity.get(`episode:${ep.id}`) || [];
                          const epRevisions = revisionsByEpisode.get(ep.id);
                          return (
                            <div
                              key={ep.id}
                              className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-muted/50 text-sm"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    Ep {ep.episode_number}
                                  </Badge>
                                  {ep.title && (
                                    <span className="truncate text-muted-foreground">
                                      {ep.title}
                                    </span>
                                  )}
                                </div>
                                {epAssessments.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                                    {epAssessments.map((a) => (
                                      <span
                                        key={a.assessor_id}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${scoreColor(a.score)}`}
                                      >
                                        {memberMap.get(a.assessor_id) || "?"}: {a.score}/10
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {epAssessments.length === 0 && ep.initial_assessment != null && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium sm:ml-auto ${scoreColor(ep.initial_assessment)}`}>
                                    {ep.initial_assessment}/10
                                  </span>
                                )}
                              </div>
                              {epRevisions && epRevisions.count > 0 && (
                                <div className="flex items-center gap-1.5 ml-1">
                                  <History className="h-3 w-3 text-blue-500" />
                                  <span className="text-[11px] text-blue-600 font-medium">
                                    {epRevisions.count} revision{epRevisions.count !== 1 ? "s" : ""}
                                  </span>
                                  {epRevisions.latest_date && (
                                    <span className="text-[11px] text-blue-400">
                                      · {new Date(epRevisions.latest_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Revisions */}
                  {crRevisions && crRevisions.count > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <History className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">
                          {crRevisions.count} Revision{crRevisions.count !== 1 ? "s" : ""}
                        </span>
                        {crRevisions.latest_date && (
                          <span className="text-xs text-blue-500">
                            &middot; Latest: {new Date(crRevisions.latest_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                      {crRevisions.latest_comment && (
                        <p className="text-xs text-blue-600 line-clamp-1 ml-5">
                          {crRevisions.latest_comment}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground border-t">
                    <User className="h-3 w-3" />
                    <span>
                      Logged by{" "}
                      <span className="font-medium text-foreground">
                        {memberMap.get(cr.created_by) || "Unknown"}
                      </span>
                    </span>
                    <span className="mx-1">·</span>
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(cr.meeting_date || cr.created_at)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

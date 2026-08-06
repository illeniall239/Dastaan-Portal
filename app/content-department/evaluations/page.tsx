import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CallReportCardsGridSkeleton } from "@/components/skeletons/call-report-card-skeleton";
import { BackButton } from "@/components/ui/back-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ContentEvaluationsClient, ContentEvalStory, MemberAssessment } from "@/components/content-department/content-evaluations-client";

export const dynamic = "force-dynamic";

const ONELINER_CRITERIA = [
  { label: "Conflict of Content",  scoreKey: "conflict_of_content_score",   commentKey: "conflict_of_content_comment" },
  { label: "Characterization",     scoreKey: "characterization_score",       commentKey: "characterization_comment" },
  { label: "Story Progression",    scoreKey: "story_progression_score",      commentKey: "story_progression_comment" },
  { label: "What's Next Element",  scoreKey: "whats_next_element_score",     commentKey: "whats_next_element_comment" },
  { label: "Overall One-Liner",    scoreKey: "overall_oneliner_grade_score", commentKey: "overall_oneliner_grade_comment" },
] as const;

const EPISODIC_CRITERIA = [
  { label: "Conflict of Content",  scoreKey: "conflict_of_content_score",  commentKey: "conflict_of_content_comment" },
  { label: "Characterization",     scoreKey: "characterization_score",      commentKey: "characterization_comment" },
  { label: "Story Progression",    scoreKey: "story_progression_score",     commentKey: "story_progression_comment" },
  { label: "Main Event",           scoreKey: "main_event_score",            commentKey: "main_event_comment" },
  { label: "Small Event",          scoreKey: "small_event_score",           commentKey: "small_event_comment" },
  { label: "Dragness",             scoreKey: "dragness_score",              commentKey: "dragness_comment" },
  { label: "Freezes",              scoreKey: "freezes_score",               commentKey: "freezes_comment" },
  { label: "What's Next Element",  scoreKey: "whats_next_element_score",    commentKey: "whats_next_element_comment" },
  { label: "Overall Assessment",   scoreKey: "overall_assessment_score",    commentKey: "overall_assessment_comment" },
] as const;

export default async function ContentDepartmentEvaluationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "content_creator" && user.role !== "content_manager") {
    redirect("/permission-denied?message=Only content department users can access evaluations.&returnUrl=/content-department");
  }

  return (
    <div className="mobile-container mobile-section space-y-4 sm:space-y-6">
      <BackButton fallbackHref="/content-department" variant="outline" size="sm" className="w-fit" />

      <Suspense fallback={<CallReportCardsGridSkeleton count={3} />}>
        <EvaluationsData userId={user.id} />
      </Suspense>
    </div>
  );
}

async function EvaluationsData({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const supabase = await createClient();

  // Get current user's team
  const { data: userProfile } = await supabase
    .from("users")
    .select("team_id")
    .eq("id", userId)
    .single();

  if (!userProfile?.team_id) {
    return <ContentEvaluationsClient stories={[]} />;
  }

  const teamId = userProfile.team_id;

  // Fetch team info (head) and team members in parallel
  const [teamRes, membersRes] = await Promise.all([
    admin.from("teams").select("team_head_id, team_head:users!team_head_id(name)").eq("id", teamId).single(),
    admin.from("users").select("id, name").eq("team_id", teamId),
  ]);

  const contentHeadId = teamRes.data?.team_head_id ?? null;
  const contentHeadName = (() => {
    const th = teamRes.data?.team_head;
    if (Array.isArray(th)) return th[0]?.name || "Content Head";
    return (th as any)?.name || "Content Head";
  })();



  // Team members (exclude the content head — they show separately)
  const teamMembers = ((membersRes.data || []) as any[]).filter(m => m.id !== contentHeadId);

  // Fetch call reports for the team (include overall_rating + created_by for initial assessment)
  const { data: callReports } = await admin
    .from("call_reports")
    .select("id, working_title, writer_name, content_type, genre, overall_rating, created_by")
    .eq("meeting_type", "call_report")
    .eq("team_id", teamId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (!callReports || callReports.length === 0) {
    return <ContentEvaluationsClient stories={[]} />;
  }

  const reportIds = callReports.map(r => r.id);

  // Fetch one-liner evaluations — filter to content head (team head)
  // The reports are already team-scoped via team_id filter above
  const teamMemberIds = [contentHeadId, ...teamMembers.map(m => m.id)].filter(Boolean) as string[];

  const { data: forms, error: formsError } = await admin
    .from("evaluator_forms")
    .select(`
      id, call_report_id, evaluator_id, average_score,
      conflict_of_content_score, characterization_score, story_progression_score,
      whats_next_element_score, overall_oneliner_grade_score,
      conflict_of_content_comment, characterization_comment, story_progression_comment,
      whats_next_element_comment, overall_oneliner_grade_comment,
      closing_remarks, decision, decision_notes, submitted_at,
      themes_of_drama, corresponding_dramas, theme_category, no_of_tracks,
      first_2_eps_required, target_writer, per_ep_price_range, slot,
      evaluator:users!evaluator_id(id, name)
    `)
    .in("call_report_id", reportIds)
    .not("submitted_at", "is", null);

  if (formsError) {
    console.error("[EVAL] evaluator_forms query error:", formsError.message);
  }

  // Build evaluator form lookup by call_report_id
  // Prefer the content head's form; fall back to the latest submitted form from any evaluator
  const contentHeadFormByReport = new Map<string, any>();
  const latestFormByReport = new Map<string, any>();
  for (const f of (forms || []) as any[]) {
    // Track content head's form specifically
    if (f.evaluator_id === contentHeadId) {
      const existing = contentHeadFormByReport.get(f.call_report_id);
      if (!existing || new Date(f.submitted_at) > new Date(existing.submitted_at)) {
        contentHeadFormByReport.set(f.call_report_id, f);
      }
    }
    // Track latest form from anyone as fallback
    const existing = latestFormByReport.get(f.call_report_id);
    if (!existing || new Date(f.submitted_at) > new Date(existing.submitted_at)) {
      latestFormByReport.set(f.call_report_id, f);
    }
  }

  // Fetch episodes for these call reports (include initial_assessment + logged_by)
  const { data: episodes } = await admin
    .from("episodes")
    .select("id, call_report_id, episode_number, initial_assessment, logged_by")
    .in("call_report_id", reportIds)
    .eq("is_current", true)
    .order("episode_number", { ascending: true });

  const episodeIds = (episodes || []).map((e: any) => e.id);

  // Fetch episodic evaluations — no evaluator_id filter (reports already team-scoped)
  const { data: episodicEvals, error: epEvalsError } = episodeIds.length
    ? await admin
        .from("episodic_evaluations")
        .select(`
          id, episode_id, evaluator_id, overall_average,
          conflict_of_content_score, characterization_score, story_progression_score,
          main_event_score, small_event_score, dragness_score,
          freezes_score, whats_next_element_score, overall_assessment_score,
          conflict_of_content_comment, characterization_comment, story_progression_comment,
          main_event_comment, small_event_comment, dragness_comment,
          freezes_comment, whats_next_element_comment, overall_assessment_comment,
          decision, decision_notes, submitted_at,
          no_of_pages, no_of_scenes, freeze_ending_scene,
          scenes_remarks, characterization_remarks,
          evaluator:users!evaluator_id(id, name)
        `)
        .in("episode_id", episodeIds)
    : { data: [], error: null };

  if (epEvalsError) {
    console.error("[EVAL] episodic_evaluations query error:", epEvalsError.message);
  }

  // Build episodic eval lookup by episode_id
  // Prefer the content head's eval; fall back to the latest from any evaluator
  const contentHeadEpEvalByEpisode = new Map<string, any>();
  const latestEpEvalByEpisode = new Map<string, any>();
  for (const e of (episodicEvals || []) as any[]) {
    if (e.evaluator_id === contentHeadId) {
      const existing = contentHeadEpEvalByEpisode.get(e.episode_id);
      if (!existing || (e.submitted_at && new Date(e.submitted_at) > new Date(existing.submitted_at || 0))) {
        contentHeadEpEvalByEpisode.set(e.episode_id, e);
      }
    }
    const existing = latestEpEvalByEpisode.get(e.episode_id);
    if (!existing || (e.submitted_at && new Date(e.submitted_at) > new Date(existing.submitted_at || 0))) {
      latestEpEvalByEpisode.set(e.episode_id, e);
    }
  }

  // Build lookup: call_report created_by -> overall_rating
  const crAssessmentMap = new Map<string, { createdBy: string; rating: number }>();
  for (const cr of callReports as any[]) {
    if (cr.overall_rating != null && cr.created_by) {
      crAssessmentMap.set(cr.id, { createdBy: cr.created_by, rating: cr.overall_rating });
    }
  }

  // Build lookup: episode logged_by -> initial_assessment
  const epAssessmentMap = new Map<string, { loggedBy: string; rating: number }>();
  for (const ep of (episodes || []) as any[]) {
    if (ep.initial_assessment != null && ep.logged_by) {
      epAssessmentMap.set(ep.id, { loggedBy: ep.logged_by, rating: ep.initial_assessment });
    }
  }

  // Fetch per-user initial assessments from unified table
  const [crAssessmentsRes, epAssessmentsRes] = await Promise.all([
    admin
      .from("initial_assessments")
      .select("entity_id, assessor_id, score")
      .eq("entity_type", "call_report")
      .in("entity_id", reportIds),
    episodeIds.length
      ? admin
          .from("initial_assessments")
          .select("entity_id, assessor_id, score")
          .eq("entity_type", "episode")
          .in("entity_id", episodeIds)
      : { data: [] as any[] },
  ]);

  // Build lookup: entity_id -> Map<assessor_id, score>
  const crInitialScores = new Map<string, Map<string, number>>();
  for (const a of (crAssessmentsRes.data || []) as any[]) {
    if (!crInitialScores.has(a.entity_id)) crInitialScores.set(a.entity_id, new Map());
    crInitialScores.get(a.entity_id)!.set(a.assessor_id, a.score);
  }

  const epInitialScores = new Map<string, Map<string, number>>();
  for (const a of (epAssessmentsRes.data || []) as any[]) {
    if (!epInitialScores.has(a.entity_id)) epInitialScores.set(a.entity_id, new Map());
    epInitialScores.get(a.entity_id)!.set(a.assessor_id, a.score);
  }

  // Group episodes by call_report_id
  const episodesByReport = new Map<string, any[]>();
  for (const ep of (episodes || []) as any[]) {
    if (!episodesByReport.has(ep.call_report_id)) episodesByReport.set(ep.call_report_id, []);
    episodesByReport.get(ep.call_report_id)!.push(ep);
  }

  // Helper: build member assessments for a call_report (uses initial_assessments table, falls back to legacy overall_rating)
  function buildCrMemberAssessments(reportId: string): MemberAssessment[] {
    const scoresMap = crInitialScores.get(reportId);
    const oldEntry = crAssessmentMap.get(reportId);
    return teamMembers.map(m => ({
      memberId: m.id,
      memberName: m.name || "Unknown",
      score: scoresMap?.get(m.id) ?? (oldEntry && oldEntry.createdBy === m.id ? oldEntry.rating : null),
    }));
  }

  // Helper: build member assessments for an episode (uses initial_assessments table, falls back to legacy initial_assessment)
  function buildEpMemberAssessments(episodeId: string): MemberAssessment[] {
    const scoresMap = epInitialScores.get(episodeId);
    const oldEntry = epAssessmentMap.get(episodeId);
    return teamMembers.map(m => ({
      memberId: m.id,
      memberName: m.name || "Unknown",
      score: scoresMap?.get(m.id) ?? (oldEntry && oldEntry.loggedBy === m.id ? oldEntry.rating : null),
    }));
  }

  // Build final stories
  const stories: ContentEvalStory[] = callReports.map(cr => {
    const form = contentHeadFormByReport.get(cr.id) || latestFormByReport.get(cr.id);
    const evaluatorName = form
      ? (Array.isArray(form.evaluator) ? form.evaluator[0]?.name : form.evaluator?.name) || contentHeadName
      : null;

    const oneLinerEval = form ? {
      evaluatorName: evaluatorName!,
      averageScore: form.average_score ?? null,
      criteria: ONELINER_CRITERIA.map(c => ({
        label: c.label,
        score: form[c.scoreKey] ?? null,
        comment: form[c.commentKey] ?? null,
      })),
      closingRemarks: form.closing_remarks ?? null,
      decision: form.decision ?? null,
      decisionNotes: form.decision_notes ?? null,
      submittedAt: form.submitted_at ?? null,
      themesOfDrama: form.themes_of_drama ?? null,
      correspondingDramas: form.corresponding_dramas ?? null,
      categoryOfTheme: form.theme_category ?? null,
      noOfTracks: form.no_of_tracks ?? null,
      first2EpsRequired: form.first_2_eps_required ?? null,
      targetWriter: form.target_writer ?? null,
      perEpPriceRange: form.per_ep_price_range ?? null,
      slot: form.slot ?? null,
    } : null;

    const epList = (episodesByReport.get(cr.id) || []).map((ep: any) => {
      const epEval = contentHeadEpEvalByEpisode.get(ep.id) || latestEpEvalByEpisode.get(ep.id);
      const epEvalName = epEval
        ? (Array.isArray(epEval.evaluator) ? epEval.evaluator[0]?.name : epEval.evaluator?.name) || contentHeadName
        : null;

      return {
        id: ep.id,
        episodeNumber: ep.episode_number,
        evaluation: epEval ? {
          evaluatorName: epEvalName!,
          overallAverage: epEval.overall_average ?? null,
          criteria: EPISODIC_CRITERIA.map(c => ({
            label: c.label,
            score: epEval[c.scoreKey] ?? null,
            comment: epEval[c.commentKey] ?? null,
          })),
          decision: epEval.decision ?? null,
          decisionNotes: epEval.decision_notes ?? null,
          submittedAt: epEval.submitted_at ?? null,
          noOfPages: epEval.no_of_pages ?? null,
          noOfScenes: epEval.no_of_scenes ?? null,
          freezeEndingScene: epEval.freeze_ending_scene ?? null,
          scenesRemarks: epEval.scenes_remarks ?? null,
          characterizationRemarks: epEval.characterization_remarks ?? null,
        } : null,
        memberAssessments: buildEpMemberAssessments(ep.id),
      };
    });

    return {
      id: cr.id,
      workingTitle: cr.working_title || "Untitled",
      writerName: cr.writer_name || null,
      contentType: cr.content_type || null,
      genre: cr.genre || null,
      contentHeadName,
      oneLinerEval,
      memberAssessments: buildCrMemberAssessments(cr.id),
      episodes: epList,
    };
  });

  return <ContentEvaluationsClient stories={stories} />;
}

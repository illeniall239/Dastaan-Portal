import { createClient } from "@/lib/supabase/server";

export interface RejectedArchiveItem {
  id: string;
  call_report_id: string;
  original_id: string;
  meeting_type: string;
  writer_name: string;
  working_title: string;
  logline: string;
  meeting_date: string;
  average_score: number;
  total_evaluations: number;
  rejection_reason: string;
  archived_at: string;
  original_created_at: string;
}

export interface EvaluationSnapshot {
  id: string;
  form_id: string;
  evaluator_name: string;
  evaluator_email: string;
  premise_conflict_score: number;
  storyline_plot_score: number;
  episodic_progression_score: number;
  characters_score: number;
  overall_assessment_score: number;
  average_score: number;
  comments: string;
  submitted_at: string;
}

/**
 * Get all rejected archive items
 * Sorted by most recently archived
 */
export async function getRejectedArchive() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rejected_archive")
    .select("id, call_report_id, original_id, meeting_type, writer_name, working_title, logline, meeting_date, average_score, total_evaluations, rejection_reason, archived_at, original_created_at")
    .order("archived_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch rejected archive: ${error.message}`);
  }

  return data as RejectedArchiveItem[];
}

/**
 * Get a single archived item with all its evaluation snapshots
 */
export async function getArchivedItemWithEvaluations(archiveId: string) {
  const supabase = await createClient();

  // Get the archived call report
  const { data: archive, error: archiveError } = await supabase
    .from("rejected_archive")
    .select("id, call_report_id, original_id, meeting_type, writer_name, working_title, logline, meeting_date, average_score, total_evaluations, rejection_reason, archived_at, original_created_at")
    .eq("id", archiveId)
    .single();

  if (archiveError) {
    throw new Error(`Failed to fetch archived item: ${archiveError.message}`);
  }

  // Get all evaluation snapshots for this archive
  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations_snapshot")
    .select("id, form_id, archive_id, evaluator_name, evaluator_email, premise_conflict_score, storyline_plot_score, episodic_progression_score, characters_score, overall_assessment_score, average_score, comments, submitted_at")
    .eq("archive_id", archiveId)
    .order("submitted_at", { ascending: false });

  if (evalError) {
    throw new Error(`Failed to fetch evaluation snapshots: ${evalError.message}`);
  }

  return {
    archive: archive as RejectedArchiveItem,
    evaluations: evaluations as EvaluationSnapshot[],
  };
}

/**
 * Get rejected archive items with pagination
 */
export async function getRejectedArchivePaginated(
  page: number = 1,
  pageSize: number = 10
) {
  const supabase = await createClient();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("rejected_archive")
    .select("id, call_report_id, original_id, meeting_type, writer_name, working_title, logline, meeting_date, average_score, total_evaluations, rejection_reason, archived_at, original_created_at", { count: "exact" })
    .order("archived_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch rejected archive: ${error.message}`);
  }

  return {
    data: data as RejectedArchiveItem[],
    totalCount: count || 0,
    currentPage: page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Search rejected archive by writer name or title
 */
export async function searchRejectedArchive(searchTerm: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rejected_archive")
    .select("id, call_report_id, original_id, meeting_type, writer_name, working_title, logline, meeting_date, average_score, total_evaluations, rejection_reason, archived_at, original_created_at")
    .or(`writer_name.ilike.%${searchTerm}%,working_title.ilike.%${searchTerm}%`)
    .order("archived_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to search rejected archive: ${error.message}`);
  }

  return data as RejectedArchiveItem[];
}

/**
 * Get statistics for rejected archive
 */
export async function getArchiveStatistics() {
  const supabase = await createClient();

  // Total rejected count
  const { count: totalRejected, error: countError } = await supabase
    .from("rejected_archive")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Failed to get archive count: ${countError.message}`);
  }

  // Get average rejection score
  const { data: avgData, error: avgError } = await supabase
    .from("rejected_archive")
    .select("average_score");

  if (avgError) {
    throw new Error(`Failed to get average scores: ${avgError.message}`);
  }

  const avgRejectionScore =
    avgData && avgData.length > 0
      ? avgData.reduce((sum, item) => sum + (item.average_score || 0), 0) /
      avgData.length
      : 0;

  // Get rejected items by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: recentRejected, error: recentError } = await supabase
    .from("rejected_archive")
    .select("archived_at")
    .gte("archived_at", sixMonthsAgo.toISOString());

  if (recentError) {
    throw new Error(`Failed to get recent rejections: ${recentError.message}`);
  }

  return {
    totalRejected: totalRejected || 0,
    averageRejectionScore: avgRejectionScore,
    recentRejectedCount: recentRejected?.length || 0,
  };
}

/**
 * Get items that need improvement (score 5.0-6.9)
 */
export async function getItemsNeedingImprovement() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("call_reports")
    .select("id, call_report_id, working_title, writer_name, contact_email, logline, category, evaluation_status, meeting_date, created_at, updated_at")
    .eq("evaluation_status", "needs_improvement")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch items needing improvement: ${error.message}`);
  }

  return data;
}

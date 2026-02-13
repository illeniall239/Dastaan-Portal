import { createClient } from "@/lib/supabase/server";

/**
 * Get recent activity for the dashboard
 * Fetches recent audit logs or other activity from various tables
 * @param limit - Number of items to return
 * @param teamId - Optional team_id for team isolation
 * @param userRole - Optional user role for global access check
 */
export async function getRecentActivity(
  limit: number = 5,
  teamId?: string | null,
  userRole?: string | null
) {
  const supabase = await createClient();

  // Get recent audit logs - only select necessary columns for performance
  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      timestamp,
      details,
      users!audit_logs_performed_by_fkey ( name )
    `)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent activity:", error);
    // If audit_logs doesn't have data or has error, we can try to get recent activity from other tables
    return await getRecentActivityFromOtherTables(limit, teamId, userRole);
  }

  // Format the audit logs data for display
  return (data || []).map((log: any) => {
    const userRel = Array.isArray(log.users) ? log.users[0] : log.users;
    const userName = userRel?.name;

    return {
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      performedBy: userName || "Unknown User",
      timestamp: log.timestamp,
      details: log.details || null
    };
  });
}

/**
 * Fallback function to get recent activity from other tables
 * if audit_logs doesn't have data
 * @param limit - Number of items to return
 * @param teamId - Optional team_id for team isolation
 * @param userRole - Optional user role for global access check
 */
async function getRecentActivityFromOtherTables(
  limit: number = 5,
  teamId?: string | null,
  userRole?: string | null
) {
  const supabase = await createClient();

  const hasGlobalAccess = userRole && ['admin', 'management'].includes(userRole);

  // Build query for recent call reports with team filter
  let callReportsQuery = supabase
    .from("call_reports")
    .select(`id, call_report_id, working_title, created_at, team_id, users!call_reports_created_by_fkey(name)`)
    .order("created_at", { ascending: false })
    .limit(Math.floor(limit / 2));

  // TEAM ISOLATION: Apply filter unless admin/management
  if (!hasGlobalAccess && teamId) {
    callReportsQuery = callReportsQuery.eq("team_id", teamId);
  }

  const { data: callReports, error: callReportError } = await callReportsQuery;

  // Get recent evaluations - only select necessary columns
  const { data: evaluations, error: evaluationError } = await supabase
    .from("evaluator_forms")
    .select(`id, average_score, created_at, users!evaluator_forms_evaluator_id_fkey(name), call_reports(working_title)`)
    .order("created_at", { ascending: false })
    .limit(Math.floor(limit / 2));

  if (callReportError) {
    console.error("Error fetching call reports:", callReportError);
  }

  if (evaluationError) {
    console.error("Error fetching evaluations:", evaluationError);
  }

  // Combine and sort by date
  const recentActivity: any[] = [];

  if (callReports) {
    (callReports as any[]).forEach((report: any) => {
      const creatorRel = Array.isArray(report.users) ? report.users[0] : report.users;
      const creatorName = creatorRel?.name;

      recentActivity.push({
        id: `call_report_${report.id}`,
        action: "created_call_report",
        entityType: "call_report",
        entityId: report.id,
        performedBy: creatorName || "Unknown User",
        timestamp: report.created_at,
        details: {
          title: report.working_title,
          call_report_id: report.call_report_id
        }
      });
    });
  }

  if (evaluations) {
    (evaluations as any[]).forEach((evaluation: any) => {
      const evaluatorRel = Array.isArray(evaluation.users) ? evaluation.users[0] : evaluation.users;
      const evaluatorName = evaluatorRel?.name;
      const projectTitle = Array.isArray(evaluation.call_reports) ? evaluation.call_reports[0]?.working_title : evaluation.call_reports?.working_title;

      recentActivity.push({
        id: `evaluation_${evaluation.id}`,
        action: "submitted_evaluation",
        entityType: "evaluation",
        entityId: evaluation.id,
        performedBy: evaluatorName || "Unknown User",
        timestamp: evaluation.created_at,
        details: {
          project_title: projectTitle || "Untitled",
          average_score: evaluation.average_score
        }
      });
    });
  }

  // Sort by timestamp, most recent first
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Return only the requested limit
  return recentActivity.slice(0, limit);
}

/**
 * Get stakeholder dashboard statistics
 * Fetches comprehensive dashboard data for stakeholder view
 */
export async function getStakeholderDashboardStats() {
  const supabase = await createClient();

  try {
    // Fetch all data in parallel for better performance
    const [
      activeProjectsRes,
      contractsRes,
      overduePaymentsRes,
      weeklyActivitiesRes,
      pendingApprovalsRes,
      pipelineFunnelRes,
      inEvaluationRes,
      rejectedArchiveRes
    ] = await Promise.all([
      // Total Active Projects (call reports)
      supabase
        .from('call_reports')
        .select('*', { count: 'exact', head: true })
        .eq('meeting_type', 'call_report'),

      // Active Contracts
      supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Overdue Payments
      supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'overdue'),

      // Weekly Activities (last 7 days)
      supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

      // Pending Approvals
      supabase
        .from('evaluation_logs')
        .select('*', { count: 'exact', head: true })
        .eq('final_decision', 'pending'),

      // Pipeline Funnel - Get call reports grouped by status
      supabase
        .from('call_reports')
        .select('status, id')
        .eq('meeting_type', 'call_report'),

      // Active Evaluations - Call reports in evaluation with evaluator progress
      supabase
        .from('call_reports')
        .select(`
          id,
          call_report_id,
          working_title,
          writer_name,
          meeting_date,
          status,
          call_report_writers:call_report_writers (
            writer_id,
            writer_email,
            writer_phone,
            display_order,
            writer:writers(name)
          ),
          evaluator_forms!left (
            id,
            average_score,
            submitted_at,
            status
          )
        `)
        .eq('meeting_type', 'call_report')
        .eq('status', 'in_evaluation'),

      // Rejected Archive - Evaluation logs with rejected decisions
      supabase
        .from('evaluation_logs')
        .select(`
          id,
          call_report_id,
          aggregate_average_score,
          aggregate_median_score,
          approval_count,
          rejection_count,
          total_evaluators,
          created_at,
          call_report:call_report_id (
            id,
            call_report_id,
            working_title,
            writer_name,
            logline,
            meeting_date,
            call_report_writers:call_report_writers (
              writer_id,
              writer_email,
              writer_phone,
              display_order,
              writer:writers(name)
            ),
            evaluator_forms (
              id,
              conflict_of_content_score,
              characterization_score,
              story_progression_score,
              whats_next_element_score,
              overall_oneliner_grade_score,
              average_score,
              overall_comments,
              submitted_at,
              evaluator:evaluator_id (
                name,
                email
              )
            )
          )
        `)
        .eq('final_decision', 'rejected')
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Process pipeline funnel data
    const funnelData = (pipelineFunnelRes.data || []).reduce((acc: any, report: any) => {
      const status = report.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Process active evaluations data
    const activeEvaluations = (inEvaluationRes.data || []).map((report: any) => {
      const evaluatorForms = report.evaluator_forms || [];
      const completedEvaluations = evaluatorForms.filter((f: any) => f.submitted_at).length;
      const totalRequired = 5; // 5 internal evaluators required

      // Calculate current average score from submitted evaluations
      const submittedScores = evaluatorForms
        .filter((f: any) => f.submitted_at && f.average_score)
        .map((f: any) => f.average_score);
      const currentAvgScore = submittedScores.length > 0
        ? submittedScores.reduce((sum: number, score: number) => sum + score, 0) / submittedScores.length
        : 0;

      // Process writers - use writer_names array if available
      const writers = report.call_report_writers?.map((w: any) => w.writer?.name || "").filter(Boolean) || [];
      const writerDisplay = writers.length > 0 ? writers.join(", ") : report.writer_name;

      return {
        id: report.id,
        callReportId: report.call_report_id,
        title: report.working_title,
        writer: writerDisplay,
        writerNames: writers.length > 0 ? writers : undefined,
        meetingDate: report.meeting_date,
        completedEvaluations,
        totalRequired,
        currentAvgScore: Math.round(currentAvgScore * 10) / 10,
        status: report.status
      };
    });

    // Process rejected archive data
    const rejectedArchive = (rejectedArchiveRes.data || []).map((log: any) => {
      const callReport = Array.isArray(log.call_report) ? log.call_report[0] : log.call_report;
      if (!callReport) return null;

      const evaluations = (callReport.evaluator_forms || []).map((form: any) => {
        const evaluator = Array.isArray(form.evaluator) ? form.evaluator[0] : form.evaluator;
        return {
          id: form.id,
          evaluatorName: evaluator?.name || 'Unknown',
          evaluatorEmail: evaluator?.email || 'unknown@geo.com',
          conflictOfContentScore: form.conflict_of_content_score || 0,
          characterizationScore: form.characterization_score || 0,
          storyProgressionScore: form.story_progression_score || 0,
          whatsNextElementScore: form.whats_next_element_score || 0,
          overallOnelinerGradeScore: form.overall_oneliner_grade_score || 0,
          averageScore: form.average_score || 0,
          comments: form.overall_comments || '',
          submittedAt: form.submitted_at
        };
      });

      // Process writers - use writer_names array if available
      const writers = callReport.call_report_writers?.map((w: any) => w.writer?.name || "").filter(Boolean) || [];
      const writerDisplay = writers.length > 0 ? writers.join(", ") : callReport.writer_name;

      return {
        id: log.id,
        callReportId: callReport.call_report_id,
        writerName: writerDisplay,
        writerNames: writers.length > 0 ? writers : undefined,
        workingTitle: callReport.working_title,
        logline: callReport.logline,
        meetingDate: callReport.meeting_date,
        averageScore: log.aggregate_average_score || 0,
        totalEvaluations: log.total_evaluators || 0,
        rejectionReason: `Average score ${log.aggregate_average_score?.toFixed(1) || '0.0'} below 5.0 threshold`,
        archivedAt: log.created_at,
        evaluations
      };
    }).filter(Boolean); // Remove null entries

    return {
      summary: {
        totalActiveProjects: activeProjectsRes.count || 0,
        activeContracts: contractsRes.count || 0,
        overduePayments: overduePaymentsRes.count || 0,
        weeklyActivities: weeklyActivitiesRes.count || 0,
        pendingApprovals: pendingApprovalsRes.count || 0
      },
      funnel: {
        submitted: funnelData.submitted || 0,
        in_evaluation: funnelData.in_evaluation || 0,
        approved: funnelData.approved || 0,
        in_negotiation: funnelData.in_negotiation || 0,
        in_legal_review: funnelData.in_legal_review || 0,
        contracted: funnelData.contracted || 0,
        in_payment: funnelData.in_payment || 0,
        completed: funnelData.completed || 0,
        archived: funnelData.archived || 0
      },
      activeEvaluations,
      rejectedArchive
    };
  } catch (error) {
    console.error('❌ [Stakeholder Dashboard] Error fetching stats:', error);
    // Return empty data structure on error
    return {
      summary: {
        totalActiveProjects: 0,
        activeContracts: 0,
        overduePayments: 0,
        weeklyActivities: 0,
        pendingApprovals: 0
      },
      funnel: {
        submitted: 0,
        in_evaluation: 0,
        approved: 0,
        in_negotiation: 0,
        in_legal_review: 0,
        contracted: 0,
        in_payment: 0,
        completed: 0,
        archived: 0
      },
      activeEvaluations: [],
      rejectedArchive: []
    };
  }
}
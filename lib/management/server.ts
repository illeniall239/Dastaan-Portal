import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveIdeasByGenre } from "./active-ideas-details";
import { cachedQuery, CacheTags } from "@/lib/cache/request-cache";
import { handleError } from "@/lib/errors";
import type { CriticalAlert } from "./critical-alerts";

/**
 * Management Dashboard Server Functions
 * Provides comprehensive data access for management oversight
 */

export interface ExecutiveSummary {
  totalActiveProjects: number;
  pipelineValue: number;
  pendingApprovals: number;
  activeContracts: number;
  overduePayments: number;
  weeklyActivities: number;
}

export interface PipelineFunnel {
  submitted: number;
  in_evaluation: number;
  approved: number;
  in_contractTerm: number;
  in_legal_review: number;
  contracted: number;
  in_payment: number;
  completed: number;
  archived: number;
}

export interface FinancialOverview {
  committedFunds: number;
  pendingFunds: number;
  totalPendingPayments: number;
  totalApprovedPayments: number;
  totalPaidAmount: number;
  overduePaymentsCount: number;
  topProjectsByValue: Array<{
    id: string;
    title: string;
    value: number;
    status: string;
  }>;
}

export interface PerformanceMetrics {
  avgEvaluationScore: number;
  avgEvaluationTurnaround: number;
  approvalRate: number;
  contractConversionRate: number;
  avgLegalReviewDuration: number;
  paymentPunctuality: number;
}

export interface DepartmentWorkload {
  contentTeam: {
    activeCallReports: number;
    pendingEvaluations: number;
  };
  executives: {
    pendingApprovals: number;
  };
  legal: {
    reviewsInProgress: number;
  };
  finance: {
    pendingPaymentApprovals: number;
  };
  evaluators: {
    assignedEvaluations: number;
    completedEvaluations: number;
  };
}

// CriticalAlert type imported from critical-alerts.ts to avoid duplication

/**
 * Get executive summary stats for hero section
 * CACHED: Uses Next.js request memoization with 5-minute revalidation
 * INSTRUMENTED: OpenTelemetry tracing (Week 2)
 */
export async function getExecutiveSummary(): Promise<ExecutiveSummary> {
  // Instrument server function (production only)
  const instrumentFn = process.env.NODE_ENV === 'production'
    ? (await import('@/lib/telemetry/spans').catch(() => ({ instrumentServerFunction: null }))).instrumentServerFunction
    : null;

  const wrappedQuery = async () => cachedQuery(
    async () => {
      const supabase = createAdminClient();

      try {
        // Fetch call reports to get story IDs (avoiding nested query)
        const { data: callReports } = await supabase
          .from("call_reports")
          .select("story_id")
          .eq("meeting_type", "call_report");

        const storyIds = [...new Set(callReports?.map((cr: any) => cr.story_id).filter(Boolean))];

        const [
          storiesRes,
          negotiationsRes,
          contractsRes,
          paymentsRes,
          activeContractsRes,
          auditRes
        ] = await Promise.all([
          // Total active projects (stories with call reports)
          supabase
            .from("stories")
            .select("*", { count: "exact", head: true })
            .in("id", storyIds.length > 0 ? storyIds : ['00000000-0000-0000-0000-000000000000'])
            .neq("status", "archived")
            .neq("status", "rejected"),

          // Negotiations (in progress + agreed) for pipeline value
          supabase
            .from("negotiations")
            .select("proposed_price, agreed_price, status")
            .in("status", ["in_progress", "agreed"]),

          // All contracts (for total value)
          supabase
            .from("contracts")
            .select("total_value"),

          // Overdue payments
          supabase
            .from("payments")
            .select("*", { count: "exact", head: true })
            .eq("status", "overdue"),

          // Active negotiations count (agreements + in-progress)
          supabase
            .from("negotiations")
            .select("*", { count: "exact", head: true })
            .in("status", ["agreed", "in_progress"]),

          // Weekly activities (last 7 days)
          supabase
            .from("audit_logs")
            .select("*", { count: "exact", head: true })
            .gte("timestamp", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        ]);

        // Calculate pipeline value
        const pendingValue = (negotiationsRes.data || []).reduce((sum: number, n: any) => {
          // Use agreed_price for agreed negotiations, proposed_price for in-progress
          const val = n.status === "agreed"
            ? (parseFloat(n.agreed_price) || parseFloat(n.proposed_price) || 0)
            : (parseFloat(n.proposed_price) || 0);
          return sum + val;
        }, 0);
        const committedValue = (contractsRes.data || []).reduce((sum: number, c: any) => sum + (parseFloat(c.total_value) || 0), 0);

        return {
          totalActiveProjects: storiesRes.count || 0,
          pipelineValue: pendingValue + committedValue,
          pendingApprovals: 0, // Will calculate from one_liners pending
          activeContracts: activeContractsRes.count || 0,
          overduePayments: paymentsRes.count || 0,
          weeklyActivities: auditRes.count || 0
        };
      } catch (error) {
        return handleError(error, {
          context: "getExecutiveSummary",
          fallbackValue: {
            totalActiveProjects: 0,
            pipelineValue: 0,
            pendingApprovals: 0,
            activeContracts: 0,
            overduePayments: 0,
            weeklyActivities: 0
          },
          userMessage: "Failed to fetch executive summary",
        });
      }
    },
    ['executive-summary'],
    {
      revalidate: 300,
      tags: [CacheTags.EXECUTIVE_SUMMARY, CacheTags.PIPELINE_OVERVIEW]
    }
  )();

  // Wrap with instrumentation if available
  return instrumentFn ? instrumentFn('getExecutiveSummary', wrappedQuery) : wrappedQuery();
}

/**
 * Get pipeline funnel data
 */
export async function getPipelineFunnel(): Promise<PipelineFunnel> {
  const supabase = createAdminClient();

  try {
    const { data: stories } = await supabase
      .from("stories")
      .select("status");

    const { count: completedCount } = await supabase
      .from("contracts")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: archivedCount } = await supabase
      .from("archive")
      .select("*", { count: "exact", head: true });

    // Count stories by status
    const counts: any = {
      submitted: 0,
      in_evaluation: 0,
      approved: 0,
      in_contractTerm: 0,
      in_legal_review: 0,
      contracted: 0,
      in_payment: 0,
      completed: completedCount || 0,
      archived: archivedCount || 0
    };

    (stories || []).forEach((story: any) => {
      if (counts[story.status] !== undefined) {
        counts[story.status]++;
      }
    });

    return counts;
  } catch (error) {
    return handleError(error, {
      context: "getPipelineFunnel",
      fallbackValue: {
        submitted: 0,
        in_evaluation: 0,
        approved: 0,
        in_contractTerm: 0,
        in_legal_review: 0,
        contracted: 0,
        in_payment: 0,
        completed: 0,
        archived: 0
      },
      userMessage: "Failed to fetch pipeline funnel data",
    });
  }
}

/**
 * Get financial overview
 */
export async function getFinancialOverview(): Promise<FinancialOverview> {
  const supabase = createAdminClient();

  try {
    const [contractsRes, negotiationsRes, paymentsRes, topProjectsRes] = await Promise.all([
      supabase.from("contracts").select("total_value, status"),
      supabase.from("negotiations").select("agreed_price, status"),
      supabase.from("payments").select("payment_amount, status"),
      supabase
        .from("contracts")
        .select("id, project_title, total_value, status")
        .order("total_value", { ascending: false })
        .limit(5)
    ]);

    // Calculate committed funds (active contracts)
    const committedFunds = (contractsRes.data || [])
      .filter((c: any) => c.status === "active")
      .reduce((sum: number, c: any) => sum + (parseFloat(c.total_value) || 0), 0);

    // Calculate pending funds (negotiations in progress)
    const pendingFunds = (negotiationsRes.data || [])
      .filter((n: any) => n.status === "in_progress")
      .reduce((sum: number, n: any) => sum + (parseFloat(n.agreed_price) || 0), 0);

    // Calculate payment stats
    const payments = paymentsRes.data || [];
    const totalPendingPayments = payments
      .filter((p: any) => p.status === "pending")
      .reduce((sum: number, p: any) => sum + (parseFloat(p.payment_amount) || 0), 0);

    const totalApprovedPayments = payments
      .filter((p: any) => p.status === "approved")
      .reduce((sum: number, p: any) => sum + (parseFloat(p.payment_amount) || 0), 0);

    const totalPaidAmount = payments
      .filter((p: any) => p.status === "paid")
      .reduce((sum: number, p: any) => sum + (parseFloat(p.payment_amount) || 0), 0);

    const overduePaymentsCount = payments.filter((p: any) => p.status === "overdue").length;

    // Format top projects
    const topProjectsByValue = (topProjectsRes.data || []).map((project: any) => ({
      id: project.id,
      title: project.project_title || "Untitled Project",
      value: parseFloat(project.total_value) || 0,
      status: project.status
    }));

    return {
      committedFunds,
      pendingFunds,
      totalPendingPayments,
      totalApprovedPayments,
      totalPaidAmount,
      overduePaymentsCount,
      topProjectsByValue
    };
  } catch (error) {
    console.error("Error fetching financial overview:", error);
    return {
      committedFunds: 0,
      pendingFunds: 0,
      totalPendingPayments: 0,
      totalApprovedPayments: 0,
      totalPaidAmount: 0,
      overduePaymentsCount: 0,
      topProjectsByValue: []
    };
  }
}

/**
 * Get performance metrics
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  const supabase = createAdminClient();

  try {
    const [evaluationsRes, storiesRes, paymentsRes, legalRes] = await Promise.all([
      supabase.from("evaluator_forms").select("average_score, created_at, submitted_at"),
      supabase.from("stories").select("status"),
      supabase.from("payments").select("status, payment_date, created_at"),
      supabase.from("legal_reviews").select("days_in_review")
    ]);

    // Average evaluation score
    const evaluations = evaluationsRes.data || [];
    const avgEvaluationScore = evaluations.length > 0
      ? evaluations.reduce((sum: number, e: any) => sum + (parseFloat(e.average_score) || 0), 0) / evaluations.length
      : 0;

    // Average evaluation turnaround (days from created to submitted)
    const completedEvaluations = evaluations.filter((e: any) => e.submitted_at);
    const avgEvaluationTurnaround = completedEvaluations.length > 0
      ? completedEvaluations.reduce((sum: number, e: any) => {
        const created = new Date(e.created_at);
        const submitted = new Date(e.submitted_at);
        return sum + Math.floor((submitted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }, 0) / completedEvaluations.length
      : 0;

    // Approval rate (approved stories / total evaluated stories)
    const stories = storiesRes.data || [];
    const evaluatedStories = stories.filter((s: any) =>
      ["approved", "rejected", "in_negotiation", "contracted", "in_payment"].includes(s.status)
    );
    const approvedStories = stories.filter((s: any) =>
      ["approved", "in_negotiation", "contracted", "in_payment"].includes(s.status)
    );
    const approvalRate = evaluatedStories.length > 0
      ? (approvedStories.length / evaluatedStories.length) * 100
      : 0;

    // Contract conversion rate (contracted stories / approved stories)
    const contractedStories = stories.filter((s: any) => ["contracted", "in_payment"].includes(s.status));
    const contractConversionRate = approvedStories.length > 0
      ? (contractedStories.length / approvedStories.length) * 100
      : 0;

    // Average legal review duration
    const legalReviews = legalRes.data || [];
    const avgLegalReviewDuration = legalReviews.length > 0
      ? legalReviews.reduce((sum: number, l: any) => sum + (l.days_in_review || 0), 0) / legalReviews.length
      : 0;

    // Payment punctuality (on-time payments / total paid payments)
    const payments = paymentsRes.data || [];
    const paidPayments = payments.filter((p: any) => p.status === "paid");
    const onTimePayments = paidPayments.filter((p: any) => {
      if (!p.payment_date || !p.created_at) return false;
      // Consider on-time if paid within 30 days of creation
      const created = new Date(p.created_at);
      const paid = new Date(p.payment_date);
      const daysDiff = Math.floor((paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    });
    const paymentPunctuality = paidPayments.length > 0
      ? (onTimePayments.length / paidPayments.length) * 100
      : 0;

    return {
      avgEvaluationScore: Math.round(avgEvaluationScore * 10) / 10,
      avgEvaluationTurnaround: Math.round(avgEvaluationTurnaround),
      approvalRate: Math.round(approvalRate),
      contractConversionRate: Math.round(contractConversionRate),
      avgLegalReviewDuration: Math.round(avgLegalReviewDuration),
      paymentPunctuality: Math.round(paymentPunctuality)
    };
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    return {
      avgEvaluationScore: 0,
      avgEvaluationTurnaround: 0,
      approvalRate: 0,
      contractConversionRate: 0,
      avgLegalReviewDuration: 0,
      paymentPunctuality: 0
    };
  }
}

/**
 * Get department workload
 * CACHED: Uses Next.js request memoization with 5-minute revalidation
 * INSTRUMENTED: OpenTelemetry tracing (Week 2)
 */
export async function getDepartmentWorkload(): Promise<DepartmentWorkload> {
  // Instrument server function (production only)
  const instrumentFn = process.env.NODE_ENV === 'production'
    ? (await import('@/lib/telemetry/spans').catch(() => ({ instrumentServerFunction: null }))).instrumentServerFunction
    : null;

  const wrappedQuery = async () => cachedQuery(
    async () => {
      const supabase = createAdminClient();

      try {
        const [callReportsRes, evaluationsRes, oneLinerRes, legalRes, paymentsRes] = await Promise.all([
          supabase.from("call_reports").select("*", { count: "exact", head: true }),
          supabase.from("evaluator_forms").select("submitted_at"),
          supabase.from("one_liners").select("*", { count: "exact", head: true }).eq("decision", "pending"),
          supabase.from("legal_reviews").select("*", { count: "exact", head: true }).is("decided_at", null),
          supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending")
        ]);

        const evaluations = evaluationsRes.data || [];
        const assignedEvaluations = evaluations.length;
        const completedEvaluations = evaluations.filter((e: any) => e.submitted_at).length;

        return {
          contentTeam: {
            activeCallReports: callReportsRes.count || 0,
            pendingEvaluations: assignedEvaluations - completedEvaluations
          },
          executives: {
            pendingApprovals: oneLinerRes.count || 0
          },
          legal: {
            reviewsInProgress: legalRes.count || 0
          },
          finance: {
            pendingPaymentApprovals: paymentsRes.count || 0
          },
          evaluators: {
            assignedEvaluations,
            completedEvaluations
          }
        };
      } catch (error) {
        return {
          contentTeam: { activeCallReports: 0, pendingEvaluations: 0 },
          executives: { pendingApprovals: 0 },
          legal: { reviewsInProgress: 0 },
          finance: { pendingPaymentApprovals: 0 },
          evaluators: { assignedEvaluations: 0, completedEvaluations: 0 }
        };
      }
    },
    ['department-workload'],
    {
      revalidate: 300,
      tags: [CacheTags.DEPARTMENT_WORKLOAD]
    }
  )();

  // Wrap with instrumentation if available
  return instrumentFn ? instrumentFn('getDepartmentWorkload', wrappedQuery) : wrappedQuery();
}

/**
 * Get critical alerts
 * CACHED: Uses Next.js request memoization with 5-minute revalidation
 * INSTRUMENTED: OpenTelemetry tracing (Week 2)
 */
export async function getCriticalAlerts(): Promise<CriticalAlert[]> {
  // Instrument server function (production only)
  const instrumentFn = process.env.NODE_ENV === 'production'
    ? (await import('@/lib/telemetry/spans').catch(() => ({ instrumentServerFunction: null }))).instrumentServerFunction
    : null;

  const wrappedQuery = async () => cachedQuery(
    async () => {
      const supabase = createAdminClient();
      const alerts: CriticalAlert[] = [];

      try {
        // Get stuck projects (same status > 30 days)
        const { data: stories } = await supabase
          .from("stories")
          .select("id, title, status, updated_at")
          .neq("status", "archived")
          .neq("status", "rejected");

        (stories || []).forEach((story: any) => {
          const daysSinceUpdate = Math.floor((Date.now() - new Date(story.updated_at).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceUpdate > 30) {
            alerts.push({
              id: `stuck - ${story.id} `,
              type: "stuck_story",
              title: `Story stuck in ${story.status} `,
              description: `"${story.title}" has been in ${story.status} for ${daysSinceUpdate} days`,
              severity: daysSinceUpdate > 60 ? "critical" : "warning",
              affectedEntity: story.title,
              entityId: story.id,
              daysDelayed: daysSinceUpdate - 30,
              createdAt: story.updated_at,
            });
          }
        });

        // Get overdue payments
        const { data: payments } = await supabase
          .from("payments")
          .select("id, milestone_name, overdue_days")
          .eq("status", "overdue");

        (payments || []).forEach((payment: any) => {
          if (payment.overdue_days && payment.overdue_days > 7) {
            alerts.push({
              id: `payment - ${payment.id} `,
              type: "payment_overdue",
              title: "Payment Overdue",
              description: `Payment "${payment.milestone_name}" is ${payment.overdue_days} days overdue`,
              severity: payment.overdue_days > 30 ? "critical" : "warning",
              affectedEntity: payment.milestone_name || "Payment",
              entityId: payment.id,
              daysDelayed: payment.overdue_days,
              createdAt: new Date().toISOString(),
            });
          }
        });

        // Get slow legal reviews (> 14 days)
        const { data: legalReviews } = await supabase
          .from("legal_reviews")
          .select("id, legal_review_id, days_in_review")
          .is("decided_at", null);

        (legalReviews || []).forEach((review: any) => {
          if (review.days_in_review && review.days_in_review > 14) {
            alerts.push({
              id: `legal - ${review.id} `,
              type: "evaluation_delay",
              title: "Legal Review Delayed",
              description: `Review ${review.legal_review_id} has been pending for ${review.days_in_review} days`,
              severity: review.days_in_review > 30 ? "critical" : "warning",
              affectedEntity: review.legal_review_id || "Legal Review",
              entityId: review.id,
              daysDelayed: review.days_in_review - 14,
              createdAt: new Date().toISOString(),
            });
          }
        });

        // Get expiring contracts (< 30 days)
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id, contract_id, project_title, contract_end_date")
          .eq("status", "active");

        (contracts || []).forEach((contract: any) => {
          if (contract.contract_end_date) {
            const daysUntilExpiry = Math.floor((new Date(contract.contract_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
              alerts.push({
                id: `contract - ${contract.id} `,
                type: "long_negotiation",
                title: "Contract Expiring Soon",
                description: `Contract ${contract.contract_id} for "${contract.project_title}" expires in ${daysUntilExpiry} days`,
                severity: daysUntilExpiry < 7 ? "critical" : "warning",
                affectedEntity: contract.project_title || contract.contract_id,
                entityId: contract.id,
                daysDelayed: 30 - daysUntilExpiry,
                createdAt: contract.contract_end_date,
              });
            }
          }
        });

        // Sort by severity and limit to top 10
        return alerts
          .sort((a, b) => {
            const severityOrder = { critical: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          })
          .slice(0, 10);
      } catch (error) {
        return [];
      }
    },
    ['critical-alerts'],
    {
      revalidate: 300,
      tags: [CacheTags.CRITICAL_ALERTS]
    }
  )();

  // Wrap with instrumentation if available
  return instrumentFn ? instrumentFn('getCriticalAlerts', wrappedQuery) : wrappedQuery();
}

// Obsolete function removed in favor of getActiveIdeasByGenre

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEvaluationReminderEmail } from '@/lib/email/send-email';
import { createNotifications, createNotification } from '@/lib/notifications/server';
import { logger } from '@/lib/logger';

/**
 * Run daily evaluation reminders
 * This function should be called by a scheduled job/cron
 */
export async function runDailyEvaluationReminders() {
  const supabase = await createClient();

  try {
    // Call the database function that handles sending reminders
    const { error } = await supabase.rpc('run_daily_evaluation_reminders');
    
    if (error) {
      console.error('Error running daily evaluation reminders:', error);
      throw new Error(`Failed to run daily evaluation reminders: ${error.message}`);
    }

    
    
    // Optionally, fetch the details of reminders sent to send actual notifications
    // This would involve querying evaluator_assignments where last_reminder_sent = today
    await sendActualEmailReminders();
    
    return { success: true, message: 'Daily evaluation reminders processed successfully' };
  } catch (error) {
    console.error('Error in runDailyEvaluationReminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send actual email notifications to evaluators who need reminders
 */
async function sendActualEmailReminders() {
  const supabase = await createClient();

  try {
    // Get evaluators who have reminders sent today but not yet notified via email
    const { data: assignments, error } = await supabase
      .from('evaluator_assignments')
      .select(`
        *,
        call_reports (working_title, call_report_id, logline),
        evaluator:evaluator_id (name, email)
      `)
      .eq('last_reminder_sent::date', new Date().toISOString().split('T')[0])
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching assignments for email reminders:', error);
      return;
    }

    if (!assignments || assignments.length === 0) {
      
      return;
    }

    // Send email to each evaluator
    for (const assignment of assignments) {
      try {
        const result = await sendEvaluationReminderEmail({
          evaluatorName: assignment.evaluator.name,
          evaluatorEmail: assignment.evaluator.email,
          callReportTitle: assignment.call_reports.working_title,
          callReportId: assignment.call_report_id,
          reminderCount: assignment.reminder_count,
        });
        
        if (result.success) {
          
        } else {
          console.error(`Failed to send reminder email to ${assignment.evaluator.email}:`, result.error);
        }
      } catch (emailError) {
        console.error(`Failed to send reminder email to ${assignment.evaluator.email}:`, emailError);
      }
    }
  } catch (error) {
    console.error('Error in sendActualEmailReminders:', error);
  }
}

/**
 * Check for any overdue evaluations that need to proceed after the deadline
 */
export async function checkOverdueEvaluations() {
  const supabase = await createClient();

  try {
    // Get all call reports where the deadline has passed and still in progress
    const { data: callReports, error } = await supabase
      .from('call_reports')
      .select(`
        *,
        evaluator_assignments (
          id,
          evaluator_id,
          status,
          evaluator:evaluator_id (name, email)
        )
      `)
      .lt('evaluations_deadline', new Date().toISOString())
      .eq('evaluation_status', 'in_progress')
      .gt('completed_internal_evaluations', 2); // At least 3 evaluations were completed

    if (error) {
      console.error('Error fetching overdue evaluations:', error);
      return { success: false, error: error.message };
    }

    if (!callReports || callReports.length === 0) {
    
      return { success: true, count: 0 };
    }

    // For each overdue call report, update its status and evaluator assignments
    for (const report of callReports) {
      // Update call report status
      const { error: updateError } = await supabase
        .from('call_reports')
        .update({ 
          evaluation_status: 'completed_after_deadline',
          updated_at: new Date().toISOString()
        })
        .eq('id', report.id);

      if (updateError) {
        console.error(`Error updating call report ${report.id} status:`, updateError);
        continue;
      }

      // Update pending evaluator assignments
      for (const assignment of report.evaluator_assignments) {
        if (assignment.status !== 'completed') {
          await supabase
            .from('evaluator_assignments')
            .update({ 
              status: 'expired_after_deadline',
              completed_at: new Date().toISOString()
            })
            .eq('id', assignment.id);
        }
      }

      // Optionally notify stakeholders
      await notifyStakeholdersOfDeadline(report);
    }

    return { 
      success: true, 
      count: callReports.length,
      message: `Processed ${callReports.length} overdue call reports`
    };
  } catch (error) {
    console.error('Error in checkOverdueEvaluations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Notify stakeholders when an evaluation proceeds after deadline
 */
async function notifyStakeholdersOfDeadline(callReport: any) {
  try {
    const supabase = createAdminClient();

    // Get content managers, management, and executives
    const { data: stakeholders } = await supabase
      .from('users')
      .select('id')
      .in('role', ['content_manager', 'management', 'executive'])
      .eq('status', 'active');

    if (!stakeholders || stakeholders.length === 0) {
      logger.warn('No stakeholders found to notify about evaluation deadline');
      return;
    }

    const stakeholderIds = stakeholders.map(s => s.id);

    // Create in-app notifications
    await createNotifications(
      stakeholderIds,
      'info',
      'Evaluation Period Completed',
      `Call report "${callReport.title || 'Untitled'}" has completed its evaluation period with ${callReport.completed_evaluations || 0} evaluations. Decision has been made automatically.`,
      'call_report',
      callReport.id
    );

    logger.info(`Notified ${stakeholderIds.length} stakeholders about evaluation deadline completion for call report ${callReport.id}`);
  } catch (error) {
    logger.error('Failed to notify stakeholders of deadline:', error);
  }
}

/**
 * Notify content_heads about their pending evaluations
 */
export async function notifyContentHeadsOfPendingEvaluations() {
  try {
    const supabase = createAdminClient();

    // Get all pending evaluator assignments for content_heads
    const { data: pendingAssignments } = await supabase
      .from('evaluator_assignments')
      .select(`
        id,
        call_report_id,
        evaluator_id,
        team_id,
        call_reports!inner(id, working_title, created_at, team_id)
      `)
      .eq('status', 'pending');

    if (!pendingAssignments || pendingAssignments.length === 0) {
      logger.info('No pending evaluations for content heads');
      return { success: true, notified: 0 };
    }

    // Group assignments by content_head (evaluator_id)
    const groupedByContentHead = pendingAssignments.reduce((acc, assignment) => {
      const contentHeadId = assignment.evaluator_id;
      if (!acc[contentHeadId]) {
        acc[contentHeadId] = [];
      }
      acc[contentHeadId].push(assignment);
      return acc;
    }, {} as Record<string, typeof pendingAssignments>);

    // Create notifications for each content_head
    let notifiedCount = 0;
    for (const [contentHeadId, assignments] of Object.entries(groupedByContentHead)) {
      try {
        await createNotification({
          userId: contentHeadId,
          type: 'info',
          title: `${assignments.length} Pending Evaluation${assignments.length > 1 ? 's' : ''}`,
          message: `You have ${assignments.length} call report${assignments.length > 1 ? 's' : ''} from your team waiting for your evaluation.`,
          entityType: 'evaluator_assignment',
          entityId: assignments[0].id
        });
        notifiedCount++;
      } catch (error) {
        logger.error(`Failed to notify content_head ${contentHeadId}:`, error);
      }
    }

    logger.info(`Notified ${notifiedCount} content heads about ${pendingAssignments.length} pending evaluations`);
    return { success: true, notified: notifiedCount };
  } catch (error) {
    logger.error('Failed to notify content heads:', error);
    return { success: false, error };
  }
}
// Lightweight Resend client via REST to avoid bundling heavy peer deps

interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, text, html }: EmailData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not configured. Skipping email sending.');
    return { success: true, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev', // In production, use your verified domain
        to,
        subject,
        text,
        html
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Error sending email:', err);
      return { success: false, error: err?.message || `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an evaluation reminder email
 */
export async function sendEvaluationReminderEmail({
  evaluatorName,
  evaluatorEmail,
  callReportTitle,
  callReportId,
  reminderCount
}: {
  evaluatorName: string;
  evaluatorEmail: string;
  callReportTitle: string;
  callReportId: string;
  reminderCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const subject = `Reminder: Complete Your Evaluation for "${callReportTitle}" - ${reminderCount > 1 ? `Reminder #${reminderCount}` : 'Final reminder'}`;
  
  const text = `
    Dear ${evaluatorName},
    
    This is a reminder to complete your evaluation for the call report "${callReportTitle}".
    
    At least 3 other evaluators have already completed their evaluations, 
    and we're waiting for your input to proceed. The system will automatically 
    proceed after 5 days from when the 3rd evaluation was submitted if your 
    evaluation is not completed by then.
    
    Please complete your evaluation at your earliest convenience:
    ${process.env.NEXT_PUBLIC_APP_URL}/content-department/evaluations/evaluate/${callReportId}
    
    Thank you for your contribution to the evaluation process.
    
    Best regards,
    Content Evaluation System
  `;

  const html = `
    <p>Dear ${evaluatorName},</p>
    
    <p>This is a reminder to complete your evaluation for the call report <strong>"${callReportTitle}"</strong>.</p>
    
    <p>At least 3 other evaluators have already completed their evaluations, 
    and we're waiting for your input to proceed. The system will automatically 
    proceed after 5 days from when the 3rd evaluation was submitted if your 
    evaluation is not completed by then.</p>
    
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/content-department/evaluations/evaluate/${callReportId}">
    Click here to complete your evaluation</a></p>
    
    <p>Thank you for your contribution to the evaluation process.</p>
    
    <p>Best regards,<br />
    Content Evaluation System</p>
  `;

  return await sendEmail({
    to: evaluatorEmail,
    subject,
    text,
    html
  });
}
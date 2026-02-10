import { NextRequest } from 'next/server';
import { logger } from "@/lib/logger";
import { runDailyEvaluationReminders, checkOverdueEvaluations } from '@/lib/evaluations/reminders';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

// This API route can be called by an external cron job
// Example: curl -X POST https://your-app.com/api/evaluation-reminders/run
export async function POST(request: NextRequest) {
  const rate = await applyRateLimit(request, RateLimitPresets.standard);
  if (!rate.success) return rate.response!;

  const authHeader = request.headers.get('authorization');
  
  // Basic authentication check - in production, use a secure token
  const authSecret = process.env.EVALUATION_REMINDER_SECRET;
  if (!authSecret || authHeader !== `Bearer ${authSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Run the daily reminders
    const reminderResult = await runDailyEvaluationReminders();
    
    // Check for any overdue evaluations that need to proceed after deadline
    const overdueResult = await checkOverdueEvaluations();
    
    return new Response(
      JSON.stringify({
        success: true,
        reminders: reminderResult,
        overdueEvaluations: overdueResult,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error("Error running evaluation reminders", { error, context: "POST /api/evaluation-reminders" });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to run evaluation reminders'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// GET endpoint for testing (optional)
export async function GET(request: NextRequest) {
  const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
  if (!rate.success) return rate.response!;

  // For security reasons, you might want to disable this in production
  // or use the same authentication as POST
  const authHeader = request.headers.get('authorization');
  const authSecret = process.env.EVALUATION_REMINDER_SECRET;
  
  if (process.env.NODE_ENV === 'production' && (!authSecret || authHeader !== `Bearer ${authSecret}`)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({ 
      message: 'Evaluation reminder API - POST to run reminders',
      instructions: 'Send POST request with Authorization: Bearer <secret>' 
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
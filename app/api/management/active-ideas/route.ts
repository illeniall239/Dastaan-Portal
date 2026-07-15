import { NextRequest } from 'next/server';
import { getActiveIdeasDetails } from '@/lib/management/active-ideas-details';
import { getCurrentUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has management role
    const user = await getCurrentUser();
    
    if (!user || !['admin', 'management', 'executive', 'management_viewer'].includes(user.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    // Get active ideas details
    const ideasData = await getActiveIdeasDetails();

    return new Response(JSON.stringify(ideasData.details), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching active ideas:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch active ideas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
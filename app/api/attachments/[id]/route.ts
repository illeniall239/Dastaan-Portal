import { NextRequest } from 'next/server';
import { logger } from "@/lib/logger";
import { getCurrentUser } from '@/lib/auth';
import { getAttachmentById, getSignedUrlServer } from '@/lib/attachments/server';
import { idParamSchema } from '@/lib/validations/uuid-params';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimit } from '@/lib/api-middleware';
import { RateLimitPresets } from '@/lib/rate-limit-redis';

/**
 * Check if a user has access to a specific entity
 * @param userId - The user ID
 * @param userRole - The user's role
 * @param entityType - The type of entity (call_report, story, episode, etc.)
 * @param entityId - The ID of the entity
 * @returns true if user has access, false otherwise
 */
async function checkEntityAccess(
  userId: string,
  userRole: string,
  entityType: string,
  entityId: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    switch (entityType) {
      case 'call_report':
      case 'one_liner':
        // Check if user is assigned as evaluator for this call report
        const { data: evaluatorForm } = await supabase
          .from('evaluator_forms')
          .select('id')
          .eq('call_report_id', entityId)
          .eq('evaluator_id', userId)
          .single();

        if (evaluatorForm) return true;

        // Check if user is the content manager who created this call report
        const { data: callReport } = await supabase
          .from('call_reports')
          .select('created_by')
          .eq('id', entityId)
          .single();

        if (callReport && callReport.created_by === userId) return true;

        // Management, executive, and programmer roles can access all call reports
        if (['management', 'executive', 'content_manager', 'content_head', 'programmer'].includes(userRole)) {
          return true;
        }

        break;

      case 'episode':
        // Check if user is assigned as evaluator for this episode
        const { data: episodicEval } = await supabase
          .from('episodic_evaluations')
          .select('id')
          .eq('episode_id', entityId)
          .eq('evaluator_id', userId)
          .single();

        if (episodicEval) return true;

        // Check if user is the content manager who created this episode
        const { data: episode } = await supabase
          .from('episodes')
          .select('created_by')
          .eq('id', entityId)
          .single();

        if (episode && episode.created_by === userId) return true;

        // Management, executive, and programmer roles can access all episodes
        if (['management', 'executive', 'content_manager', 'content_head', 'programmer'].includes(userRole)) {
          return true;
        }

        break;

      case 'story':
        // Check if user created the story
        const { data: story } = await supabase
          .from('stories')
          .select('created_by')
          .eq('id', entityId)
          .single();

        if (story && story.created_by === userId) return true;

        // Management, executive, programmer, and content roles can access stories
        if (['management', 'executive', 'content_manager', 'gcm', 'content_head', 'content_creator', 'programmer'].includes(userRole)) {
          return true;
        }

        break;

      case 'contract':
        // Legal, finance, management, executive, and programmer roles can access contracts
        if (['legal', 'finance', 'management', 'executive', 'admin', 'programmer'].includes(userRole)) {
          return true;
        }

        break;

      default:
        // For unknown entity types, deny access unless admin
        logger.warn(`Unknown entity type for access check: ${entityType}`);
        return false;
    }

    return false;
  } catch (error) {
    logger.error(`Error checking entity access: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rate = await applyRateLimit(request, RateLimitPresets.relaxed);
    if (!rate.success) return rate.response!;

    // Verify user authentication
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Validate UUID format
    const paramValidation = idParamSchema.safeParse({ id });
    if (!paramValidation.success) {
      return new Response(JSON.stringify({
        message: 'Invalid ID format',
        details: paramValidation.error.format()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get attachment details
    const attachment = await getAttachmentById(id);

    // Verify user has access to this attachment
    // Allow if: uploader, admin, or has access to the entity
    const isUploader = attachment.uploaded_by === user.id;
    const isAdmin = user.role === 'admin';
    const hasEntityAccess = await checkEntityAccess(user.id, user.role, attachment.entity_type, attachment.entity_id);

    if (!isUploader && !isAdmin && !hasEntityAccess) {
      logger.warn(`Access denied for user ${user.id} to attachment ${id}`, {
        userId: user.id,
        userRole: user.role,
        attachmentId: id,
        entityType: attachment.entity_type,
        entityId: attachment.entity_id,
      });
      return new Response(JSON.stringify({ message: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get signed URL for the file
    const signedUrl = await getSignedUrlServer(attachment.file_path);

    // Return a redirect response
    return Response.redirect(signedUrl as unknown as URL, 307);
  } catch (error) {
    logger.error(`Error serving attachment: ${error instanceof Error ? error.message : String(error)}`);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
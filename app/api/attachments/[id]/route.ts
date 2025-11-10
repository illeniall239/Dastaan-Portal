import { NextRequest } from 'next/server';
import { logger } from "@/lib/logger";
import { getCurrentUser } from '@/lib/auth';
import { getAttachmentById, getSignedUrlServer } from '@/lib/attachments/server';
import { idParamSchema } from '@/lib/validations/uuid-params';
import { redirect } from 'next/navigation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    
    // Verify user has access to this attachment (for now, allow content creators)
    if (user.role !== 'content_creator') {
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
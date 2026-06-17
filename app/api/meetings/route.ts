import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyRateLimit } from "@/lib/api-middleware";
import { RateLimitPresets } from "@/lib/rate-limit-redis";
import { logAuditAction, getRequestContext } from "@/lib/audit/server";
import { logger } from "@/lib/logger";
import { createNotifications } from "@/lib/notifications/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/meetings - List meetings with team isolation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.relaxed, user.id);
    if (!rate.success) return rate.response!;

    // Get user's team and role for team isolation
    const { data: currentUser } = await supabase
      .from("users")
      .select("team_id, role")
      .eq("id", user.id)
      .single();

    let query = supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: true });

    // Team isolation: only admin/management/programmer see all
    const hasGlobalAccess =
      currentUser?.role &&
      ["admin", "management", "programmer"].includes(currentUser.role);
    if (!hasGlobalAccess && currentUser?.team_id) {
      query = query.eq("team_id", currentUser.team_id);
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate) query = query.gte("meeting_date", startDate);
    if (endDate) query = query.lte("meeting_date", endDate);

    const { data, error } = await query.limit(200);

    if (error) {
      logger.error("Error fetching meetings:", { error });
      return NextResponse.json(
        { error: "Failed to fetch meetings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ meetings: data || [] });
  } catch (error) {
    logger.error("Meetings GET error:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings - Create a new meeting
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = await applyRateLimit(request, RateLimitPresets.standard, user.id);
    if (!rate.success) return rate.response!;

    const body = await request.json();

    if (!body.title || !body.meeting_date) {
      return NextResponse.json(
        { error: "Title and meeting date are required" },
        { status: 400 }
      );
    }

    // Resolve user's team_id
    const { data: userProfile } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single();

    let teamId = userProfile?.team_id || null;

    // Fallback: check if user is a team head
    if (!teamId) {
      const { data: ownedTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("team_head_id", user.id)
        .single();

      if (ownedTeam?.id) {
        teamId = ownedTeam.id;
        await supabase
          .from("users")
          .update({ team_id: teamId })
          .eq("id", user.id);
      }
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Your account is not assigned to a team. Contact an administrator." },
        { status: 400 }
      );
    }

    const { data: meeting, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title: body.title,
        meeting_date: body.meeting_date,
        duration_minutes: body.duration_minutes || 60,
        location: body.location || null,
        notes: body.notes || null,
        agenda: body.agenda || null,
        contact_name: body.contact_name || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        contact_type: body.contact_type || null,
        attendees: body.attendees || [],
        category: body.category || null,
        status: "scheduled",
        team_id: teamId,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("Error creating meeting:", { error: insertError });
      return NextResponse.json(
        { error: "Failed to create meeting" },
        { status: 500 }
      );
    }

    // Notify team members + team head + management of new meeting
    // Uses admin client to bypass RLS (notifications table blocks authenticated-user inserts)
    try {
      const adminClient = createAdminClient();

      // Get all members of this team
      const { data: teamUsers } = await adminClient
        .from("users")
        .select("id")
        .eq("team_id", teamId)
        .eq("status", "active");

      // Get team head explicitly (ensures notification even if team_id edge cases exist)
      const { data: teamRecord } = await adminClient
        .from("teams")
        .select("team_head_id")
        .eq("id", teamId)
        .single();

      // Get all management + admin users
      const { data: mgmtUsers } = await adminClient
        .from("users")
        .select("id")
        .in("role", ["management", "admin"])
        .eq("status", "active");

      const recipientSet = new Set<string>([
        ...(teamUsers || []).map((u: { id: string }) => u.id),
        ...(teamRecord?.team_head_id ? [teamRecord.team_head_id] : []),
        ...(mgmtUsers || []).map((u: { id: string }) => u.id),
      ]);
      recipientSet.delete(user.id); // exclude creator

      const recipients = Array.from(recipientSet);

      if (recipients.length > 0) {
        const meetingDate = new Date(body.meeting_date);
        const formattedDate = meetingDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = meetingDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        await createNotifications(
          recipients,
          "info",
          `New meeting scheduled: ${body.title}`,
          body.contact_name
            ? `Meeting with ${body.contact_name} on ${formattedDate} at ${formattedTime}`
            : `Meeting on ${formattedDate} at ${formattedTime}`,
          "meeting_scheduled",
          meeting.id,
          user.id
        );
      }
    } catch (notifError) {
      logger.error("Failed to create meeting notifications:", { error: notifError });
    }

    // Audit log
    const requestContext = getRequestContext(request);
    await logAuditAction({
      entityType: "meeting",
      entityId: meeting.id,
      action: "created",
      performedBy: user.id,
      details: {
        ...requestContext,
        newValues: { title: body.title, contact: body.contact_name, date: body.meeting_date },
      },
    }).catch(err => logger.error("Audit log failed", { error: err }));

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    logger.error("Meetings POST error:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

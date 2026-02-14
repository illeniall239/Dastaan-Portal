import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface WriterEngagementData {
  id: string;
  writer_id: string;
  date_engaged: string;
  time_slot?: string;
  notes?: string;
  created_by?: string;
  team_id?: string;
  creator?: { id: string; name: string } | null;
  writer?: { id: string; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface WriterData {
  id: string;
  name: string;
}

/**
 * Server-side fetch for writer engagements with team isolation.
 * Mirrors the logic in app/api/writers/route.ts GET handler.
 */
export async function getWriterEngagements(
  dateFrom: string,
  dateTo: string
): Promise<{ engagements: WriterEngagementData[]; writers: WriterData[] }> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { engagements: [], writers: [] };
  }

  // Fetch user's team_id and role for team isolation
  const { data: currentUser } = await supabase
    .from("users")
    .select("team_id, role")
    .eq("id", user.id)
    .single();

  // Build engagements query
  let query = supabase
    .from("writer_engagements")
    .select(
      `
      id,
      writer_id,
      date_engaged,
      time_slot,
      notes,
      created_by,
      team_id,
      created_at,
      updated_at,
      writer:writers (id, name)
    `
    )
    .gte("date_engaged", dateFrom)
    .lte("date_engaged", dateTo)
    .order("date_engaged", { ascending: false })
    .order("time_slot", { ascending: true });

  // TEAM ISOLATION: Only admin/management/programmer see all engagements
  const hasGlobalAccess =
    currentUser?.role &&
    ["admin", "management", "programmer"].includes(currentUser.role);
  if (!hasGlobalAccess) {
    if (currentUser?.team_id) {
      query = query.eq("team_id", currentUser.team_id);
    } else {
      query = query.eq("created_by", user.id);
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error("Failed to fetch writer engagements:", error);
    return { engagements: [], writers: [] };
  }

  // Batch-fetch creator names
  const createdByIds = [
    ...new Set((data || []).map((d: any) => d.created_by).filter(Boolean)),
  ] as string[];

  let creatorsMap: Record<string, { id: string; name: string }> = {};
  if (createdByIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name")
      .in("id", createdByIds);
    if (usersData) {
      creatorsMap = Object.fromEntries(
        usersData.map((u: { id: string; name: string }) => [
          u.id,
          { id: u.id, name: u.name },
        ])
      );
    }
  }

  const engagements: WriterEngagementData[] = (data || []).map((d: any) => ({
    ...d,
    creator: d.created_by ? creatorsMap[d.created_by] || null : null,
  }));

  // Fetch active writers list
  const { data: writersData } = await supabase
    .from("writers")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });

  return {
    engagements,
    writers: (writersData || []) as WriterData[],
  };
}

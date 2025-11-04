import { createClient } from '@/lib/supabase/server';

export interface ActiveProject {
  id: string;
  story_id: string;
  title: string;
  status: string;
  genre: string;
  creator_name: string;
  creator_id: string;
  days_active: number;
  last_update: string;
  created_at: string;
}

export async function getActiveProjects() {
  const supabase = await createClient();

  // Query stories with inner join to call_reports to filter by meeting_type
  // This excludes scheduled meetings (which are not actual story projects)
  const { data: rawStories, error } = await supabase
    .from('stories')
    .select(`
      id,
      story_id,
      title,
      status,
      genre,
      created_at,
      updated_at,
      created_by,
      creator:users!stories_created_by_fkey (
        id,
        name
      ),
      call_reports!inner (
        meeting_type
      )
    `)
    .not('status', 'in', '(completed,rejected,archived)')
    .eq('call_reports.meeting_type', 'call_report')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching active projects:', error);
    return [];
  }

  const now = new Date();

  // Extract story data from joined result
  const activeProjects: ActiveProject[] = (rawStories || []).map((item: any) => {
    const createdAt = new Date(item.created_at);
    const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: item.id,
      story_id: item.story_id,
      title: item.title,
      status: item.status,
      genre: item.genre || 'Unspecified',
      creator_name: item.creator?.name || 'Unknown',
      creator_id: item.creator?.id || '',
      days_active: daysActive,
      last_update: item.updated_at,
      created_at: item.created_at,
    };
  });

  return activeProjects;
}

export async function getActiveProjectsStats() {
  const projects = await getActiveProjects();

  const stats = {
    total: projects.length,
    byStatus: {} as Record<string, number>,
    byGenre: {} as Record<string, number>,
    avgDaysActive: 0,
  };

  projects.forEach(project => {
    // Count by status
    stats.byStatus[project.status] = (stats.byStatus[project.status] || 0) + 1;

    // Count by genre
    stats.byGenre[project.genre] = (stats.byGenre[project.genre] || 0) + 1;
  });

  // Calculate average days active
  if (projects.length > 0) {
    stats.avgDaysActive = Math.round(
      projects.reduce((sum, p) => sum + p.days_active, 0) / projects.length
    );
  }

  return stats;
}

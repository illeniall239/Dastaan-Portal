import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Episodes & Episodic Evaluations Analytics for Management Dashboard
 */

export interface EpisodeOverview {
  totalEpisodes: number;
  episodesBySource: {
    callReports: number;
    stories: number;
  };
  pendingEvaluation: number;
  evaluated: number;
  avgPages: number;
  avgScenes: number;
}

export interface EpisodicEvaluationOverview {
  totalEvaluations: number;
  avgOverallScore: number;
  completionRate: number;
  gradeDistribution: {
    [key: string]: number; // A+, A, B+, B, C
  };
  criteriaAverages: {
    conflict: number;
    characterization: number;
    progression: number;
    freezes: number;
    whatsNext: number;
  };
}

export interface EpisodeProductionTrend {
  date: string;
  callReportEpisodes: number;
  storyEpisodes: number;
  total: number;
}

export interface QualityDistribution {
  pagesDistribution: {
    belowStandard: number; // <40
    nearStandard: number; // 40-44
    standard: number; // 45-50
    aboveStandard: number; // >50
  };
  scenesDistribution: {
    belowStandard: number; // <20
    nearStandard: number; // 20-21
    standard: number; // 22-25
    aboveStandard: number; // >25
  };
}

/**
 * Get episodes overview statistics
 */
export async function getEpisodeOverview(): Promise<EpisodeOverview> {
  const supabase = createAdminClient();

  try {
    // Get all episodes
    const { data: episodes } = await supabase
      .from("episodes")
      .select("id, call_report_id, story_id, no_of_pages, no_of_scenes");

    // Get evaluated episodes
    const { data: evaluations } = await supabase
      .from("episodic_evaluations")
      .select("episode_id");

    const totalEpisodes = episodes?.length || 0;
    const callReportEpisodes = episodes?.filter(e => e.call_report_id)?.length || 0;
    const storyEpisodes = episodes?.filter(e => e.story_id)?.length || 0;
    const evaluatedSet = new Set(evaluations?.map(e => e.episode_id) || []);

    const avgPages = episodes && episodes.length > 0
      ? episodes.reduce((sum, e) => sum + (e.no_of_pages || 0), 0) / episodes.length
      : 0;

    const avgScenes = episodes && episodes.length > 0
      ? episodes.reduce((sum, e) => sum + (e.no_of_scenes || 0), 0) / episodes.length
      : 0;

    return {
      totalEpisodes,
      episodesBySource: {
        callReports: callReportEpisodes,
        stories: storyEpisodes,
      },
      pendingEvaluation: totalEpisodes - evaluatedSet.size,
      evaluated: evaluatedSet.size,
      avgPages: Math.round(avgPages * 10) / 10,
      avgScenes: Math.round(avgScenes * 10) / 10,
    };
  } catch (error) {
    console.error("Error fetching episode overview:", error);
    return {
      totalEpisodes: 0,
      episodesBySource: { callReports: 0, stories: 0 },
      pendingEvaluation: 0,
      evaluated: 0,
      avgPages: 0,
      avgScenes: 0,
    };
  }
}

/**
 * Get episodic evaluations overview
 */
export async function getEpisodicEvaluationOverview(): Promise<EpisodicEvaluationOverview> {
  const supabase = createAdminClient();

  try {
    const { data: evaluations } = await supabase
      .from("episodic_evaluations")
      .select(`
        overall_average,
        overall_grade,
        conflict_of_content_score,
        characterization_score,
        story_progression_score,
        freezes_score,
        whats_next_element_score
      `);

    const { data: episodes } = await supabase
      .from("episodes")
      .select("id");

    const totalEvaluations = evaluations?.length || 0;
    const totalEpisodes = episodes?.length || 0;

    // Calculate averages
    const avgOverallScore = evaluations && evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + e.overall_average, 0) / evaluations.length
      : 0;

    // Grade distribution
    const gradeDistribution: { [key: string]: number } = {
      "A+": 0,
      "A": 0,
      "B+": 0,
      "B": 0,
      "C": 0,
    };
    evaluations?.forEach(e => {
      if (e.overall_grade in gradeDistribution) {
        gradeDistribution[e.overall_grade]++;
      }
    });

    // Criteria averages
    const criteriaAverages = {
      conflict: 0,
      characterization: 0,
      progression: 0,
      freezes: 0,
      whatsNext: 0,
    };

    if (evaluations && evaluations.length > 0) {
      criteriaAverages.conflict = evaluations.reduce((sum, e) => sum + e.conflict_of_content_score, 0) / evaluations.length;
      criteriaAverages.characterization = evaluations.reduce((sum, e) => sum + e.characterization_score, 0) / evaluations.length;
      criteriaAverages.progression = evaluations.reduce((sum, e) => sum + e.story_progression_score, 0) / evaluations.length;
      criteriaAverages.freezes = evaluations.reduce((sum, e) => sum + e.freezes_score, 0) / evaluations.length;
      criteriaAverages.whatsNext = evaluations.reduce((sum, e) => sum + e.whats_next_element_score, 0) / evaluations.length;
    }

    return {
      totalEvaluations,
      avgOverallScore: Math.round(avgOverallScore * 10) / 10,
      completionRate: totalEpisodes > 0 ? Math.round((totalEvaluations / totalEpisodes) * 100) : 0,
      gradeDistribution,
      criteriaAverages: {
        conflict: Math.round(criteriaAverages.conflict * 10) / 10,
        characterization: Math.round(criteriaAverages.characterization * 10) / 10,
        progression: Math.round(criteriaAverages.progression * 10) / 10,
        freezes: Math.round(criteriaAverages.freezes * 10) / 10,
        whatsNext: Math.round(criteriaAverages.whatsNext * 10) / 10,
      },
    };
  } catch (error) {
    console.error("Error fetching episodic evaluation overview:", error);
    return {
      totalEvaluations: 0,
      avgOverallScore: 0,
      completionRate: 0,
      gradeDistribution: { "A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0 },
      criteriaAverages: {
        conflict: 0,
        characterization: 0,
        progression: 0,
        freezes: 0,
        whatsNext: 0,
      },
    };
  }
}

/**
 * Get episode production trends (weekly)
 */
export async function getEpisodeProductionTrends(days: number = 90): Promise<EpisodeProductionTrend[]> {
  const supabase = createAdminClient();

  try {
    const { data: episodes } = await supabase
      .from("episodes")
      .select("created_at, call_report_id, story_id")
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true });

    if (!episodes || episodes.length === 0) {
      return [];
    }

    // Group by week
    const weeklyData: { [key: string]: { callReport: number; story: number } } = {};

    episodes.forEach(episode => {
      const date = new Date(episode.created_at);
      // Get Monday of the week
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = monday.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { callReport: 0, story: 0 };
      }

      if (episode.call_report_id) {
        weeklyData[weekKey].callReport++;
      } else if (episode.story_id) {
        weeklyData[weekKey].story++;
      }
    });

    return Object.keys(weeklyData)
      .sort()
      .map(date => ({
        date,
        callReportEpisodes: weeklyData[date].callReport,
        storyEpisodes: weeklyData[date].story,
        total: weeklyData[date].callReport + weeklyData[date].story,
      }));
  } catch (error) {
    console.error("Error fetching episode production trends:", error);
    return [];
  }
}

/**
 * Get quality distribution for pages and scenes
 */
export async function getQualityDistribution(): Promise<QualityDistribution> {
  const supabase = createAdminClient();

  try {
    const { data: episodes } = await supabase
      .from("episodes")
      .select("no_of_pages, no_of_scenes");

    if (!episodes || episodes.length === 0) {
      return {
        pagesDistribution: {
          belowStandard: 0,
          nearStandard: 0,
          standard: 0,
          aboveStandard: 0,
        },
        scenesDistribution: {
          belowStandard: 0,
          nearStandard: 0,
          standard: 0,
          aboveStandard: 0,
        },
      };
    }

    const pagesDistribution = {
      belowStandard: episodes.filter(e => (e.no_of_pages || 0) < 40).length,
      nearStandard: episodes.filter(e => (e.no_of_pages || 0) >= 40 && (e.no_of_pages || 0) < 45).length,
      standard: episodes.filter(e => (e.no_of_pages || 0) >= 45 && (e.no_of_pages || 0) <= 50).length,
      aboveStandard: episodes.filter(e => (e.no_of_pages || 0) > 50).length,
    };

    const scenesDistribution = {
      belowStandard: episodes.filter(e => (e.no_of_scenes || 0) < 20).length,
      nearStandard: episodes.filter(e => (e.no_of_scenes || 0) >= 20 && (e.no_of_scenes || 0) < 22).length,
      standard: episodes.filter(e => (e.no_of_scenes || 0) >= 22 && (e.no_of_scenes || 0) <= 25).length,
      aboveStandard: episodes.filter(e => (e.no_of_scenes || 0) > 25).length,
    };

    return {
      pagesDistribution,
      scenesDistribution,
    };
  } catch (error) {
    console.error("Error fetching quality distribution:", error);
    return {
      pagesDistribution: {
        belowStandard: 0,
        nearStandard: 0,
        standard: 0,
        aboveStandard: 0,
      },
      scenesDistribution: {
        belowStandard: 0,
        nearStandard: 0,
        standard: 0,
        aboveStandard: 0,
      },
    };
  }
}

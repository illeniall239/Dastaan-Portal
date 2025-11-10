/**
 * Comprehensive Sample Data Generator for Management Dashboard
 * Includes ALL sections with Roman Urdu drama names and full drill-down data
 */

// Roman Urdu Drama Names
const DRAMA_NAMES = [
  "Zindagi Gulzar Hai",
  "Ishq Aur Junoon",
  "Dil Ki Dastaan",
  "Mohabbat Ka Safar",
  "Mera Dil Mera Dushman",
  "Tere Bina Jeena",
  "Khuda Aur Mohabbat",
  "Pyar Ka Dard",
  "Humsafar",
  "Dil Ruba",
  "Mere Paas Tum Ho",
  "Ehd-e-Wafa",
  "Alif",
  "Suno Chanda",
  "Yakeen Ka Safar",
];

// Evaluator Names (Obviously Demo/Sample Data)
const EVALUATORS = [
  { id: 'eval-1', name: 'Sample Evaluator Alpha' },
  { id: 'eval-2', name: 'Sample Evaluator Beta' },
  { id: 'eval-3', name: 'Sample Evaluator Gamma' },
  { id: 'eval-4', name: 'Sample Evaluator Delta' },
  { id: 'eval-5', name: 'Sample Evaluator Epsilon' },
  { id: 'eval-6', name: 'Sample Evaluator Zeta' },
  { id: 'eval-7', name: 'Sample Evaluator Eta' },
];

// Writer Names
const WRITERS = [
  "Khalil-ur-Rehman Qamar",
  "Farhat Ishtiaq",
  "Umera Ahmed",
  "Saji Gul",
  "Asma Nabeel",
  "Bee Gul",
  "Amna Mufti",
];

// Helper to get random item
const getRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to get random number in range
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get date N days ago
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

/**
 * Generate sample executive summary
 */
export function getSampleExecutiveSummary() {
  return {
    totalActiveProjects: 24,
    pipelineValue: 45000000,
    activeContracts: 8,
    overduePayments: 3,
    weeklyActivities: 47,
  };
}

/**
 * Generate sample pipeline funnel
 */
export function getSamplePipelineFunnel() {
  return {
    submitted: 12,
    in_evaluation: 15,
    approved: 18,
    in_contractTerm: 11,
    in_legal_review: 6,
    contracted: 8,
    in_payment: 4,
    completed: 67,
    archived: 15,
  };
}

/**
 * Generate sample financial overview
 */
export function getSampleFinancialOverview() {
  return {
    committedFunds: 25000000,
    pendingFunds: 8500000,
    totalPendingPayments: 4200000,
    totalApprovedPayments: 6800000,
    totalPaidAmount: 14500000,
    overduePaymentsCount: 3,
    topProjectsByValue: [
      { id: 'st-1', title: 'Zindagi Gulzar Hai', value: 5500000 },
      { id: 'st-2', title: 'Ishq Aur Junoon', value: 4800000 },
      { id: 'st-3', title: 'Dil Ki Dastaan', value: 4200000 },
    ],
  };
}

/**
 * Generate sample performance metrics
 */
export function getSamplePerformanceMetrics() {
  return {
    avgEvaluationScore: 7.8,
    avgEvaluationTurnaround: 3.5,
    approvalRate: 68,
    contractConversionRate: 45,
    avgLegalReviewDuration: 6.2,
    paymentPunctuality: 82,
  };
}

/**
 * Generate sample department workload
 */
export function getSampleDepartmentWorkload() {
  return {
    contentTeam: { activeCallReports: 23, pendingEvaluations: 15 },
    executives: { pendingApprovals: 7 },
    legal: { reviewsInProgress: 6 },
    finance: { pendingPaymentApprovals: 8 },
    evaluators: { assignedEvaluations: 45, completedEvaluations: 665 },
  };
}

/**
 * Generate sample critical alerts
 */
export function getSampleCriticalAlerts() {
  return [
    {
      id: 'alert-1',
      type: 'payment_overdue' as const,
      severity: 'critical' as const,
      title: 'Payment Overdue',
      description: '"Ishq Aur Junoon" payment is 12 days overdue',
      affectedEntity: 'Ishq Aur Junoon',
      entityId: 'cr-001',
      daysDelayed: 12,
      createdAt: daysAgo(12),
    },
    {
      id: 'alert-2',
      type: 'stuck_story' as const,
      severity: 'critical' as const,
      title: 'Story stuck in negotiation',
      description: '"Dil Ki Dastaan" has not been updated for 35 days',
      affectedEntity: 'Dil Ki Dastaan',
      entityId: 'st-002',
      daysDelayed: 35,
      createdAt: daysAgo(35),
    },
    {
      id: 'alert-3',
      type: 'evaluation_delay' as const,
      severity: 'warning' as const,
      title: 'Evaluation pending',
      description: '"Mohabbat Ka Safar" awaiting evaluation for 9 days',
      affectedEntity: 'Mohabbat Ka Safar',
      entityId: 'cr-003',
      daysDelayed: 9,
      createdAt: daysAgo(9),
    },
    {
      id: 'alert-4',
      type: 'bottleneck' as const,
      severity: 'warning' as const,
      title: 'Bottleneck detected: in_evaluation',
      description: '18 stories (35%) are stuck in in_evaluation stage',
      affectedEntity: 'in_evaluation',
      entityId: 'in_evaluation',
      createdAt: daysAgo(3),
    },
    {
      id: 'alert-5',
      type: 'long_negotiation' as const,
      severity: 'warning' as const,
      title: 'Prolonged negotiation',
      description: '"Pyar Ka Dard" in contract terms for 28 days',
      affectedEntity: 'Pyar Ka Dard',
      entityId: 'st-004',
      daysDelayed: 28,
      createdAt: daysAgo(28),
    },
  ];
}

/**
 * Generate sample recent activity
 */
export function getSampleRecentActivity() {
  const activities = [
    {
      id: 'act-1',
      action: 'submitted_evaluation',
      description: 'Evaluation submitted for "Zindagi Gulzar Hai"',
      entityType: 'evaluation',
      entityName: 'Zindagi Gulzar Hai',
      entityId: 'cr-001',
      performedBy: 'Ahmed Raza Sheikh',
      performedByEmail: 'ahmed.raza.sheikh@geotv.com',
      timestamp: daysAgo(0.02), // ~30 minutes ago
      icon: 'evaluation' as const,
    },
    {
      id: 'act-2',
      action: 'submitted_episodic_evaluation',
      description: 'Episode 5 evaluation submitted for "Ishq Aur Junoon"',
      entityType: 'episode',
      entityName: 'Ishq Aur Junoon - Episode 5',
      entityId: 'ep-005',
      performedBy: 'Fatima Khan',
      performedByEmail: 'fatima.khan@geotv.com',
      timestamp: daysAgo(0.08), // ~2 hours ago
      icon: 'episode' as const,
    },
    {
      id: 'act-3',
      action: 'updated',
      description: 'Story status changed to in_approval',
      entityType: 'story',
      entityName: 'Dil Ki Dastaan',
      entityId: 'st-002',
      performedBy: 'Ali Haider Malik',
      performedByEmail: 'ali.haider.malik@geotv.com',
      timestamp: daysAgo(0.2), // ~5 hours ago
      icon: 'story' as const,
    },
    {
      id: 'act-4',
      action: 'approved',
      description: 'Approved "Mohabbat Ka Safar"',
      entityType: 'approval',
      entityName: 'Mohabbat Ka Safar',
      entityId: 'cr-003',
      performedBy: 'Ayesha Siddiqui',
      performedByEmail: 'ayesha.siddiqui@geotv.com',
      timestamp: daysAgo(0.5), // ~12 hours ago
      icon: 'approval' as const,
    },
    {
      id: 'act-5',
      action: 'payment_processed',
      description: 'Payment milestone completed for "Humsafar"',
      entityType: 'payment',
      entityName: 'Humsafar',
      entityId: 'pay-001',
      performedBy: 'Hassan Mahmood',
      performedByEmail: 'hassan.mahmood@geotv.com',
      timestamp: daysAgo(1),
      icon: 'payment' as const,
    },
    {
      id: 'act-6',
      action: 'submitted_evaluation',
      description: 'Evaluation submitted for "Pyar Ka Dard"',
      entityType: 'evaluation',
      entityName: 'Pyar Ka Dard',
      entityId: 'cr-004',
      performedBy: 'Sara Ahmed',
      performedByEmail: 'sara.ahmed@geotv.com',
      timestamp: daysAgo(1.2),
      icon: 'evaluation' as const,
    },
    {
      id: 'act-7',
      action: 'contract_signed',
      description: 'Contract signed for "Mere Paas Tum Ho"',
      entityType: 'contract',
      entityName: 'Mere Paas Tum Ho',
      entityId: 'con-001',
      performedBy: 'Usman Tariq',
      performedByEmail: 'usman.tariq@geotv.com',
      timestamp: daysAgo(2),
      icon: 'contract' as const,
    },
    {
      id: 'act-8',
      action: 'submitted_episodic_evaluation',
      description: 'Episode 12 evaluation submitted for "Ehd-e-Wafa"',
      entityType: 'episode',
      entityName: 'Ehd-e-Wafa - Episode 12',
      entityId: 'ep-012',
      performedBy: 'Ahmed Raza Sheikh',
      performedByEmail: 'ahmed.raza.sheikh@geotv.com',
      timestamp: daysAgo(3),
      icon: 'episode' as const,
    },
    {
      id: 'act-9',
      action: 'created',
      description: 'New story submitted: "Alif"',
      entityType: 'story',
      entityName: 'Alif',
      entityId: 'st-008',
      performedBy: 'Fatima Khan',
      performedByEmail: 'fatima.khan@geotv.com',
      timestamp: daysAgo(4),
      icon: 'story' as const,
    },
    {
      id: 'act-10',
      action: 'submitted_evaluation',
      description: 'Evaluation submitted for "Suno Chanda"',
      entityType: 'evaluation',
      entityName: 'Suno Chanda',
      entityId: 'cr-006',
      performedBy: 'Ali Haider Malik',
      performedByEmail: 'ali.haider.malik@geotv.com',
      timestamp: daysAgo(5),
      icon: 'evaluation' as const,
    },
  ];

  return activities;
}

/**
 * Generate sample episode overview
 */
export function getSampleEpisodeOverview() {
  return {
    totalEpisodes: 156,
    episodesBySource: { callReports: 98, stories: 58 },
    pendingEvaluation: 23,
    evaluated: 133,
    avgPages: 46.8,
    avgScenes: 23.2,
  };
}

/**
 * Generate sample episodic evaluation overview
 */
export function getSampleEpisodicEvaluationOverview() {
  return {
    totalEvaluations: 665,
    avgOverallScore: 38.5,
    completionRate: 85,
    gradeDistribution: {
      'A+': 45,
      'A': 125,
      'B+': 180,
      'B': 220,
      'C': 95,
    },
    criteriaAverages: {
      conflict: 7.8,
      characterization: 8.1,
      progression: 7.5,
      freezes: 7.9,
      whatsNext: 8.3,
    },
  };
}

/**
 * Generate sample episode production trends
 */
export function getSampleEpisodeProductionTrends() {
  return Array.from({ length: 12 }, (_, i) => ({
    date: daysAgo((11 - i) * 7),
    callReportEpisodes: randomInt(6, 15),
    storyEpisodes: randomInt(3, 10),
    total: 0, // will be calculated
  })).map(d => ({ ...d, total: d.callReportEpisodes + d.storyEpisodes }));
}

/**
 * Generate sample quality distribution
 */
export function getSampleQualityDistribution() {
  return {
    pagesDistribution: {
      'Below Standard': 18,
      'Near Standard': 45,
      'Standard': 68,
      'Above Standard': 25,
    },
    scenesDistribution: {
      'Below Standard': 22,
      'Near Standard': 38,
      'Standard': 72,
      'Above Standard': 24,
    },
  };
}

/**
 * Generate sample evaluator stats
 */
export function getSampleEvaluatorStats() {
  return EVALUATORS.map((evaluator, index) => ({
    id: evaluator.id,
    name: evaluator.name,
    email: `sample.evaluator.${String.fromCharCode(97 + index)}@demo.geotv.com`, // a, b, c, etc.
    oneLinerCount: randomInt(15, 35),
    episodicEvals: randomInt(30, 45),
    callReportEvals: randomInt(50, 65),
    totalEvaluations: randomInt(80, 110),
    avgTimeSpent: parseFloat((4 + Math.random() * 8).toFixed(1)), // 4 to 12 hours per evaluation
  }));
}

/**
 * Filter sample evaluator stats by time preset
 * Reduces counts proportionally based on time range
 */
export function filterSampleEvaluatorStatsByTimeRange(stats: ReturnType<typeof getSampleEvaluatorStats>, preset: string) {
  // Define multipliers for each time preset (what % of total activity falls in this range)
  const MULTIPLIERS: Record<string, number> = {
    'today': 0.02,      // ~2% of all-time activity happened today
    'week': 0.10,       // ~10% this week
    'month': 0.25,      // ~25% this month
    '7d': 0.15,         // ~15% in last 7 days
    '30d': 0.60,        // ~60% in last 30 days
    'all': 1.0,         // 100% for all time
  };

  const multiplier = MULTIPLIERS[preset] || 1.0;

  return stats.map((evaluator) => ({
    ...evaluator,
    oneLinerCount: Math.round(evaluator.oneLinerCount * multiplier),
    episodicEvals: Math.round(evaluator.episodicEvals * multiplier),
    callReportEvals: Math.round(evaluator.callReportEvals * multiplier),
    totalEvaluations: Math.round(evaluator.totalEvaluations * multiplier),
    // Avg time spent stays roughly the same (it's an average, not a total)
    avgTimeSpent: parseFloat((evaluator.avgTimeSpent * (0.9 + Math.random() * 0.2)).toFixed(1)),
  }));
}

/**
 * Generate sample evaluator activity heatmap
 */
export function getSampleEvaluatorActivityHeatmap() {
  return EVALUATORS.map((evaluator) => ({
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    weeklyActivity: Array.from({ length: 12 }, (_, week) => ({
      weekStart: daysAgo((11 - week) * 7),
      count: randomInt(0, 12),
    })),
  }));
}

/**
 * Generate sample pipeline overview
 */
export function getSamplePipelineOverview() {
  return {
    totalStories: 156,
    activePipeline: 89,
    completedThisMonth: 12,
    avgTimeToCompletion: 45.5,
    stages: [
      { stage: 'submitted', displayName: 'Submission', count: 12, avgTimeInStage: 3.2, conversionRate: 0, bottleneck: false },
      { stage: 'in_call_report', displayName: 'Call Report', count: 8, avgTimeInStage: 5.1, conversionRate: 0, bottleneck: false },
      { stage: 'in_evaluation', displayName: 'Evaluation', count: 15, avgTimeInStage: 8.5, conversionRate: 0, bottleneck: true },
      { stage: 'in_approval', displayName: 'Approval', count: 7, avgTimeInStage: 4.2, conversionRate: 0, bottleneck: false },
      { stage: 'approved', displayName: 'Approved', count: 18, avgTimeInStage: 2.1, conversionRate: 0, bottleneck: false },
      { stage: 'in_negotiation', displayName: 'Negotiation', count: 11, avgTimeInStage: 9.8, conversionRate: 0, bottleneck: true },
      { stage: 'in_legal_review', displayName: 'Legal Review', count: 6, avgTimeInStage: 6.3, conversionRate: 0, bottleneck: false },
      { stage: 'in_contract', displayName: 'Contract', count: 8, avgTimeInStage: 3.5, conversionRate: 0, bottleneck: false },
      { stage: 'in_payment', displayName: 'Payment', count: 4, avgTimeInStage: 5.7, conversionRate: 0, bottleneck: false },
    ],
  };
}

/**
 * Generate sample scripting phase data
 */
export function getSampleScriptingPhaseData() {
  const scriptingDramas = [
    { name: 'Dil Ki Dastaan', progress: 83, status: 'on_schedule', step: 5 },
    { name: 'Ishq Aur Junoon', progress: 67, status: 'on_hold', step: 4 },
    { name: 'Mohabbat Ka Safar', progress: 50, status: 'on_hold', step: 3 },
    { name: 'Pyar Ka Dard', progress: 33, status: 'behind_schedule', step: 2 },
    { name: 'Humsafar', progress: 92, status: 'on_schedule', step: 6 },
    { name: 'Mere Paas Tum Ho', progress: 25, status: 'behind_schedule', step: 2 },
  ];

  return scriptingDramas.map((drama, i) => ({
    id: `scripting-${i + 1}`,
    workingTitle: drama.name,
    callReportId: `cr-scripting-${i + 1}`,
    scriptProgress: drama.progress,
    status: drama.status as 'on_schedule' | 'on_hold' | 'behind_schedule',
    currentPhase: `Step ${drama.step}`,
    lastUpdated: daysAgo(randomInt(1, 30)),
  }));
}

/**
 * Generate sample dramas with episodes (3 dramas with 15 total episodes)
 */
export function getSampleDramasWithEpisodes() {
  const dramasWithEpisodes = [
    { name: DRAMA_NAMES[0], totalEpisodes: 7, evaluatedEpisodes: 5 },
    { name: DRAMA_NAMES[1], totalEpisodes: 5, evaluatedEpisodes: 3 },
    { name: DRAMA_NAMES[2], totalEpisodes: 3, evaluatedEpisodes: 1 },
  ];

  return dramasWithEpisodes.map((drama, i) => ({
    callReportId: `cr-${i + 1}`,
    workingTitle: drama.name,
    totalEpisodes: drama.totalEpisodes,
    evaluatedEpisodes: drama.evaluatedEpisodes,
    pendingEpisodes: drama.totalEpisodes - drama.evaluatedEpisodes,
  }));
}

/**
 * Generate sample event analysis data for a drama
 * Creates individual event objects with titles, descriptions, and impact levels
 */
export function getSampleEventAnalysisForDrama(callReportId: string) {
  const dramas = getSampleDramasWithEpisodes();
  const drama = dramas.find(d => d.callReportId === callReportId);

  if (!drama) return [];

  // Sample event templates by impact level
  const eventTemplates = {
    high: [
      { title: "Protagonist confronts main antagonist", desc: "A tense confrontation that changes the power dynamics between the main characters" },
      { title: "Major secret revealed", desc: "A long-hidden truth comes to light, shocking all characters involved" },
      { title: "Character betrayal", desc: "A trusted ally reveals their true intentions, devastating the protagonist" },
      { title: "Life-threatening situation", desc: "The protagonist faces mortal danger and must make a critical decision" },
      { title: "Unexpected plot twist", desc: "The story takes a dramatic turn that no one saw coming" },
      { title: "Climactic showdown", desc: "The main conflict reaches its peak with high stakes for all parties" },
      { title: "Character's dark past exposed", desc: "Hidden history resurfaces, forcing characters to face their demons" },
      { title: "Breaking point moment", desc: "A character reaches their emotional limit and makes a drastic choice" },
    ],
    medium: [
      { title: "Character development scene", desc: "A moment of introspection or growth for a key character" },
      { title: "Important conversation", desc: "Dialogue that advances relationships or plot understanding" },
      { title: "Strategic planning", desc: "Characters devise a plan to overcome upcoming challenges" },
      { title: "Romantic tension", desc: "Building attraction or conflict between potential romantic interests" },
      { title: "Subplot advancement", desc: "Secondary storyline moves forward with meaningful progress" },
      { title: "Alliance formation", desc: "Characters agree to work together toward a common goal" },
      { title: "Discovery of clue", desc: "Important information found that will aid in solving the mystery" },
      { title: "Family dynamics explored", desc: "Complex family relationships are examined and tested" },
    ],
    low: [
      { title: "Daily life scene", desc: "Routine activities that show character personalities" },
      { title: "Establishing atmosphere", desc: "Scene-setting moments that build the world" },
      { title: "Comic relief moment", desc: "Light-hearted interaction providing tension relief" },
      { title: "Background information", desc: "Exposition that fills in world or character details" },
      { title: "Transition scene", desc: "Movement between locations or time periods" },
      { title: "Character introduction", desc: "First appearance of a minor supporting character" },
      { title: "Casual interaction", desc: "Normal social exchange between characters" },
    ],
  };

  const eventAnalysisData = [];

  for (let epNum = 1; epNum <= drama.totalEpisodes; epNum++) {
    const isEarlyEpisode = epNum <= 2;
    const isLateEpisode = epNum >= drama.totalEpisodes - 1;
    const isMiddleLull = epNum >= 5 && epNum <= 7; // Episodes 5, 6, 7 - only low impact for demo

    let highCount: number, mediumCount: number, lowCount: number;

    if (isMiddleLull) {
      // Episodes 5, 6, 7 - Only low impact events (easy demo pattern)
      highCount = 0; // NO high impact events
      mediumCount = 0; // NO medium impact events
      lowCount = 3; // Only low impact events
    } else if (isEarlyEpisode) {
      // Episodes 1-2: Opening (4 events)
      highCount = 3;
      mediumCount = 1;
      lowCount = 0;
    } else if (epNum === 3) {
      // Episode 3: Peak action - HIGHEST COUNT (6 events)
      highCount = 2;
      mediumCount = 3;
      lowCount = 1;
    } else if (epNum === 4) {
      // Episode 4: Development (4 events)
      highCount = 1;
      mediumCount = 2;
      lowCount = 1;
    } else if (isLateEpisode) {
      // Final episodes: Climax (5 events)
      highCount = 4;
      mediumCount = 1;
      lowCount = 0;
    } else {
      // Other episodes (if any) - default pattern
      highCount = 1;
      mediumCount = 2;
      lowCount = 1;
    }

    const events: any[] = [];

    // Generate high impact events
    for (let i = 0; i < highCount; i++) {
      const template = getRandom(eventTemplates.high);
      events.push({
        id: `${callReportId}-ep${epNum}-high-${i}`,
        title: template.title,
        description: template.desc,
        impact: "High Impact",
        evaluatorName: getRandom(EVALUATORS).name,
      });
    }

    // Generate medium impact events
    for (let i = 0; i < mediumCount; i++) {
      const template = getRandom(eventTemplates.medium);
      events.push({
        id: `${callReportId}-ep${epNum}-medium-${i}`,
        title: template.title,
        description: template.desc,
        impact: "Medium Impact",
        evaluatorName: getRandom(EVALUATORS).name,
      });
    }

    // Generate low impact events
    for (let i = 0; i < lowCount; i++) {
      const template = getRandom(eventTemplates.low);
      events.push({
        id: `${callReportId}-ep${epNum}-low-${i}`,
        title: template.title,
        description: template.desc,
        impact: "Low Impact",
        evaluatorName: getRandom(EVALUATORS).name,
      });
    }

    eventAnalysisData.push({
      episodeNumber: epNum,
      totalEvents: events.length,
      events,
    });
  }

  return eventAnalysisData;
}

/**
 * Generate sample episodes for each drama
 */
export function getSampleEpisodesByDrama() {
  const dramas = getSampleDramasWithEpisodes();
  const episodesByDrama: Record<string, any[]> = {};

  dramas.forEach((drama) => {
    const episodes: any[] = [];

    for (let epNum = 1; epNum <= drama.totalEpisodes; epNum++) {
      let completedEvaluators: number;

      if (epNum < drama.evaluatedEpisodes) {
        // Fully evaluated episodes (before the last evaluated one)
        completedEvaluators = 7;
      } else if (epNum === drama.evaluatedEpisodes) {
        // Last evaluated episode - partially complete (varied completion)
        const partialCompletions = [3, 4, 5, 6]; // Different completion rates
        completedEvaluators = partialCompletions[epNum % partialCompletions.length];
      } else {
        // Pending episodes
        completedEvaluators = 0;
      }

      const pendingEvaluators = 7 - completedEvaluators;
      const progressPercentage = Math.round((completedEvaluators / 7) * 100);

      let status: 'completed' | 'in_progress' | 'pending';
      if (completedEvaluators === 0) {
        status = 'pending';
      } else if (completedEvaluators < 7) {
        status = 'in_progress';
      } else {
        status = 'completed';
      }

      episodes.push({
        episodeId: `${drama.callReportId}-ep-${epNum}`,
        episodeNumber: epNum,
        totalEvaluators: 7,
        completedEvaluators,
        pendingEvaluators,
        progressPercentage,
        status,
      });
    }

    episodesByDrama[drama.callReportId] = episodes;
  });

  return episodesByDrama;
}

/**
 * Generate sample evaluator details for each episode
 */
export function getSampleEvaluatorsByEpisode() {
  const episodesByDrama = getSampleEpisodesByDrama();
  const evaluatorsByEpisode: Record<string, any> = {};

  Object.values(episodesByDrama).forEach((episodes) => {
    episodes.forEach((episode) => {
      const completed: any[] = [];
      const pending: any[] = [];

      EVALUATORS.forEach((evaluator, idx) => {
        if (idx < episode.completedEvaluators) {
          const score = randomInt(6, 10); // Score between 1-10
          let grade: string;
          if (score >= 9) grade = 'A+';
          else if (score >= 8) grade = 'A';
          else if (score >= 7) grade = 'B+';
          else if (score >= 6) grade = 'B';
          else grade = 'C';

          completed.push({
            evaluatorId: evaluator.id,
            evaluatorName: evaluator.name,
            status: 'completed',
            overallScore: score,
            grade,
            evaluatedAt: daysAgo(randomInt(5, 60)),
          });
        } else {
          pending.push({
            evaluatorId: evaluator.id,
            evaluatorName: evaluator.name,
            status: 'pending',
          });
        }
      });

      evaluatorsByEpisode[episode.episodeId] = { completed, pending };
    });
  });

  return evaluatorsByEpisode;
}

/**
 * Generate sample stakeholder dashboard stats
 */
export function getSampleStakeholderDashboardStats() {
  return {
    activeEvaluations: [
      {
        id: 'eval-active-1',
        callReportId: 'CR-2025-0045',
        title: 'Khuda Aur Mohabbat',
        writer: 'Khalil-ur-Rehman Qamar',
        meetingDate: daysAgo(15),
        currentAvgScore: 7.8,
        completedEvaluations: 4,
        totalRequired: 5,
      },
      {
        id: 'eval-active-2',
        callReportId: 'CR-2025-0046',
        title: 'Tere Bina Jeena',
        writer: 'Farhat Ishtiaq',
        meetingDate: daysAgo(10),
        currentAvgScore: 8.2,
        completedEvaluations: 5,
        totalRequired: 5,
      },
    ],
    rejectedArchive: [],
  };
}

/**
 * Generate sample archive by genre data
 */
export function getSampleArchiveByGenre() {
  return [
    { genre: 'Drama', count: 18 },
    { genre: 'Romance', count: 12 },
    { genre: 'Comedy', count: 8 },
    { genre: 'Thriller', count: 6 },
    { genre: 'Action', count: 5 },
    { genre: 'Fantasy', count: 4 },
    { genre: 'Documentary', count: 3 },
    { genre: 'Horror', count: 2 },
    { genre: 'Sci-Fi', count: 2 },
    { genre: 'Other', count: 1 },
  ];
}

/**
 * Generate sample ideas in storage by genre data
 */
export function getSampleIdeasByGenre() {
  return [
    { genre: 'Drama', count: 24 },
    { genre: 'Romance', count: 18 },
    { genre: 'Comedy', count: 15 },
    { genre: 'Action', count: 12 },
    { genre: 'Thriller', count: 10 },
    { genre: 'Fantasy', count: 8 },
    { genre: 'Documentary', count: 6 },
    { genre: 'Sci-Fi', count: 5 },
    { genre: 'Horror', count: 4 },
    { genre: 'Other', count: 3 },
  ];
}

/**
 * Generate sample active projects
 */
export function getSampleActiveProjects() {
  const statuses = ['submitted', 'in_evaluation', 'approved', 'in_negotiation', 'contracted', 'in_payment'];
  const genres = ['Drama', 'Romance', 'Comedy', 'Action', 'Thriller', 'Fantasy', 'Documentary'];

  return Array.from({ length: 24 }, (_, i) => {
    const createdDays = randomInt(5, 180);
    return {
      id: `proj-${i + 1}`,
      story_id: `ST-2025-${String(i + 1).padStart(4, '0')}`,
      title: getRandom(DRAMA_NAMES),
      status: getRandom(statuses),
      genre: getRandom(genres),
      creator_name: getRandom(WRITERS),
      creator_id: `user-${randomInt(1, 10)}`,
      days_active: createdDays,
      last_update: daysAgo(randomInt(1, 30)),
      created_at: daysAgo(createdDays),
    };
  });
}

/**
 * Generate sample pending approvals
 */
export function getSamplePendingApprovals() {
  const recommendations = ['strong_yes', 'yes', 'maybe', 'no'];
  const genres = ['Drama', 'Romance', 'Comedy', 'Action', 'Thriller'];

  return Array.from({ length: 12 }, (_, i) => {
    const daysPending = randomInt(1, 45);
    return {
      id: `approval-${i + 1}`,
      story_id: `ST-2025-${String(randomInt(1, 100)).padStart(4, '0')}`,
      title: getRandom(DRAMA_NAMES),
      genre: getRandom(genres),
      creator_name: getRandom(WRITERS),
      creator_id: `user-${randomInt(1, 10)}`,
      submitted_date: daysAgo(daysPending),
      days_pending: daysPending,
      evaluation_score: parseFloat((randomInt(60, 95) / 10).toFixed(1)),
      evaluation_count: randomInt(3, 8),
      recommendation: getRandom(recommendations),
    };
  });
}

/**
 * Generate sample active contracts
 */
export function getSampleActiveContracts() {
  const contractStatuses = ['active', 'pending_signatures'];

  return Array.from({ length: 8 }, (_, i) => {
    const totalMilestones = randomInt(4, 8);
    const completedMilestones = randomInt(0, totalMilestones);
    const totalAmount = randomInt(2000000, 8000000);
    const paidAmount = Math.floor(totalAmount * (completedMilestones / totalMilestones));

    return {
      id: `contract-${i + 1}`,
      contract_id: `CON-2025-${String(i + 1).padStart(4, '0')}`,
      story_title: getRandom(DRAMA_NAMES),
      story_id: `ST-2025-${String(randomInt(1, 100)).padStart(4, '0')}`,
      total_amount: totalAmount,
      signed_date: daysAgo(randomInt(30, 180)),
      status: getRandom(contractStatuses),
      milestones_completed: completedMilestones,
      milestones_total: totalMilestones,
      milestone_progress: Math.round((completedMilestones / totalMilestones) * 100),
      paid_amount: paidAmount,
      remaining_amount: totalAmount - paidAmount,
    };
  });
}

/**
 * Generate sample overdue payments
 */
export function getSampleOverduePayments() {
  const milestones = ['Episode Delivery', 'Script Approval', 'Final Delivery', 'Post-Production'];

  return Array.from({ length: 5 }, (_, i) => {
    const daysOverdue = randomInt(5, 45);
    return {
      id: `payment-${i + 1}`,
      payment_id: `PAY-2025-${String(i + 1).padStart(4, '0')}`,
      story_title: getRandom(DRAMA_NAMES),
      story_id: `ST-2025-${String(randomInt(1, 100)).padStart(4, '0')}`,
      amount: randomInt(500000, 2000000),
      due_date: daysAgo(daysOverdue),
      days_overdue: daysOverdue,
      milestone: getRandom(milestones),
      status: 'overdue',
      contract_id: `CON-2025-${String(randomInt(1, 20)).padStart(4, '0')}`,
    };
  });
}

/**
 * Generate sample pipeline value items
 */
export function getSamplePipelineValue() {
  const types = ['contract', 'negotiation'] as const;
  const stages = ['negotiation', 'legal_review', 'contracted', 'in_payment'];
  const statuses = ['active', 'in_progress', 'pending'];

  return Array.from({ length: 18 }, (_, i) => ({
    id: `pipeline-${i + 1}`,
    type: getRandom(types),
    story_id: `ST-2025-${String(randomInt(1, 100)).padStart(4, '0')}`,
    story_title: getRandom(DRAMA_NAMES),
    value: randomInt(1500000, 7000000),
    status: getRandom(statuses),
    stage: getRandom(stages),
    last_update: daysAgo(randomInt(1, 30)),
    created_at: daysAgo(randomInt(10, 120)),
  }));
}

/**
 * Generate sample weekly activities
 */
export function getSampleWeeklyActivities() {
  const activityTypes = ['story', 'evaluation', 'approval', 'contract', 'payment', 'negotiation'] as const;
  const actions = ['created', 'updated', 'submitted', 'approved', 'signed', 'paid'];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

  return Array.from({ length: 47 }, (_, i) => {
    const daysBack = randomInt(0, 6);
    const timestamp = daysAgo(daysBack);
    const timestampDate = new Date(timestamp);

    let dateGroup: 'Today' | 'Yesterday' | 'Earlier This Week' = 'Earlier This Week';
    if (timestampDate >= todayStart) {
      dateGroup = 'Today';
    } else if (timestampDate >= yesterdayStart) {
      dateGroup = 'Yesterday';
    }

    const hoursAgo = Math.floor((now.getTime() - timestampDate.getTime()) / (1000 * 60 * 60));
    const timeAgo = hoursAgo < 1 ? 'Just now' : hoursAgo < 24 ? `${hoursAgo}h ago` : `${daysBack}d ago`;

    return {
      id: `activity-${i + 1}`,
      action: getRandom(actions),
      entityType: getRandom(activityTypes),
      entityName: getRandom(DRAMA_NAMES),
      entityId: `entity-${randomInt(1, 100)}`,
      performedBy: getRandom(WRITERS),
      performedById: `user-${randomInt(1, 10)}`,
      timestamp,
      details: {},
      dayOfWeek: getRandom(daysOfWeek),
      dateGroup,
      timeAgo,
    };
  });
}

/**
 * Generate sample active ideas details
 */
export function getSampleActiveIdeasDetails(genre?: string) {
  const allGenres = ['Drama', 'Soap', 'Comedy', 'Action', 'Thriller', 'Romance', 'Fantasy', 'Documentary', 'Horror', 'Sci-Fi', 'Other'];
  const categories = ['serial', 'telefilm', 'film'];
  const statuses = ['draft', 'ready_for_evaluation', 'in_review'];
  const loglines = [
    'A heartwarming story of love and sacrifice',
    'An intense thriller about family secrets',
    'A romantic journey through time',
    'A dramatic tale of ambition and betrayal',
    'A comedy about modern relationships',
  ];

  let ideas = Array.from({ length: 35 }, (_, i) => {
    const daysActive = randomInt(5, 60);
    return {
      id: `idea-${i + 1}`,
      call_report_id: `CR-2025-${String(i + 1).padStart(4, '0')}`,
      working_title: getRandom(DRAMA_NAMES),
      writer_name: getRandom(WRITERS),
      genre: getRandom(allGenres),
      category: getRandom(categories),
      status: getRandom(statuses),
      meeting_date: daysAgo(randomInt(5, 45)),
      days_active: daysActive,
      logline: getRandom(loglines),
      created_at: daysAgo(daysActive),
    };
  });

  // Filter by genre if provided
  if (genre && genre !== 'all') {
    ideas = ideas.filter(idea => idea.genre === genre);
  }

  return ideas;
}

/**
 * Generate sample archive details
 */
export function getSampleArchiveDetails(genre?: string) {
  const allGenres = ['Drama', 'Soap', 'Comedy', 'Action', 'Thriller', 'Romance', 'Fantasy', 'Documentary'];
  const types = ['story_archive', 'call_report_rejection'] as const;
  const categories = ['serial', 'telefilm', 'film'];
  const rejectionStages = ['evaluation', 'approval', 'negotiation', 'legal_review'];
  const rejectionReasons = [
    'Low evaluation score - not meeting quality standards',
    'Budget constraints',
    'Market saturation in this genre',
    'Creative differences',
    'Timeline conflicts',
    'Failed to meet production requirements',
  ];

  let archives = Array.from({ length: 25 }, (_, i) => {
    const type = getRandom(types);
    const daysInSystem = randomInt(10, 120);

    return {
      id: `archive-${i + 1}`,
      type,
      title: getRandom(DRAMA_NAMES),
      writer_name: getRandom(WRITERS),
      genre: getRandom(allGenres),
      rejection_reason: getRandom(rejectionReasons),
      rejection_date: daysAgo(randomInt(5, 90)),
      days_in_system: daysInSystem,
      average_score: type === 'call_report_rejection' ? parseFloat((randomInt(20, 49) / 10).toFixed(2)) : undefined,
      rejection_stage: type === 'story_archive' ? getRandom(rejectionStages) : undefined,
      category: getRandom(categories),
    };
  });

  // Filter by genre if provided
  if (genre && genre !== 'all') {
    archives = archives.filter(archive => archive.genre === genre);
  }

  return archives;
}

/**
 * Generate sample pipeline stories for Kanban view
 */
export function getSamplePipelineStories() {
  const allGenres = ['Drama', 'Romance', 'Action', 'Thriller', 'Comedy', 'Family'];
  const departments = ['Content Department', 'Legal Department', 'Production Department'];
  const assignees = [
    { name: 'Ahmed Raza Sheikh', email: 'ahmed.raza@geo.tv', dept: 'Content Department' },
    { name: 'Fatima Khan', email: 'fatima.khan@geo.tv', dept: 'Content Department' },
    { name: 'Zainab Ali', email: 'zainab.ali@geo.tv', dept: 'Legal Department' },
    { name: 'Hassan Malik', email: 'hassan.malik@geo.tv', dept: 'Production Department' },
    { name: 'Ayesha Tariq', email: 'ayesha.tariq@geo.tv', dept: 'Content Department' },
  ];

  const documentTypes = ['contract', 'report', 'script', 'other'] as const;

  // Stage 1 Stories (Idea Approved - 5 stories)
  const stage1Stories = [
    {
      id: 'pipeline-st-001',
      story_id: 'ST-2025-0101',
      title: 'Zindagi Gulzar Hai',
      writer_name: getRandom(WRITERS),
      genre: 'Drama',
      current_stage: 1 as const,
      days_in_current_stage: 3,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(45),
      stage1_completion_date: daysAgo(42),
      stage2_status: 'in_progress' as const,
      stage2_start_date: daysAgo(3),
      stage2_completion_date: null,
      stage3_status: 'pending' as const,
      stage3_start_date: null,
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: null,
      stage3_assigned_email: null,
      stage3_assigned_department: null,
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(45) },
        { type: 'report' as const, name: 'Call Report - Initial Meeting.pdf', url: '#', uploaded_date: daysAgo(3) },
      ],
      notes: [
        { date: daysAgo(2), author: 'Fatima Khan', text: 'Writer meeting scheduled for next week to discuss character development.' },
        { date: daysAgo(42), author: 'Ahmed Raza Sheikh', text: 'Story idea approved by evaluation committee. Average score: 8.2/10' },
      ],
    },
    {
      id: 'pipeline-st-002',
      story_id: 'ST-2025-0102',
      title: 'Ishq Aur Junoon',
      writer_name: getRandom(WRITERS),
      genre: 'Romance',
      current_stage: 1 as const,
      days_in_current_stage: 6,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(50),
      stage1_completion_date: daysAgo(44),
      stage2_status: 'in_progress' as const,
      stage2_start_date: daysAgo(6),
      stage2_completion_date: null,
      stage3_status: 'pending' as const,
      stage3_start_date: null,
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Ayesha Tariq',
      stage2_assigned_email: 'ayesha.tariq@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: null,
      stage3_assigned_email: null,
      stage3_assigned_department: null,
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(50) },
        { type: 'report' as const, name: 'Call Report.pdf', url: '#', uploaded_date: daysAgo(6) },
      ],
      notes: [
        { date: daysAgo(5), author: 'Ayesha Tariq', text: 'First draft of detailed story treatment expected in 10 days.' },
        { date: daysAgo(44), author: 'Ahmed Raza Sheikh', text: 'Approved for writer engagement. Strong romance theme.' },
      ],
    },
    {
      id: 'pipeline-st-003',
      story_id: 'ST-2025-0103',
      title: 'Dil Ki Dastaan',
      writer_name: getRandom(WRITERS),
      genre: 'Drama',
      current_stage: 1 as const,
      days_in_current_stage: 2,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(38),
      stage1_completion_date: daysAgo(36),
      stage2_status: 'in_progress' as const,
      stage2_start_date: daysAgo(2),
      stage2_completion_date: null,
      stage3_status: 'pending' as const,
      stage3_start_date: null,
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: null,
      stage3_assigned_email: null,
      stage3_assigned_department: null,
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(38) },
      ],
      notes: [
        { date: daysAgo(1), author: 'Fatima Khan', text: 'Writer engagement meeting completed. Story outline finalized.' },
        { date: daysAgo(36), author: 'Ahmed Raza Sheikh', text: 'Idea approved. Unique take on family dynamics.' },
      ],
    },
    {
      id: 'pipeline-st-004',
      story_id: 'ST-2025-0104',
      title: 'Mohabbat Ka Safar',
      writer_name: getRandom(WRITERS),
      genre: 'Romance',
      current_stage: 1 as const,
      days_in_current_stage: 8,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(55),
      stage1_completion_date: daysAgo(47),
      stage2_status: 'in_progress' as const,
      stage2_start_date: daysAgo(8),
      stage2_completion_date: null,
      stage3_status: 'pending' as const,
      stage3_start_date: null,
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Ayesha Tariq',
      stage2_assigned_email: 'ayesha.tariq@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: null,
      stage3_assigned_email: null,
      stage3_assigned_department: null,
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(55) },
        { type: 'script' as const, name: 'Story Treatment Draft.docx', url: '#', uploaded_date: daysAgo(5) },
      ],
      notes: [
        { date: daysAgo(5), author: 'Ayesha Tariq', text: 'Received first story treatment draft. Reviewing for feedback.' },
        { date: daysAgo(47), author: 'Ahmed Raza Sheikh', text: 'Strong romantic storyline approved.' },
      ],
    },
    {
      id: 'pipeline-st-005',
      story_id: 'ST-2025-0105',
      title: 'Mera Dil Mera Dushman',
      writer_name: getRandom(WRITERS),
      genre: 'Thriller',
      current_stage: 1 as const,
      days_in_current_stage: 4,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(42),
      stage1_completion_date: daysAgo(38),
      stage2_status: 'in_progress' as const,
      stage2_start_date: daysAgo(4),
      stage2_completion_date: null,
      stage3_status: 'pending' as const,
      stage3_start_date: null,
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: null,
      stage3_assigned_email: null,
      stage3_assigned_department: null,
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(42) },
      ],
      notes: [
        { date: daysAgo(3), author: 'Fatima Khan', text: 'Engaging with writer to develop detailed character profiles.' },
        { date: daysAgo(38), author: 'Ahmed Raza Sheikh', text: 'Thriller concept approved. High potential for audience engagement.' },
      ],
    },
  ];

  // Stage 2 Stories (Writer's Engagement - 4 stories)
  const stage2Stories = [
    {
      id: 'pipeline-st-006',
      story_id: 'ST-2025-0106',
      title: 'Tere Bina Jeena',
      writer_name: getRandom(WRITERS),
      genre: 'Drama',
      current_stage: 2 as const,
      days_in_current_stage: 12,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(65),
      stage1_completion_date: daysAgo(58),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(58),
      stage2_completion_date: daysAgo(46),
      stage3_status: 'in_progress' as const,
      stage3_start_date: daysAgo(12),
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Hassan Malik',
      stage3_assigned_email: 'hassan.malik@geo.tv',
      stage3_assigned_department: 'Production Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(65) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(58) },
        { type: 'script' as const, name: 'Detailed Story Treatment.docx', url: '#', uploaded_date: daysAgo(46) },
        { type: 'contract' as const, name: 'Contract Draft v1.pdf', url: '#', uploaded_date: daysAgo(10) },
      ],
      notes: [
        { date: daysAgo(10), author: 'Hassan Malik', text: 'Contract draft sent to writer for review. Negotiating episode count.' },
        { date: daysAgo(46), author: 'Fatima Khan', text: 'Story treatment finalized. Moving to contract phase.' },
        { date: daysAgo(58), author: 'Ahmed Raza Sheikh', text: 'Idea approved. Strong emotional narrative.' },
      ],
    },
    {
      id: 'pipeline-st-007',
      story_id: 'ST-2025-0107',
      title: 'Khuda Aur Mohabbat',
      writer_name: getRandom(WRITERS),
      genre: 'Drama',
      current_stage: 2 as const,
      days_in_current_stage: 15,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(70),
      stage1_completion_date: daysAgo(63),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(63),
      stage2_completion_date: daysAgo(48),
      stage3_status: 'in_progress' as const,
      stage3_start_date: daysAgo(15),
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Ayesha Tariq',
      stage2_assigned_email: 'ayesha.tariq@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Zainab Ali',
      stage3_assigned_email: 'zainab.ali@geo.tv',
      stage3_assigned_department: 'Legal Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(70) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(63) },
        { type: 'script' as const, name: 'Story Treatment.docx', url: '#', uploaded_date: daysAgo(48) },
        { type: 'contract' as const, name: 'Contract Draft.pdf', url: '#', uploaded_date: daysAgo(12) },
      ],
      notes: [
        { date: daysAgo(12), author: 'Zainab Ali', text: 'Legal review ongoing. Minor clause revisions needed.' },
        { date: daysAgo(48), author: 'Ayesha Tariq', text: 'Writer engagement completed. Story locked and finalized.' },
        { date: daysAgo(63), author: 'Ahmed Raza Sheikh', text: 'Strong religious/spiritual theme approved.' },
      ],
    },
    {
      id: 'pipeline-st-008',
      story_id: 'ST-2025-0108',
      title: 'Pyar Ka Dard',
      writer_name: getRandom(WRITERS),
      genre: 'Romance',
      current_stage: 2 as const,
      days_in_current_stage: 9,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(60),
      stage1_completion_date: daysAgo(53),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(53),
      stage2_completion_date: daysAgo(40),
      stage3_status: 'in_progress' as const,
      stage3_start_date: daysAgo(9),
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Hassan Malik',
      stage3_assigned_email: 'hassan.malik@geo.tv',
      stage3_assigned_department: 'Production Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(60) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(53) },
        { type: 'script' as const, name: 'Final Story Treatment.docx', url: '#', uploaded_date: daysAgo(40) },
        { type: 'contract' as const, name: 'Contract Draft.pdf', url: '#', uploaded_date: daysAgo(7) },
      ],
      notes: [
        { date: daysAgo(7), author: 'Hassan Malik', text: 'Delivery plan created. 25 episodes planned over 6 months.' },
        { date: daysAgo(40), author: 'Fatima Khan', text: 'Story finalized with all character arcs complete.' },
        { date: daysAgo(53), author: 'Ahmed Raza Sheikh', text: 'Romantic storyline approved for prime time slot.' },
      ],
    },
    {
      id: 'pipeline-st-009',
      story_id: 'ST-2025-0109',
      title: 'Humsafar',
      writer_name: getRandom(WRITERS),
      genre: 'Family',
      current_stage: 2 as const,
      days_in_current_stage: 7,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(58),
      stage1_completion_date: daysAgo(51),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(51),
      stage2_completion_date: daysAgo(38),
      stage3_status: 'in_progress' as const,
      stage3_start_date: daysAgo(7),
      stage3_completion_date: null,
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Ayesha Tariq',
      stage2_assigned_email: 'ayesha.tariq@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Hassan Malik',
      stage3_assigned_email: 'hassan.malik@geo.tv',
      stage3_assigned_department: 'Production Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(58) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(51) },
        { type: 'script' as const, name: 'Story Treatment.docx', url: '#', uploaded_date: daysAgo(38) },
      ],
      notes: [
        { date: daysAgo(6), author: 'Hassan Malik', text: 'Discussing delivery timeline with writer. Target start: next month.' },
        { date: daysAgo(38), author: 'Ayesha Tariq', text: 'Family drama angle locked. Strong multi-generational appeal.' },
        { date: daysAgo(51), author: 'Ahmed Raza Sheikh', text: 'Approved for development. Family-oriented storyline.' },
      ],
    },
  ];

  // Stage 3 Stories (Delivery Plan & Contract - 3 stories)
  const stage3Stories = [
    {
      id: 'pipeline-st-010',
      story_id: 'ST-2025-0110',
      title: 'Dil Ruba',
      writer_name: getRandom(WRITERS),
      genre: 'Romance',
      current_stage: 3 as const,
      days_in_current_stage: 18,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(85),
      stage1_completion_date: daysAgo(78),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(78),
      stage2_completion_date: daysAgo(58),
      stage3_status: 'completed' as const,
      stage3_start_date: daysAgo(58),
      stage3_completion_date: daysAgo(40),
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Zainab Ali',
      stage3_assigned_email: 'zainab.ali@geo.tv',
      stage3_assigned_department: 'Legal Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(85) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(78) },
        { type: 'script' as const, name: 'Final Story Treatment.docx', url: '#', uploaded_date: daysAgo(58) },
        { type: 'contract' as const, name: 'Signed Contract.pdf', url: '#', uploaded_date: daysAgo(40) },
        { type: 'other' as const, name: 'Delivery Plan.xlsx', url: '#', uploaded_date: daysAgo(40) },
      ],
      notes: [
        { date: daysAgo(40), author: 'Zainab Ali', text: 'Contract signed! 30 episodes agreed. First episode due in 3 weeks.' },
        { date: daysAgo(58), author: 'Fatima Khan', text: 'Story development complete. Ready for contract.' },
        { date: daysAgo(78), author: 'Ahmed Raza Sheikh', text: 'Romantic storyline approved with high potential.' },
      ],
    },
    {
      id: 'pipeline-st-011',
      story_id: 'ST-2025-0111',
      title: 'Mere Paas Tum Ho',
      writer_name: getRandom(WRITERS),
      genre: 'Drama',
      current_stage: 3 as const,
      days_in_current_stage: 22,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(95),
      stage1_completion_date: daysAgo(88),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(88),
      stage2_completion_date: daysAgo(68),
      stage3_status: 'completed' as const,
      stage3_start_date: daysAgo(68),
      stage3_completion_date: daysAgo(46),
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Ayesha Tariq',
      stage2_assigned_email: 'ayesha.tariq@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Hassan Malik',
      stage3_assigned_email: 'hassan.malik@geo.tv',
      stage3_assigned_department: 'Production Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(95) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(88) },
        { type: 'script' as const, name: 'Complete Story Treatment.docx', url: '#', uploaded_date: daysAgo(68) },
        { type: 'contract' as const, name: 'Final Signed Contract.pdf', url: '#', uploaded_date: daysAgo(46) },
        { type: 'other' as const, name: 'Episode Delivery Schedule.xlsx', url: '#', uploaded_date: daysAgo(46) },
      ],
      notes: [
        { date: daysAgo(46), author: 'Hassan Malik', text: 'Contract executed. 28 episodes confirmed. Production starts next month.' },
        { date: daysAgo(68), author: 'Ayesha Tariq', text: 'All story elements locked. Characters and plot finalized.' },
        { date: daysAgo(88), author: 'Ahmed Raza Sheikh', text: 'High-potential drama concept approved. Strong emotional storyline.' },
      ],
    },
    {
      id: 'pipeline-st-012',
      story_id: 'ST-2025-0112',
      title: 'Ehd-e-Wafa',
      writer_name: getRandom(WRITERS),
      genre: 'Action',
      current_stage: 3 as const,
      days_in_current_stage: 14,
      stage1_status: 'completed' as const,
      stage1_start_date: daysAgo(80),
      stage1_completion_date: daysAgo(73),
      stage2_status: 'completed' as const,
      stage2_start_date: daysAgo(73),
      stage2_completion_date: daysAgo(55),
      stage3_status: 'completed' as const,
      stage3_start_date: daysAgo(55),
      stage3_completion_date: daysAgo(41),
      stage1_assigned: 'Ahmed Raza Sheikh',
      stage1_assigned_email: 'ahmed.raza@geo.tv',
      stage1_assigned_department: 'Content Department',
      stage2_assigned: 'Fatima Khan',
      stage2_assigned_email: 'fatima.khan@geo.tv',
      stage2_assigned_department: 'Content Department',
      stage3_assigned: 'Zainab Ali',
      stage3_assigned_email: 'zainab.ali@geo.tv',
      stage3_assigned_department: 'Legal Department',
      documents: [
        { type: 'report' as const, name: 'Evaluation Report.pdf', url: '#', uploaded_date: daysAgo(80) },
        { type: 'report' as const, name: 'Writer Engagement Report.pdf', url: '#', uploaded_date: daysAgo(73) },
        { type: 'script' as const, name: 'Story Treatment Final.docx', url: '#', uploaded_date: daysAgo(55) },
        { type: 'contract' as const, name: 'Executed Contract.pdf', url: '#', uploaded_date: daysAgo(41) },
        { type: 'other' as const, name: 'Production Timeline.pdf', url: '#', uploaded_date: daysAgo(41) },
      ],
      notes: [
        { date: daysAgo(41), author: 'Zainab Ali', text: 'Contract finalized! 24 episodes confirmed. First episode delivery in 2 weeks.' },
        { date: daysAgo(55), author: 'Fatima Khan', text: 'Action-packed storyline complete. All military consultation done.' },
        { date: daysAgo(73), author: 'Ahmed Raza Sheikh', text: 'Unique action/friendship theme approved. High production value expected.' },
      ],
    },
  ];

  return {
    stage1: stage1Stories,
    stage2: stage2Stories,
    stage3: stage3Stories,
    all: [...stage1Stories, ...stage2Stories, ...stage3Stories],
  };
}

/**
 * Get all sample data at once
 */
export function getAllSampleData() {
  return {
    summary: getSampleExecutiveSummary(),
    funnel: getSamplePipelineFunnel(),
    financial: getSampleFinancialOverview(),
    performance: getSamplePerformanceMetrics(),
    workload: getSampleDepartmentWorkload(),
    alerts: getSampleCriticalAlerts(),
    recentActivity: getSampleRecentActivity(),
    stakeholderStats: getSampleStakeholderDashboardStats(),
    episodeOverview: getSampleEpisodeOverview(),
    episodicEvalOverview: getSampleEpisodicEvaluationOverview(),
    episodeProductionData: getSampleEpisodeProductionTrends(),
    qualityDistribution: getSampleQualityDistribution(),
    evaluatorStats: getSampleEvaluatorStats(),
    evaluatorActivity: getSampleEvaluatorActivityHeatmap(),
    pipelineData: getSamplePipelineOverview(),
    scriptingPhaseData: getSampleScriptingPhaseData(),
    dramasWithEpisodes: getSampleDramasWithEpisodes(),
    episodesByDrama: getSampleEpisodesByDrama(),
    evaluatorsByEpisode: getSampleEvaluatorsByEpisode(),
    archiveByGenre: getSampleArchiveByGenre(),
    ideasByGenre: getSampleIdeasByGenre(),
  };
}

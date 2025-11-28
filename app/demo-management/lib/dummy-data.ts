/**
 * Comprehensive Dummy Data for Management Portal Demo
 *
 * This file contains realistic dummy data for Pakistani drama series production
 * to demonstrate the full capabilities of the management dashboard.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DummyStory {
  id: string;
  title: string;
  genre: string[];
  writer: string;
  director: string;
  status: 'submitted' | 'in_evaluation' | 'approved' | 'contracted' | 'in_production' | 'completed' | 'rejected';
  overall_rating: number | null;
  days_active: number;
  created_at: string;
  logline: string;
  team: string;
  content_creator: string;
  evaluations_completed: number;
  evaluations_total: number;
  budget_estimate: number;
  episode_count: number;
  production_start?: string;
  production_end?: string;
}

export interface DummyCallReport {
  id: string;
  story_id: string;
  title: string;
  writer_name: string;
  attendees: string[];
  logged_at: string;
  logline: string;
  key_points: string[];
  next_steps: string[];
  content_creator: string;
}

export interface DummyEpisode {
  id: string;
  story_id: string;
  drama_title: string;
  episode_number: number;
  status: 'script_writing' | 'pre_production' | 'shooting' | 'post_production' | 'completed' | 'aired';
  script_status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'revision_needed';
  shooting_date?: string;
  air_date?: string;
  events: EpisodeEvent[];
}

export interface EpisodeEvent {
  id: string;
  episode_id: string;
  event_type: 'Production Delay' | 'Script Change' | 'Cast Change' | 'Location Issue' | 'Budget Adjustment' | 'Schedule Change' | 'Technical Issue' | 'Weather Delay';
  impact: 'High' | 'Medium' | 'Low';
  description: string;
  created_at: string;
  resolved: boolean;
}

export interface DummyTeam {
  id: string;
  name: string;
  lead: string;
  members: string[];
  active_projects: number;
  completed_projects: number;
  avg_evaluation_score: number;
  total_budget_managed: number;
  stories: string[];
}

export interface DummyEvaluator {
  id: string;
  name: string;
  position: string;
  type: 'internal' | 'external';
  evaluations_completed: number;
  avg_score_given: number;
  response_time_hours: number;
  specialization: string[];
  active: boolean;
}

export interface DummyContract {
  id: string;
  story_id: string;
  drama_title: string;
  writer: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  status: 'draft' | 'pending_signature' | 'signed' | 'completed';
  signed_date?: string;
  payment_milestones: PaymentMilestone[];
}

export interface PaymentMilestone {
  id: string;
  milestone_name: string;
  amount: number;
  due_date: string;
  paid: boolean;
  paid_date?: string;
}

export interface DummyAlert {
  id: string;
  type: 'deadline' | 'budget' | 'evaluation' | 'contract' | 'production';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  related_item_id: string;
  related_item_type: string;
  created_at: string;
  resolved: boolean;
}

export interface DummyActivity {
  id: string;
  type: 'story_submitted' | 'evaluation_completed' | 'approval_granted' | 'contract_signed' | 'payment_made' | 'episode_completed';
  title: string;
  description: string;
  user: string;
  timestamp: string;
  related_item_id: string;
}

export interface EventAnalysis {
  drama_id: string;
  drama_title: string;
  total_episodes: number;
  total_events: number;
  events_by_impact: {
    High: number;
    Medium: number;
    Low: number;
  };
  events_by_type: {
    [key: string]: number;
  };
  impact_chart_data: {
    episode: number;
    high: number;
    medium: number;
    low: number;
  }[];
  resolution_rate: number;
}

// ============================================================================
// DUMMY STORIES DATA
// ============================================================================

export const dummyStories: DummyStory[] = [
  {
    id: 'ST-2025-0001',
    title: 'Mere Paas Tum Ho',
    genre: ['Drama', 'Romance', 'Social'],
    writer: 'Khalil-ur-Rehman Qamar',
    director: 'Nadeem Baig',
    status: 'in_production',
    overall_rating: 8.5,
    days_active: 45,
    created_at: '2025-01-15T10:30:00Z',
    logline: 'A compelling story of love, betrayal and forgiveness that revolves around a married couple',
    team: 'Team Alpha',
    content_creator: 'Ahmad Ali',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 15000000,
    episode_count: 32,
    production_start: '2025-02-01',
  },
  {
    id: 'ST-2025-0002',
    title: 'Suno Chanda',
    genre: ['Romance', 'Family'],
    writer: 'Fatima Surayya Bajia',
    director: 'Ahsan Talish',
    status: 'in_production',
    overall_rating: 8.2,
    days_active: 38,
    created_at: '2025-01-18T14:20:00Z',
    logline: 'A love story of two young people who fight against family traditions and social pressures',
    team: 'Team Beta',
    content_creator: 'Sarah Khan',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 12000000,
    episode_count: 28,
    production_start: '2025-02-10',
  },
  {
    id: 'ST-2025-0003',
    title: 'Yeh Dil Mera',
    genre: ['Romance', 'Drama'],
    writer: 'Sajal Ali',
    director: 'Haissam Hussain',
    status: 'contracted',
    overall_rating: 7.8,
    days_active: 30,
    created_at: '2025-01-22T09:15:00Z',
    logline: 'A girl\'s story seeking balance between following her heart and fulfilling family expectations',
    team: 'Team Gamma',
    content_creator: 'Imran Hussain',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 10000000,
    episode_count: 24,
  },
  {
    id: 'ST-2025-0004',
    title: 'Khud Parast',
    genre: ['Drama', 'Thriller'],
    writer: 'Umera Ahmad',
    director: 'Sardar Baloch',
    status: 'approved',
    overall_rating: 8.0,
    days_active: 25,
    created_at: '2025-01-25T11:45:00Z',
    logline: 'A selfish person\'s journey toward redemption as they realize their mistakes and seek change',
    team: 'Team Alpha',
    content_creator: 'Fatima Noor',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 13000000,
    episode_count: 30,
  },
  {
    id: 'ST-2025-0005',
    title: 'Dil Na Umeed Toh Nahi',
    genre: ['Social', 'Drama'],
    writer: 'Bee Gul',
    director: 'Asad Jamal',
    status: 'in_evaluation',
    overall_rating: 7.5,
    days_active: 20,
    created_at: '2025-01-28T16:00:00Z',
    logline: 'A collective story highlighting various social issues',
    team: 'Team Beta',
    content_creator: 'Zainab Ahmad',
    evaluations_completed: 3,
    evaluations_total: 5,
    budget_estimate: 11000000,
    episode_count: 26,
  },
  {
    id: 'ST-2025-0006',
    title: 'Ishq Jhoota Sahi',
    genre: ['Romance', 'Comedy'],
    writer: 'Asma Nabeel',
    director: 'Ali Faisal',
    status: 'in_evaluation',
    overall_rating: null,
    days_active: 15,
    created_at: '2025-02-01T10:30:00Z',
    logline: 'A fake marriage that transforms into true love',
    team: 'Team Gamma',
    content_creator: 'Hassan Raza',
    evaluations_completed: 2,
    evaluations_total: 5,
    budget_estimate: 9000000,
    episode_count: 22,
  },
  {
    id: 'ST-2025-0007',
    title: 'Ranj-o-Gham',
    genre: ['Drama', 'Tragedy'],
    writer: 'Shahid Nadeem',
    director: 'Sibtain Haider',
    status: 'in_evaluation',
    overall_rating: null,
    days_active: 12,
    created_at: '2025-02-04T14:20:00Z',
    logline: 'A tale of a family\'s downfall and rebuilding',
    team: 'Team Alpha',
    content_creator: 'Nadia Khan',
    evaluations_completed: 1,
    evaluations_total: 5,
    budget_estimate: 14000000,
    episode_count: 28,
  },
  {
    id: 'ST-2025-0008',
    title: 'Be Baak',
    genre: ['Action', 'Thriller'],
    writer: 'Muhammad Ahmad',
    director: 'Ahsan Butt',
    status: 'submitted',
    overall_rating: null,
    days_active: 8,
    created_at: '2025-02-07T09:15:00Z',
    logline: 'A fearless spy who risks his life to save the nation',
    team: 'Team Beta',
    content_creator: 'Bilal Shah',
    evaluations_completed: 0,
    evaluations_total: 5,
    budget_estimate: 18000000,
    episode_count: 35,
  },
  {
    id: 'ST-2025-0009',
    title: 'Intezaar',
    genre: ['Romance', 'Drama'],
    writer: 'Mansha Yaad',
    director: 'Furqan Ali',
    status: 'submitted',
    overall_rating: null,
    days_active: 5,
    created_at: '2025-02-10T11:45:00Z',
    logline: 'A girl waiting for her true love',
    team: 'Team Gamma',
    content_creator: 'Ayesha Malik',
    evaluations_completed: 0,
    evaluations_total: 5,
    budget_estimate: 8000000,
    episode_count: 20,
  },
  {
    id: 'ST-2025-0010',
    title: 'Khel',
    genre: ['Thriller', 'Mystery'],
    writer: 'Adnan Malik',
    director: 'Kashif Nisar',
    status: 'submitted',
    overall_rating: null,
    days_active: 3,
    created_at: '2025-02-12T16:00:00Z',
    logline: 'A dangerous game where everyone is under suspicion',
    team: 'Team Alpha',
    content_creator: 'Rehan Ali',
    evaluations_completed: 0,
    evaluations_total: 5,
    budget_estimate: 16000000,
    episode_count: 32,
  },
  {
    id: 'ST-2025-0011',
    title: 'Dil Fareeb',
    genre: ['Romance', 'Drama'],
    writer: 'Razia Butt',
    director: 'Shahid Shafiq',
    status: 'completed',
    overall_rating: 8.8,
    days_active: 120,
    created_at: '2024-10-15T10:30:00Z',
    logline: 'A complex story of deception and love',
    team: 'Team Beta',
    content_creator: 'Salman Ahmad',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 12000000,
    episode_count: 26,
    production_start: '2024-11-01',
    production_end: '2025-01-15',
  },
  {
    id: 'ST-2025-0012',
    title: 'Khushiyon Ka Mausam',
    genre: ['Family', 'Comedy'],
    writer: 'Sadia Akram',
    director: 'Waheed Murad',
    status: 'completed',
    overall_rating: 7.9,
    days_active: 105,
    created_at: '2024-10-22T14:20:00Z',
    logline: 'A family\'s story of joys and challenges',
    team: 'Team Gamma',
    content_creator: 'Kamran Qureshi',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 10000000,
    episode_count: 24,
    production_start: '2024-11-10',
    production_end: '2025-01-20',
  },
  {
    id: 'ST-2024-0015',
    title: 'Be Zabaan',
    genre: ['Drama', 'Social'],
    writer: 'Naseem Ahmad',
    director: 'Amjad Islam',
    status: 'rejected',
    overall_rating: 4.2,
    days_active: 18,
    created_at: '2025-01-05T09:15:00Z',
    logline: 'A silent girl\'s search for her voice',
    team: 'Team Alpha',
    content_creator: 'Farah Naz',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 7000000,
    episode_count: 18,
  },
  {
    id: 'ST-2024-0018',
    title: 'Roshni Ka Safar',
    genre: ['Inspirational', 'Drama'],
    writer: 'Tahira Wafa',
    director: 'Nouman Ijaz',
    status: 'rejected',
    overall_rating: 5.1,
    days_active: 22,
    created_at: '2025-01-08T11:45:00Z',
    logline: 'A journey from darkness to light',
    team: 'Team Beta',
    content_creator: 'Usman Khan',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 9000000,
    episode_count: 20,
  },
  {
    id: 'ST-2025-0020',
    title: 'Mohabbat Ki Rahein',
    genre: ['Romance', 'Family'],
    writer: 'Shazia Rehan',
    director: 'Mohsin Ali',
    status: 'in_production',
    overall_rating: 8.1,
    days_active: 42,
    created_at: '2025-01-20T10:00:00Z',
    logline: 'Exploring different paths of love',
    team: 'Team Gamma',
    content_creator: 'Ali Hassan',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 11500000,
    episode_count: 28,
    production_start: '2025-02-05',
  },
  {
    id: 'ST-2025-0021',
    title: 'Humsafar Doosra',
    genre: ['Romance', 'Drama'],
    writer: 'Farhat Ishtiaq',
    director: 'Sarmad Khoosat',
    status: 'contracted',
    overall_rating: 8.3,
    days_active: 35,
    created_at: '2025-01-23T12:30:00Z',
    logline: 'The complexities and challenges of a second marriage',
    team: 'Team Alpha',
    content_creator: 'Mahira Abbas',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 13500000,
    episode_count: 30,
  },
  {
    id: 'ST-2025-0022',
    title: 'Zindagi Gulzar Hai',
    genre: ['Family', 'Drama'],
    writer: 'Nehal Toora',
    director: 'Yasir Nawaz',
    status: 'approved',
    overall_rating: 7.7,
    days_active: 28,
    created_at: '2025-01-26T15:00:00Z',
    logline: 'A blend of life\'s beauty and challenges',
    team: 'Team Beta',
    content_creator: 'Rana Malik',
    evaluations_completed: 5,
    evaluations_total: 5,
    budget_estimate: 10500000,
    episode_count: 25,
  },
  {
    id: 'ST-2025-0023',
    title: 'Tanhaiyaan',
    genre: ['Drama', 'Psychological'],
    writer: 'Ahmad Maher',
    director: 'Iram Parveen Bilal',
    status: 'in_evaluation',
    overall_rating: 7.2,
    days_active: 18,
    created_at: '2025-01-30T09:30:00Z',
    logline: 'Stories of people suffering from loneliness',
    team: 'Team Gamma',
    content_creator: 'Sania Ahmad',
    evaluations_completed: 4,
    evaluations_total: 5,
    budget_estimate: 9500000,
    episode_count: 22,
  },
  {
    id: 'ST-2025-0024',
    title: 'Azm-o-Hausla',
    genre: ['Inspirational', 'Family'],
    writer: 'Sidra Syed',
    director: 'Qasim Ali Mureed',
    status: 'in_evaluation',
    overall_rating: null,
    days_active: 14,
    created_at: '2025-02-02T13:15:00Z',
    logline: 'A story of courage and perseverance',
    team: 'Team Alpha',
    content_creator: 'Waqar Ali',
    evaluations_completed: 2,
    evaluations_total: 5,
    budget_estimate: 10000000,
    episode_count: 24,
  },
  {
    id: 'ST-2025-0025',
    title: 'Pyar Ka Darya',
    genre: ['Romance', 'Family'],
    writer: 'Maha Malik',
    director: 'Usman Khalid Butt',
    status: 'submitted',
    overall_rating: null,
    days_active: 7,
    created_at: '2025-02-08T10:45:00Z',
    logline: 'A story of drowning in the depths of love',
    team: 'Team Beta',
    content_creator: 'Noman Shahid',
    evaluations_completed: 0,
    evaluations_total: 5,
    budget_estimate: 11000000,
    episode_count: 26,
  },
];

// ============================================================================
// DUMMY CALL REPORTS DATA
// ============================================================================

export const dummyCallReports: DummyCallReport[] = [
  {
    id: 'CR-2025-0001',
    story_id: 'ST-2025-0001',
    title: 'Initial Script Discussion - Mere Paas Tum Ho',
    writer_name: 'Khalil-ur-Rehman Qamar',
    attendees: ['Ahmad Ali', 'Nadeem Siddiqi', 'Salman Ahmad'],
    logged_at: '2025-01-16T14:30:00Z',
    logline: 'Detailed discussion on the first draft of the script',
    key_points: [
      'Agreement on main character details',
      'Approved story arc for first 10 episodes',
      'Initial budget estimate: 15 million rupees'
    ],
    next_steps: [
      'Detailed script for first 5 episodes',
      'Begin casting preparations',
      'Start location scouting'
    ],
    content_creator: 'Ahmad Ali',
  },
  {
    id: 'CR-2025-0002',
    story_id: 'ST-2025-0002',
    title: 'Casting Discussion - Suno Chanda',
    writer_name: 'Fatima Surayya Bajia',
    attendees: ['Sarah Khan', 'Imran Iqbal', 'Farhan Iqbal'],
    logged_at: '2025-01-19T11:00:00Z',
    logline: 'Discussion on casting options for lead roles',
    key_points: [
      'Reviewed 3 options for the lead couple',
      'Approved supporting cast list',
      'Initial shooting schedule planning'
    ],
    next_steps: [
      'Meet with selected cast members',
      'Prepare contracts',
      'Arrange reading session'
    ],
    content_creator: 'Sarah Khan',
  },
  {
    id: 'CR-2025-0003',
    story_id: 'ST-2025-0003',
    title: 'Production Meeting - Yeh Dil Mera',
    writer_name: 'Sajal Ali',
    attendees: ['Imran Hussain', 'Nadeem Siddiqi', 'Imran Abbasi'],
    logged_at: '2025-01-23T15:45:00Z',
    logline: 'Discussion on production details and schedule',
    key_points: [
      'Final confirmation of shooting locations',
      'Production team assignment',
      '24 episodes schedule finalized'
    ],
    next_steps: [
      'Begin pre-production',
      'Recruit technical staff',
      'Final budget approval'
    ],
    content_creator: 'Imran Hussain',
  },
];

// ============================================================================
// DUMMY EPISODES DATA WITH EVENTS
// ============================================================================

export const dummyEpisodes: DummyEpisode[] = [
  // Mere Paas Tum Ho - Episodes 1-10
  {
    id: 'EP-2025-0001',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 1,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-01',
    air_date: '2025-02-15',
    events: [
      {
        id: 'EVT-001',
        episode_id: 'EP-2025-0001',
        event_type: 'Script Change',
        impact: 'Low',
        description: 'Minor dialogue changes',
        created_at: '2025-02-01T09:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0002',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 2,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-03',
    air_date: '2025-02-16',
    events: [
      {
        id: 'EVT-002',
        episode_id: 'EP-2025-0002',
        event_type: 'Production Delay',
        impact: 'High',
        description: 'Shooting delayed due to bad weather',
        created_at: '2025-02-03T07:00:00Z',
        resolved: true,
      },
      {
        id: 'EVT-003',
        episode_id: 'EP-2025-0002',
        event_type: 'Location Issue',
        impact: 'Medium',
        description: 'Location permission issue',
        created_at: '2025-02-03T10:30:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0003',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 3,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-05',
    air_date: '2025-02-17',
    events: [
      {
        id: 'EVT-004',
        episode_id: 'EP-2025-0003',
        event_type: 'Technical Issue',
        impact: 'Low',
        description: 'Minor camera malfunction',
        created_at: '2025-02-05T14:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0004',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 4,
    status: 'post_production',
    script_status: 'approved',
    shooting_date: '2025-02-07',
    events: [
      {
        id: 'EVT-005',
        episode_id: 'EP-2025-0004',
        event_type: 'Cast Change',
        impact: 'High',
        description: 'Supporting character replacement',
        created_at: '2025-02-07T08:00:00Z',
        resolved: true,
      },
      {
        id: 'EVT-006',
        episode_id: 'EP-2025-0004',
        event_type: 'Schedule Change',
        impact: 'Medium',
        description: 'Shooting time change',
        created_at: '2025-02-07T11:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0005',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 5,
    status: 'shooting',
    script_status: 'approved',
    shooting_date: '2025-02-10',
    events: [
      {
        id: 'EVT-007',
        episode_id: 'EP-2025-0005',
        event_type: 'Budget Adjustment',
        impact: 'Low',
        description: 'Increased props cost',
        created_at: '2025-02-10T09:30:00Z',
        resolved: false,
      },
    ],
  },
  {
    id: 'EP-2025-0006',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 6,
    status: 'pre_production',
    script_status: 'approved',
    events: [],
  },
  {
    id: 'EP-2025-0007',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 7,
    status: 'script_writing',
    script_status: 'in_progress',
    events: [],
  },
  {
    id: 'EP-2025-0008',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    episode_number: 8,
    status: 'script_writing',
    script_status: 'pending',
    events: [],
  },
  // Suno Chanda - Episodes 1-8
  {
    id: 'EP-2025-0009',
    story_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    episode_number: 1,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-10',
    air_date: '2025-02-20',
    events: [
      {
        id: 'EVT-008',
        episode_id: 'EP-2025-0009',
        event_type: 'Weather Delay',
        impact: 'Medium',
        description: 'Delayed due to rain',
        created_at: '2025-02-10T06:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0010',
    story_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    episode_number: 2,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-12',
    air_date: '2025-02-21',
    events: [
      {
        id: 'EVT-009',
        episode_id: 'EP-2025-0010',
        event_type: 'Script Change',
        impact: 'High',
        description: 'Major story change',
        created_at: '2025-02-12T08:00:00Z',
        resolved: true,
      },
      {
        id: 'EVT-010',
        episode_id: 'EP-2025-0010',
        event_type: 'Production Delay',
        impact: 'Medium',
        description: 'Actor availability issue',
        created_at: '2025-02-12T10:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0011',
    story_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    episode_number: 3,
    status: 'post_production',
    script_status: 'approved',
    shooting_date: '2025-02-14',
    events: [
      {
        id: 'EVT-011',
        episode_id: 'EP-2025-0011',
        event_type: 'Technical Issue',
        impact: 'Low',
        description: 'Audio recording issue',
        created_at: '2025-02-14T13:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0012',
    story_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    episode_number: 4,
    status: 'shooting',
    script_status: 'approved',
    shooting_date: '2025-02-16',
    events: [],
  },
  {
    id: 'EP-2025-0013',
    story_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    episode_number: 5,
    status: 'pre_production',
    script_status: 'approved',
    events: [],
  },
  // Mohabbat Ki Rahein - Episodes 1-6
  {
    id: 'EP-2025-0014',
    story_id: 'ST-2025-0020',
    drama_title: 'Mohabbat Ki Rahein',
    episode_number: 1,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-05',
    air_date: '2025-02-18',
    events: [
      {
        id: 'EVT-012',
        episode_id: 'EP-2025-0014',
        event_type: 'Location Issue',
        impact: 'High',
        description: 'Original location unavailable',
        created_at: '2025-02-05T07:30:00Z',
        resolved: true,
      },
      {
        id: 'EVT-013',
        episode_id: 'EP-2025-0014',
        event_type: 'Budget Adjustment',
        impact: 'Medium',
        description: 'New location cost',
        created_at: '2025-02-05T09:00:00Z',
        resolved: true,
      },
      {
        id: 'EVT-014',
        episode_id: 'EP-2025-0014',
        event_type: 'Script Change',
        impact: 'Low',
        description: 'Minor scene modification',
        created_at: '2025-02-05T12:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0015',
    story_id: 'ST-2025-0020',
    drama_title: 'Mohabbat Ki Rahein',
    episode_number: 2,
    status: 'completed',
    script_status: 'approved',
    shooting_date: '2025-02-07',
    air_date: '2025-02-19',
    events: [
      {
        id: 'EVT-015',
        episode_id: 'EP-2025-0015',
        event_type: 'Production Delay',
        impact: 'Medium',
        description: 'Technical team shortage',
        created_at: '2025-02-07T08:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0016',
    story_id: 'ST-2025-0020',
    drama_title: 'Mohabbat Ki Rahein',
    episode_number: 3,
    status: 'post_production',
    script_status: 'approved',
    shooting_date: '2025-02-09',
    events: [
      {
        id: 'EVT-016',
        episode_id: 'EP-2025-0016',
        event_type: 'Cast Change',
        impact: 'Low',
        description: 'Minor character replacement',
        created_at: '2025-02-09T10:00:00Z',
        resolved: true,
      },
    ],
  },
  {
    id: 'EP-2025-0017',
    story_id: 'ST-2025-0020',
    drama_title: 'Mohabbat Ki Rahein',
    episode_number: 4,
    status: 'shooting',
    script_status: 'approved',
    shooting_date: '2025-02-11',
    events: [
      {
        id: 'EVT-017',
        episode_id: 'EP-2025-0017',
        event_type: 'Weather Delay',
        impact: 'High',
        description: 'Obstruction due to heavy rain',
        created_at: '2025-02-11T06:30:00Z',
        resolved: false,
      },
    ],
  },
];

// ============================================================================
// EVENT ANALYSIS DATA
// ============================================================================

export const eventAnalysisData: EventAnalysis[] = [
  {
    drama_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    total_episodes: 8,
    total_events: 7,
    events_by_impact: {
      High: 2,
      Medium: 2,
      Low: 3,
    },
    events_by_type: {
      'Production Delay': 1,
      'Script Change': 1,
      'Location Issue': 1,
      'Technical Issue': 1,
      'Cast Change': 1,
      'Schedule Change': 1,
      'Budget Adjustment': 1,
    },
    impact_chart_data: [
      { episode: 1, high: 0, medium: 0, low: 1 },
      { episode: 2, high: 1, medium: 1, low: 0 },
      { episode: 3, high: 0, medium: 0, low: 1 },
      { episode: 4, high: 1, medium: 1, low: 0 },
      { episode: 5, high: 0, medium: 0, low: 1 },
      { episode: 6, high: 0, medium: 0, low: 0 },
      { episode: 7, high: 0, medium: 0, low: 0 },
      { episode: 8, high: 0, medium: 0, low: 0 },
    ],
    resolution_rate: 85.7,
  },
  {
    drama_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    total_episodes: 5,
    total_events: 4,
    events_by_impact: {
      High: 1,
      Medium: 2,
      Low: 1,
    },
    events_by_type: {
      'Weather Delay': 1,
      'Script Change': 1,
      'Production Delay': 1,
      'Technical Issue': 1,
    },
    impact_chart_data: [
      { episode: 1, high: 0, medium: 1, low: 0 },
      { episode: 2, high: 1, medium: 1, low: 0 },
      { episode: 3, high: 0, medium: 0, low: 1 },
      { episode: 4, high: 0, medium: 0, low: 0 },
      { episode: 5, high: 0, medium: 0, low: 0 },
    ],
    resolution_rate: 100,
  },
  {
    drama_id: 'ST-2025-0020',
    drama_title: 'Mohabbat Ki Rahein',
    total_episodes: 4,
    total_events: 6,
    events_by_impact: {
      High: 2,
      Medium: 2,
      Low: 2,
    },
    events_by_type: {
      'Location Issue': 1,
      'Budget Adjustment': 1,
      'Script Change': 1,
      'Production Delay': 1,
      'Cast Change': 1,
      'Weather Delay': 1,
    },
    impact_chart_data: [
      { episode: 1, high: 1, medium: 1, low: 1 },
      { episode: 2, high: 0, medium: 1, low: 0 },
      { episode: 3, high: 0, medium: 0, low: 1 },
      { episode: 4, high: 1, medium: 0, low: 0 },
    ],
    resolution_rate: 83.3,
  },
];

// ============================================================================
// DUMMY TEAMS DATA
// ============================================================================

export const dummyTeams: DummyTeam[] = [
  {
    id: 'TEAM-001',
    name: 'Team Alpha',
    lead: 'Nadeem Siddiqi',
    members: ['Ahmad Ali', 'Fatima Noor', 'Nadia Khan', 'Rehan Ali', 'Waqar Ali', 'Mahira Abbas'],
    active_projects: 5,
    completed_projects: 8,
    avg_evaluation_score: 7.8,
    total_budget_managed: 71000000,
    stories: ['ST-2025-0001', 'ST-2025-0004', 'ST-2025-0007', 'ST-2025-0010', 'ST-2025-0021', 'ST-2025-0024', 'ST-2024-0015'],
  },
  {
    id: 'TEAM-002',
    name: 'Team Beta',
    lead: 'Salman Ahmad',
    members: ['Sarah Khan', 'Zainab Ahmad', 'Bilal Shah', 'Rana Malik', 'Noman Shahid', 'Salman Ahmad'],
    active_projects: 4,
    completed_projects: 6,
    avg_evaluation_score: 8.1,
    total_budget_managed: 56500000,
    stories: ['ST-2025-0002', 'ST-2025-0005', 'ST-2025-0008', 'ST-2025-0022', 'ST-2025-0025', 'ST-2024-0018', 'ST-2025-0011'],
  },
  {
    id: 'TEAM-003',
    name: 'Team Gamma',
    lead: 'Imran Abbasi',
    members: ['Imran Hussain', 'Hassan Raza', 'Ayesha Malik', 'Sania Ahmad', 'Kamran Qureshi', 'Ali Hassan'],
    active_projects: 4,
    completed_projects: 5,
    avg_evaluation_score: 7.6,
    total_budget_managed: 52500000,
    stories: ['ST-2025-0003', 'ST-2025-0006', 'ST-2025-0009', 'ST-2025-0023', 'ST-2025-0020', 'ST-2025-0012'],
  },
];

// ============================================================================
// DUMMY EVALUATORS DATA
// ============================================================================

export const dummyEvaluators: DummyEvaluator[] = [
  {
    id: 'EVAL-001',
    name: 'Nadeem Siddiqi',
    position: 'Senior Content Evaluator',
    type: 'internal',
    evaluations_completed: 45,
    avg_score_given: 7.5,
    response_time_hours: 18,
    specialization: ['Drama', 'Romance', 'Social'],
    active: true,
  },
  {
    id: 'EVAL-002',
    name: 'Salman Ahmad',
    position: 'Content Evaluator',
    type: 'internal',
    evaluations_completed: 38,
    avg_score_given: 7.8,
    response_time_hours: 24,
    specialization: ['Romance', 'Family', 'Comedy'],
    active: true,
  },
  {
    id: 'EVAL-003',
    name: 'Imran Abbasi',
    position: 'Content Evaluator',
    type: 'internal',
    evaluations_completed: 42,
    avg_score_given: 7.2,
    response_time_hours: 20,
    specialization: ['Thriller', 'Mystery', 'Action'],
    active: true,
  },
  {
    id: 'EVAL-004',
    name: 'Farhan Iqbal',
    position: 'Junior Content Evaluator',
    type: 'internal',
    evaluations_completed: 28,
    avg_score_given: 7.9,
    response_time_hours: 16,
    specialization: ['Drama', 'Family'],
    active: true,
  },
  {
    id: 'EVAL-005',
    name: 'Imran Iqbal',
    position: 'Content Evaluator',
    type: 'internal',
    evaluations_completed: 35,
    avg_score_given: 7.4,
    response_time_hours: 22,
    specialization: ['Social', 'Inspirational'],
    active: true,
  },
  {
    id: 'EVAL-006',
    name: 'Dr. Hamza Ali',
    position: 'External Expert - Literature',
    type: 'external',
    evaluations_completed: 12,
    avg_score_given: 8.2,
    response_time_hours: 48,
    specialization: ['Drama', 'Social', 'Literary'],
    active: true,
  },
  {
    id: 'EVAL-007',
    name: 'Prof. Ayesha Khan',
    position: 'External Expert - Media Studies',
    type: 'external',
    evaluations_completed: 15,
    avg_score_given: 7.9,
    response_time_hours: 36,
    specialization: ['All Genres'],
    active: true,
  },
  {
    id: 'EVAL-008',
    name: 'Anwar Maqsood',
    position: 'External Expert - Screenwriting',
    type: 'external',
    evaluations_completed: 18,
    avg_score_given: 8.0,
    response_time_hours: 40,
    specialization: ['Drama', 'Romance', 'Thriller'],
    active: true,
  },
  {
    id: 'EVAL-009',
    name: 'Samina Peerzada',
    position: 'External Expert - Theatre',
    type: 'external',
    evaluations_completed: 10,
    avg_score_given: 7.7,
    response_time_hours: 44,
    specialization: ['Drama', 'Family'],
    active: true,
  },
  {
    id: 'EVAL-010',
    name: 'Mohsin Ali',
    position: 'External Expert - Direction',
    type: 'external',
    evaluations_completed: 14,
    avg_score_given: 8.1,
    response_time_hours: 52,
    specialization: ['All Production Aspects'],
    active: true,
  },
];

// ============================================================================
// DUMMY CONTRACTS DATA
// ============================================================================

export const dummyContracts: DummyContract[] = [
  {
    id: 'CON-2025-0001',
    story_id: 'ST-2025-0001',
    drama_title: 'Mere Paas Tum Ho',
    writer: 'Khalil-ur-Rehman Qamar',
    total_amount: 15000000,
    paid_amount: 6000000,
    pending_amount: 9000000,
    status: 'signed',
    signed_date: '2025-01-20',
    payment_milestones: [
      {
        id: 'PM-001',
        milestone_name: 'Signing Bonus',
        amount: 3000000,
        due_date: '2025-01-20',
        paid: true,
        paid_date: '2025-01-20',
      },
      {
        id: 'PM-002',
        milestone_name: 'First 10 Episodes Delivery',
        amount: 3000000,
        due_date: '2025-02-10',
        paid: true,
        paid_date: '2025-02-12',
      },
      {
        id: 'PM-003',
        milestone_name: 'Episodes 11-20 Delivery',
        amount: 4500000,
        due_date: '2025-03-01',
        paid: false,
      },
      {
        id: 'PM-004',
        milestone_name: 'Final Episodes Delivery',
        amount: 4500000,
        due_date: '2025-03-20',
        paid: false,
      },
    ],
  },
  {
    id: 'CON-2025-0002',
    story_id: 'ST-2025-0002',
    drama_title: 'Suno Chanda',
    writer: 'Fatima Surayya Bajia',
    total_amount: 12000000,
    paid_amount: 4800000,
    pending_amount: 7200000,
    status: 'signed',
    signed_date: '2025-01-25',
    payment_milestones: [
      {
        id: 'PM-005',
        milestone_name: 'Signing Bonus',
        amount: 2400000,
        due_date: '2025-01-25',
        paid: true,
        paid_date: '2025-01-25',
      },
      {
        id: 'PM-006',
        milestone_name: 'First 10 Episodes',
        amount: 2400000,
        due_date: '2025-02-15',
        paid: true,
        paid_date: '2025-02-16',
      },
      {
        id: 'PM-007',
        milestone_name: 'Episodes 11-20',
        amount: 3600000,
        due_date: '2025-03-05',
        paid: false,
      },
      {
        id: 'PM-008',
        milestone_name: 'Final Episodes',
        amount: 3600000,
        due_date: '2025-03-25',
        paid: false,
      },
    ],
  },
  {
    id: 'CON-2025-0003',
    story_id: 'ST-2025-0020',
    drama_title: 'Mohabbat Ki Rahein',
    writer: 'Shazia Rehan',
    total_amount: 11500000,
    paid_amount: 2300000,
    pending_amount: 9200000,
    status: 'signed',
    signed_date: '2025-02-01',
    payment_milestones: [
      {
        id: 'PM-009',
        milestone_name: 'Signing Bonus',
        amount: 2300000,
        due_date: '2025-02-01',
        paid: true,
        paid_date: '2025-02-01',
      },
      {
        id: 'PM-010',
        milestone_name: 'First 10 Episodes',
        amount: 2300000,
        due_date: '2025-02-20',
        paid: false,
      },
      {
        id: 'PM-011',
        milestone_name: 'Episodes 11-20',
        amount: 3450000,
        due_date: '2025-03-10',
        paid: false,
      },
      {
        id: 'PM-012',
        milestone_name: 'Final Episodes',
        amount: 3450000,
        due_date: '2025-03-30',
        paid: false,
      },
    ],
  },
  {
    id: 'CON-2025-0004',
    story_id: 'ST-2025-0021',
    drama_title: 'Humsafar Doosra',
    writer: 'Farhat Ishtiaq',
    total_amount: 13500000,
    paid_amount: 0,
    pending_amount: 13500000,
    status: 'pending_signature',
    payment_milestones: [
      {
        id: 'PM-013',
        milestone_name: 'Signing Bonus',
        amount: 2700000,
        due_date: '2025-02-18',
        paid: false,
      },
      {
        id: 'PM-014',
        milestone_name: 'First 10 Episodes',
        amount: 2700000,
        due_date: '2025-03-10',
        paid: false,
      },
      {
        id: 'PM-015',
        milestone_name: 'Episodes 11-20',
        amount: 4050000,
        due_date: '2025-03-30',
        paid: false,
      },
      {
        id: 'PM-016',
        milestone_name: 'Final Episodes',
        amount: 4050000,
        due_date: '2025-04-20',
        paid: false,
      },
    ],
  },
];

// ============================================================================
// DUMMY ALERTS DATA
// ============================================================================

export const dummyAlerts: DummyAlert[] = [
  {
    id: 'ALT-001',
    type: 'deadline',
    severity: 'critical',
    title: 'Evaluation Deadline Approaching',
    description: '"Be Baak" evaluation ending in 2 days',
    related_item_id: 'ST-2025-0008',
    related_item_type: 'story',
    created_at: '2025-02-13T09:00:00Z',
    resolved: false,
  },
  {
    id: 'ALT-002',
    type: 'budget',
    severity: 'high',
    title: 'Budget Exceeded',
    description: '"Mere Paas Tum Ho" budget exceeded by 8%',
    related_item_id: 'ST-2025-0001',
    related_item_type: 'story',
    created_at: '2025-02-12T14:30:00Z',
    resolved: false,
  },
  {
    id: 'ALT-003',
    type: 'contract',
    severity: 'high',
    title: 'Awaiting Contract Signature',
    description: '"Humsafar Doosra" contract pending for 5 days',
    related_item_id: 'CON-2025-0004',
    related_item_type: 'contract',
    created_at: '2025-02-11T10:00:00Z',
    resolved: false,
  },
  {
    id: 'ALT-004',
    type: 'production',
    severity: 'medium',
    title: 'Shooting Delayed',
    description: '"Mohabbat Ki Rahein" Episode 4 delayed due to weather',
    related_item_id: 'EP-2025-0017',
    related_item_type: 'episode',
    created_at: '2025-02-11T06:30:00Z',
    resolved: false,
  },
  {
    id: 'ALT-005',
    type: 'evaluation',
    severity: 'medium',
    title: 'Incomplete Evaluation',
    description: '"Dil Na Umeed Toh Nahi" has 2 evaluations remaining',
    related_item_id: 'ST-2025-0005',
    related_item_type: 'story',
    created_at: '2025-02-10T16:00:00Z',
    resolved: false,
  },
  {
    id: 'ALT-006',
    type: 'deadline',
    severity: 'medium',
    title: 'Payment Deadline',
    description: '"Suno Chanda" next payment due in 3 days',
    related_item_id: 'CON-2025-0002',
    related_item_type: 'contract',
    created_at: '2025-02-09T11:00:00Z',
    resolved: false,
  },
];

// ============================================================================
// DUMMY ACTIVITIES DATA
// ============================================================================

export const dummyActivities: DummyActivity[] = [
  {
    id: 'ACT-001',
    type: 'story_submitted',
    title: 'New Story Submitted',
    description: '"Pyar Ka Darya" story submitted by Noman Shahid',
    user: 'Noman Shahid',
    timestamp: '2025-02-08T10:45:00Z',
    related_item_id: 'ST-2025-0025',
  },
  {
    id: 'ACT-002',
    type: 'evaluation_completed',
    title: 'Evaluation Completed',
    description: 'Nadeem Siddiqi completed evaluation of "Azm-o-Hausla"',
    user: 'Nadeem Siddiqi',
    timestamp: '2025-02-07T16:20:00Z',
    related_item_id: 'ST-2025-0024',
  },
  {
    id: 'ACT-003',
    type: 'approval_granted',
    title: 'Approval Granted',
    description: '"Zindagi Gulzar Hai" has been approved',
    user: 'Executive Team',
    timestamp: '2025-02-06T14:00:00Z',
    related_item_id: 'ST-2025-0022',
  },
  {
    id: 'ACT-004',
    type: 'contract_signed',
    title: 'Contract Signed',
    description: '"Mohabbat Ki Rahein" contract has been signed',
    user: 'Shazia Rehan',
    timestamp: '2025-02-01T11:30:00Z',
    related_item_id: 'CON-2025-0003',
  },
  {
    id: 'ACT-005',
    type: 'payment_made',
    title: 'Payment Made',
    description: 'Payment of 2,400,000 rupees made for "Suno Chanda"',
    user: 'Finance Department',
    timestamp: '2025-02-16T09:00:00Z',
    related_item_id: 'CON-2025-0002',
  },
  {
    id: 'ACT-006',
    type: 'episode_completed',
    title: 'Episode Completed',
    description: '"Mere Paas Tum Ho" Episode 3 completed',
    user: 'Production Team',
    timestamp: '2025-02-05T18:00:00Z',
    related_item_id: 'EP-2025-0003',
  },
  {
    id: 'ACT-007',
    type: 'story_submitted',
    title: 'New Story Submitted',
    description: '"Khel" story submitted by Rehan Ali',
    user: 'Rehan Ali',
    timestamp: '2025-02-12T16:00:00Z',
    related_item_id: 'ST-2025-0010',
  },
  {
    id: 'ACT-008',
    type: 'payment_made',
    title: 'Payment Made',
    description: 'Payment of 3,000,000 rupees made for "Mere Paas Tum Ho"',
    user: 'Finance Department',
    timestamp: '2025-02-12T10:00:00Z',
    related_item_id: 'CON-2025-0001',
  },
];

// ============================================================================
// AGGREGATE STATISTICS
// ============================================================================

export const aggregateStats = {
  totalStories: dummyStories.length,
  activeProjects: dummyStories.filter((s) => ['in_production', 'contracted', 'approved'].includes(s.status)).length,
  totalBudget: dummyStories.reduce((sum, s) => sum + s.budget_estimate, 0),
  averageScore: 7.6,
  totalEpisodes: dummyEpisodes.length,
  completedEpisodes: dummyEpisodes.filter((e) => e.status === 'completed').length,
  totalEvents: dummyEpisodes.reduce((sum, e) => sum + e.events.length, 0),
  unresolvedEvents: dummyEpisodes.reduce((sum, e) => sum + e.events.filter((evt) => !evt.resolved).length, 0),
  pendingEvaluations: dummyStories.filter((s) => s.status === 'in_evaluation').reduce((sum, s) => sum + (s.evaluations_total - s.evaluations_completed), 0),
  pendingPayments: dummyContracts.reduce((sum, c) => sum + c.pending_amount, 0),
  criticalAlerts: dummyAlerts.filter((a) => a.severity === 'critical' && !a.resolved).length,
};

// ============================================================================
// NEW TYPES FOR EXTENDED FUNCTIONALITY
// ============================================================================

export interface DummyDramaWithEpisodes {
  callReportId: string;
  workingTitle: string; // Drama name in Roman Urdu
  totalEpisodes: number;
  evaluatedEpisodes: number;
}

export interface DummyEpisodeWithProgress {
  episodeId: string;
  episodeNumber: number;
  status: 'completed' | 'in_progress' | 'pending';
  progressPercentage: number;
  completedEvaluators: number;
  totalEvaluators: number;
}

export interface DummyEvaluatorDetail {
  evaluatorName: string; // Name in English
  overallScore?: number;
  grade?: string;
  evaluatedAt?: string;
}

export interface DummyEventDetail {
  id: string;
  title: string;
  description: string;
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
  evaluatorName: string;
}

export interface DummyEventAnalysisData {
  episodeNumber: number;
  totalEvents: number;
  events: DummyEventDetail[];
}

export interface DummyScriptingPhaseData {
  planning: number;
  writing: number;
  review: number;
  revision: number;
  approved: number;
}

export interface DummyContractTerm {
  id: string;
  story_id: string;
  story_title: string;  // Roman Urdu
  writer_name: string;   // Roman Urdu
  negotiated_amount: number;
  status: 'in_negotiation' | 'finalized' | 'rejected';
  created_at: string;
}

// ============================================================================
// DUMMY DRAMAS WITH EPISODES DATA
// ============================================================================

export const dummyDramasWithEpisodes: DummyDramaWithEpisodes[] = [
  {
    callReportId: 'CR-2025-0001',
    workingTitle: 'Mere Paas Tum Ho',
    totalEpisodes: 6,
    evaluatedEpisodes: 4,
  },
  {
    callReportId: 'CR-2025-0002',
    workingTitle: 'Suno Chanda',
    totalEpisodes: 5,
    evaluatedEpisodes: 3,
  },
  {
    callReportId: 'CR-2025-0003',
    workingTitle: 'Yeh Dil Mera',
    totalEpisodes: 4,
    evaluatedEpisodes: 2,
  },
  {
    callReportId: 'CR-2025-0004',
    workingTitle: 'Humsafar Doosra',
    totalEpisodes: 6,
    evaluatedEpisodes: 5,
  },
  {
    callReportId: 'CR-2025-0005',
    workingTitle: 'Dil Fareeb',
    totalEpisodes: 5,
    evaluatedEpisodes: 5,
  },
  {
    callReportId: 'CR-2025-0006',
    workingTitle: 'Mohabbat Ki Rahein',
    totalEpisodes: 6,
    evaluatedEpisodes: 3,
  },
  {
    callReportId: 'CR-2025-0007',
    workingTitle: 'Khud Parast',
    totalEpisodes: 4,
    evaluatedEpisodes: 1,
  },
];

// ============================================================================
// DUMMY EPISODES BY DRAMA DATA
// ============================================================================

export const dummyEpisodesByDrama: Record<string, DummyEpisodeWithProgress[]> = {
  'CR-2025-0001': [
    {
      episodeId: 'EP-001',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-002',
      episodeNumber: 2,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-003',
      episodeNumber: 3,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-004',
      episodeNumber: 4,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-005',
      episodeNumber: 5,
      status: 'in_progress',
      progressPercentage: 66,
      completedEvaluators: 2,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-006',
      episodeNumber: 6,
      status: 'pending',
      progressPercentage: 0,
      completedEvaluators: 0,
      totalEvaluators: 4,
    },
  ],
  'CR-2025-0002': [
    {
      episodeId: 'EP-007',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-008',
      episodeNumber: 2,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-009',
      episodeNumber: 3,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-010',
      episodeNumber: 4,
      status: 'in_progress',
      progressPercentage: 50,
      completedEvaluators: 2,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-011',
      episodeNumber: 5,
      status: 'pending',
      progressPercentage: 0,
      completedEvaluators: 0,
      totalEvaluators: 3,
    },
  ],
  'CR-2025-0003': [
    {
      episodeId: 'EP-012',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-013',
      episodeNumber: 2,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-014',
      episodeNumber: 3,
      status: 'in_progress',
      progressPercentage: 75,
      completedEvaluators: 3,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-015',
      episodeNumber: 4,
      status: 'pending',
      progressPercentage: 0,
      completedEvaluators: 0,
      totalEvaluators: 4,
    },
  ],
  'CR-2025-0004': [
    {
      episodeId: 'EP-016',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-017',
      episodeNumber: 2,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-018',
      episodeNumber: 3,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-019',
      episodeNumber: 4,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-020',
      episodeNumber: 5,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-021',
      episodeNumber: 6,
      status: 'in_progress',
      progressPercentage: 25,
      completedEvaluators: 1,
      totalEvaluators: 4,
    },
  ],
  'CR-2025-0005': [
    {
      episodeId: 'EP-022',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-023',
      episodeNumber: 2,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-024',
      episodeNumber: 3,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-025',
      episodeNumber: 4,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-026',
      episodeNumber: 5,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
  ],
  'CR-2025-0006': [
    {
      episodeId: 'EP-027',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-028',
      episodeNumber: 2,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-029',
      episodeNumber: 3,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 4,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-030',
      episodeNumber: 4,
      status: 'in_progress',
      progressPercentage: 50,
      completedEvaluators: 2,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-031',
      episodeNumber: 5,
      status: 'in_progress',
      progressPercentage: 33,
      completedEvaluators: 1,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-032',
      episodeNumber: 6,
      status: 'pending',
      progressPercentage: 0,
      completedEvaluators: 0,
      totalEvaluators: 4,
    },
  ],
  'CR-2025-0007': [
    {
      episodeId: 'EP-033',
      episodeNumber: 1,
      status: 'completed',
      progressPercentage: 100,
      completedEvaluators: 3,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-034',
      episodeNumber: 2,
      status: 'in_progress',
      progressPercentage: 25,
      completedEvaluators: 1,
      totalEvaluators: 4,
    },
    {
      episodeId: 'EP-035',
      episodeNumber: 3,
      status: 'pending',
      progressPercentage: 0,
      completedEvaluators: 0,
      totalEvaluators: 3,
    },
    {
      episodeId: 'EP-036',
      episodeNumber: 4,
      status: 'pending',
      progressPercentage: 0,
      completedEvaluators: 0,
      totalEvaluators: 4,
    },
  ],
};

// ============================================================================
// DUMMY EVALUATORS BY EPISODE DATA
// ============================================================================

export const dummyEvaluatorsByEpisode: Record<string, { completed: DummyEvaluatorDetail[]; pending: DummyEvaluatorDetail[] }> = {
  'EP-001': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-01-20T14:30:00Z' },
      { evaluatorName: 'Salman Ahmad', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-21T10:15:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-01-22T09:00:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.7, grade: 'Excellent', evaluatedAt: '2025-01-22T16:45:00Z' },
    ],
    pending: [],
  },
  'EP-002': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.0, grade: 'Good', evaluatedAt: '2025-01-23T11:20:00Z' },
      { evaluatorName: 'Imran Abbasi', overallScore: 7.5, grade: 'Good', evaluatedAt: '2025-01-23T15:30:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-01-24T10:00:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-24T14:20:00Z' },
    ],
    pending: [],
  },
  'EP-003': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-01-25T09:30:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-25T13:45:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 7.6, grade: 'Good', evaluatedAt: '2025-01-26T11:00:00Z' },
    ],
    pending: [],
  },
  'EP-004': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-01-27T10:15:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.6, grade: 'Excellent', evaluatedAt: '2025-01-27T15:30:00Z' },
      { evaluatorName: 'Samina Peerzada', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-01-28T09:00:00Z' },
      { evaluatorName: 'Mohsin Ali', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-28T14:00:00Z' },
    ],
    pending: [],
  },
  'EP-005': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 7.7, grade: 'Good', evaluatedAt: '2025-01-29T11:00:00Z' },
      { evaluatorName: 'Imran Abbasi', overallScore: 7.5, grade: 'Good', evaluatedAt: '2025-01-29T16:30:00Z' },
    ],
    pending: [
      { evaluatorName: 'Farhan Iqbal' },
    ],
  },
  'EP-006': {
    completed: [],
    pending: [
      { evaluatorName: 'Nadeem Siddiqi' },
      { evaluatorName: 'Salman Ahmad' },
      { evaluatorName: 'Dr. Hamza Ali' },
      { evaluatorName: 'Prof. Ayesha Khan' },
    ],
  },
  'EP-007': {
    completed: [
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-21T10:00:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-01-21T14:30:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-01-22T11:15:00Z' },
    ],
    pending: [],
  },
  'EP-008': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-01-23T09:30:00Z' },
      { evaluatorName: 'Salman Ahmad', overallScore: 8.0, grade: 'Good', evaluatedAt: '2025-01-23T13:00:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-01-24T10:45:00Z' },
      { evaluatorName: 'Samina Peerzada', overallScore: 7.7, grade: 'Good', evaluatedAt: '2025-01-24T15:20:00Z' },
    ],
    pending: [],
  },
  'EP-009': {
    completed: [
      { evaluatorName: 'Imran Abbasi', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-01-25T11:00:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-25T14:30:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.6, grade: 'Excellent', evaluatedAt: '2025-01-26T09:15:00Z' },
    ],
    pending: [],
  },
  'EP-010': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-01-27T10:00:00Z' },
      { evaluatorName: 'Salman Ahmad', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-28T11:30:00Z' },
    ],
    pending: [
      { evaluatorName: 'Imran Iqbal' },
      { evaluatorName: 'Mohsin Ali' },
    ],
  },
  'EP-011': {
    completed: [],
    pending: [
      { evaluatorName: 'Farhan Iqbal' },
      { evaluatorName: 'Prof. Ayesha Khan' },
      { evaluatorName: 'Anwar Maqsood' },
    ],
  },
  'EP-012': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 7.6, grade: 'Good', evaluatedAt: '2025-01-24T09:00:00Z' },
      { evaluatorName: 'Imran Abbasi', overallScore: 7.4, grade: 'Good', evaluatedAt: '2025-01-24T13:45:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-01-25T10:30:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-25T15:00:00Z' },
    ],
    pending: [],
  },
  'EP-013': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 7.7, grade: 'Good', evaluatedAt: '2025-01-26T11:00:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 7.5, grade: 'Good', evaluatedAt: '2025-01-26T14:30:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.0, grade: 'Good', evaluatedAt: '2025-01-27T09:15:00Z' },
    ],
    pending: [],
  },
  'EP-014': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-01-28T10:00:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 7.6, grade: 'Good', evaluatedAt: '2025-01-28T13:30:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-29T11:00:00Z' },
    ],
    pending: [
      { evaluatorName: 'Samina Peerzada' },
    ],
  },
  'EP-015': {
    completed: [],
    pending: [
      { evaluatorName: 'Nadeem Siddiqi' },
      { evaluatorName: 'Salman Ahmad' },
      { evaluatorName: 'Imran Abbasi' },
      { evaluatorName: 'Dr. Hamza Ali' },
    ],
  },
  'EP-016': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.7, grade: 'Excellent', evaluatedAt: '2025-01-25T09:30:00Z' },
      { evaluatorName: 'Salman Ahmad', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-01-25T14:00:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-01-26T10:15:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.9, grade: 'Excellent', evaluatedAt: '2025-01-26T15:30:00Z' },
    ],
    pending: [],
  },
  'EP-017': {
    completed: [
      { evaluatorName: 'Imran Abbasi', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-01-27T11:00:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.6, grade: 'Excellent', evaluatedAt: '2025-01-27T14:45:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-28T09:30:00Z' },
    ],
    pending: [],
  },
  'EP-018': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-01-29T10:00:00Z' },
      { evaluatorName: 'Salman Ahmad', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-01-29T13:15:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-30T11:30:00Z' },
      { evaluatorName: 'Samina Peerzada', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-01-30T15:00:00Z' },
    ],
    pending: [],
  },
  'EP-019': {
    completed: [
      { evaluatorName: 'Imran Abbasi', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-31T09:45:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 8.0, grade: 'Good', evaluatedAt: '2025-01-31T14:00:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.6, grade: 'Excellent', evaluatedAt: '2025-02-01T10:30:00Z' },
      { evaluatorName: 'Mohsin Ali', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-02-01T15:15:00Z' },
    ],
    pending: [],
  },
  'EP-020': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-02-02T11:00:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.7, grade: 'Excellent', evaluatedAt: '2025-02-02T14:30:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-02-03T09:00:00Z' },
    ],
    pending: [],
  },
  'EP-021': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-02-04T10:15:00Z' },
    ],
    pending: [
      { evaluatorName: 'Farhan Iqbal' },
      { evaluatorName: 'Prof. Ayesha Khan' },
      { evaluatorName: 'Samina Peerzada' },
    ],
  },
  'EP-022': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.6, grade: 'Excellent', evaluatedAt: '2025-01-26T09:30:00Z' },
      { evaluatorName: 'Imran Abbasi', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-01-26T13:00:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-27T10:15:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.8, grade: 'Excellent', evaluatedAt: '2025-01-27T14:45:00Z' },
    ],
    pending: [],
  },
  'EP-023': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-01-28T11:00:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-01-28T14:30:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-01-29T09:15:00Z' },
    ],
    pending: [],
  },
  'EP-024': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.7, grade: 'Excellent', evaluatedAt: '2025-01-30T10:00:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-01-30T13:30:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.9, grade: 'Excellent', evaluatedAt: '2025-01-31T11:00:00Z' },
      { evaluatorName: 'Samina Peerzada', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-01-31T15:30:00Z' },
    ],
    pending: [],
  },
  'EP-025': {
    completed: [
      { evaluatorName: 'Imran Abbasi', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-02-01T09:45:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.6, grade: 'Excellent', evaluatedAt: '2025-02-01T14:00:00Z' },
      { evaluatorName: 'Mohsin Ali', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-02-02T10:30:00Z' },
    ],
    pending: [],
  },
  'EP-026': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.8, grade: 'Excellent', evaluatedAt: '2025-02-03T11:00:00Z' },
      { evaluatorName: 'Salman Ahmad', overallScore: 8.5, grade: 'Excellent', evaluatedAt: '2025-02-03T14:30:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-02-04T09:00:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.9, grade: 'Excellent', evaluatedAt: '2025-02-04T13:45:00Z' },
    ],
    pending: [],
  },
  'EP-027': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-02-06T10:00:00Z' },
      { evaluatorName: 'Imran Abbasi', overallScore: 7.7, grade: 'Good', evaluatedAt: '2025-02-06T14:15:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-02-07T09:30:00Z' },
      { evaluatorName: 'Anwar Maqsood', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-02-07T13:00:00Z' },
    ],
    pending: [],
  },
  'EP-028': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 8.0, grade: 'Good', evaluatedAt: '2025-02-08T11:00:00Z' },
      { evaluatorName: 'Farhan Iqbal', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-02-08T14:30:00Z' },
      { evaluatorName: 'Samina Peerzada', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-02-09T10:15:00Z' },
    ],
    pending: [],
  },
  'EP-029': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 8.1, grade: 'Excellent', evaluatedAt: '2025-02-10T09:45:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-02-10T13:30:00Z' },
      { evaluatorName: 'Prof. Ayesha Khan', overallScore: 8.4, grade: 'Excellent', evaluatedAt: '2025-02-11T11:00:00Z' },
      { evaluatorName: 'Mohsin Ali', overallScore: 8.2, grade: 'Excellent', evaluatedAt: '2025-02-11T15:00:00Z' },
    ],
    pending: [],
  },
  'EP-030': {
    completed: [
      { evaluatorName: 'Imran Abbasi', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-02-12T10:00:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 8.3, grade: 'Excellent', evaluatedAt: '2025-02-12T14:15:00Z' },
    ],
    pending: [
      { evaluatorName: 'Farhan Iqbal' },
      { evaluatorName: 'Anwar Maqsood' },
    ],
  },
  'EP-031': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 7.9, grade: 'Good', evaluatedAt: '2025-02-13T11:30:00Z' },
    ],
    pending: [
      { evaluatorName: 'Nadeem Siddiqi' },
      { evaluatorName: 'Samina Peerzada' },
    ],
  },
  'EP-032': {
    completed: [],
    pending: [
      { evaluatorName: 'Imran Abbasi' },
      { evaluatorName: 'Prof. Ayesha Khan' },
      { evaluatorName: 'Mohsin Ali' },
      { evaluatorName: 'Farhan Iqbal' },
    ],
  },
  'EP-033': {
    completed: [
      { evaluatorName: 'Nadeem Siddiqi', overallScore: 7.5, grade: 'Good', evaluatedAt: '2025-01-27T10:00:00Z' },
      { evaluatorName: 'Imran Iqbal', overallScore: 7.3, grade: 'Average', evaluatedAt: '2025-01-27T14:30:00Z' },
      { evaluatorName: 'Dr. Hamza Ali', overallScore: 7.8, grade: 'Good', evaluatedAt: '2025-01-28T09:15:00Z' },
    ],
    pending: [],
  },
  'EP-034': {
    completed: [
      { evaluatorName: 'Salman Ahmad', overallScore: 7.4, grade: 'Good', evaluatedAt: '2025-02-05T11:00:00Z' },
    ],
    pending: [
      { evaluatorName: 'Farhan Iqbal' },
      { evaluatorName: 'Prof. Ayesha Khan' },
      { evaluatorName: 'Anwar Maqsood' },
    ],
  },
  'EP-035': {
    completed: [],
    pending: [
      { evaluatorName: 'Nadeem Siddiqi' },
      { evaluatorName: 'Imran Abbasi' },
      { evaluatorName: 'Samina Peerzada' },
    ],
  },
  'EP-036': {
    completed: [],
    pending: [
      { evaluatorName: 'Salman Ahmad' },
      { evaluatorName: 'Farhan Iqbal' },
      { evaluatorName: 'Dr. Hamza Ali' },
      { evaluatorName: 'Mohsin Ali' },
    ],
  },
};

// ============================================================================
// DUMMY EVENT ANALYSIS DATA BY CALL REPORT
// ============================================================================

export const dummyEventAnalysisDataByCallReport: Record<string, DummyEventAnalysisData[]> = {
  'CR-2025-0001': [
    {
      episodeNumber: 1,
      totalEvents: 2,
      events: [
        {
          id: 'ev-001-ep1-1',
          title: 'Mehwish\'s Desire Revealed',
          description: 'Mehwish expresses her dissatisfaction with middle-class life to Danish',
          impact: 'Low Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
        {
          id: 'ev-001-ep1-2',
          title: 'Shehwar\'s Introduction',
          description: 'Danish meets wealthy businessman Shehwar who shows interest in their family',
          impact: 'Medium Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
      ],
    },
    {
      episodeNumber: 2,
      totalEvents: 2,
      events: [
        {
          id: 'ev-001-ep2-1',
          title: 'The Affair Begins',
          description: 'Mehwish starts secretly meeting Shehwar, beginning their illicit relationship',
          impact: 'High Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
        {
          id: 'ev-001-ep2-2',
          title: 'Danish\'s Suspicions',
          description: 'Danish notices Mehwish\'s changed behavior and growing distance from family',
          impact: 'Medium Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 2,
      events: [
        {
          id: 'ev-001-ep3-1',
          title: 'Rumi\'s Innocence',
          description: 'Young Rumi unknowingly mentions mother\'s meetings with "uncle" to Danish',
          impact: 'Low Impact',
          evaluatorName: 'Salman Ahmad',
        },
        {
          id: 'ev-001-ep3-2',
          title: 'Confrontation Building',
          description: 'Danish discovers evidence of Mehwish\'s betrayal, setting stage for confrontation',
          impact: 'Low Impact',
          evaluatorName: 'Farah Naz',
        },
      ],
    },
    {
      episodeNumber: 4,
      totalEvents: 3,
      events: [
        {
          id: 'ev-001-ep4-1',
          title: 'The Devastating Truth',
          description: 'Danish catches Mehwish with Shehwar, leading to emotional breakdown',
          impact: 'High Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
        {
          id: 'ev-001-ep4-2',
          title: 'Mehwish\'s Choice',
          description: 'Mehwish chooses wealth over family, devastating Danish and young Rumi',
          impact: 'Medium Impact',
          evaluatorName: 'Imran Hussain',
        },
        {
          id: 'ev-001-ep4-3',
          title: 'Mother\'s Support',
          description: 'Danish\'s mother offers emotional support and vows to help raise Rumi',
          impact: 'Low Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 5,
      totalEvents: 1,
      events: [
        {
          id: 'ev-001-ep5-1',
          title: 'Shehwar\'s True Nature',
          description: 'Mehwish realizes Shehwar\'s temporary interest, regretting her decision',
          impact: 'Medium Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
      ],
    },
    {
      episodeNumber: 6,
      totalEvents: 0,
      events: [],
    },
  ],
  'CR-2025-0002': [
    {
      episodeNumber: 1,
      totalEvents: 1,
      events: [
        {
          id: 'ev-002-ep1-1',
          title: 'Forced Engagement',
          description: 'Arsal and Ajiya are forced into engagement by their families despite mutual dislike',
          impact: 'Medium Impact',
          evaluatorName: 'Salman Ahmad',
        },
      ],
    },
    {
      episodeNumber: 2,
      totalEvents: 3,
      events: [
        {
          id: 'ev-002-ep2-1',
          title: 'Comedy of Conflicts',
          description: 'Arsal and Ajiya\'s constant bickering creates hilarious family chaos',
          impact: 'High Impact',
          evaluatorName: 'Farah Naz',
        },
        {
          id: 'ev-002-ep2-2',
          title: 'Hidden Feelings Surface',
          description: 'Despite arguments, subtle moments hint at growing attraction between cousins',
          impact: 'Medium Impact',
          evaluatorName: 'Imran Hussain',
        },
        {
          id: 'ev-002-ep2-3',
          title: 'Family Dynamics',
          description: 'Extended family members add comedic interference in the couple\'s relationship',
          impact: 'Low Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 1,
      events: [
        {
          id: 'ev-002-ep3-1',
          title: 'Jealousy Revealed',
          description: 'Arsal becomes jealous when another suitor shows interest in Ajiya',
          impact: 'Low Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
      ],
    },
    {
      episodeNumber: 4,
      totalEvents: 1,
      events: [
        {
          id: 'ev-002-ep4-1',
          title: 'Romantic Realization',
          description: 'Both realize their love during a family crisis requiring them to work together',
          impact: 'Medium Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
      ],
    },
    {
      episodeNumber: 5,
      totalEvents: 0,
      events: [],
    },
  ],
  'CR-2025-0003': [
    {
      episodeNumber: 1,
      totalEvents: 1,
      events: [
        {
          id: 'ev-003-ep1-1',
          title: 'Love at First Sight',
          description: 'Aman falls deeply in love with Zoya at their first meeting',
          impact: 'Low Impact',
          evaluatorName: 'Salman Ahmad',
        },
      ],
    },
    {
      episodeNumber: 2,
      totalEvents: 1,
      events: [
        {
          id: 'ev-003-ep2-1',
          title: 'Dark Family Secret',
          description: 'Aman\'s mother harbors a dark secret connected to Zoya\'s past',
          impact: 'High Impact',
          evaluatorName: 'Farah Naz',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 2,
      events: [
        {
          id: 'ev-003-ep3-1',
          title: 'Childhood Trauma Revealed',
          description: 'Zoya\'s traumatic childhood connection to Aman\'s family is discovered',
          impact: 'Medium Impact',
          evaluatorName: 'Imran Hussain',
        },
        {
          id: 'ev-003-ep3-2',
          title: 'Forbidden Love',
          description: 'Family opposition intensifies as past secrets threaten their relationship',
          impact: 'Low Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 4,
      totalEvents: 0,
      events: [],
    },
  ],
  'CR-2025-0004': [
    {
      episodeNumber: 1,
      totalEvents: 3,
      events: [
        {
          id: 'ev-004-ep1-1',
          title: 'Betrayal Aftermath',
          description: 'Protagonist discovers spouse\'s betrayal, life shatters completely',
          impact: 'High Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
        {
          id: 'ev-004-ep1-2',
          title: 'Unexpected Meeting',
          description: 'Chance encounter with childhood friend offers glimpse of hope',
          impact: 'Medium Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
        {
          id: 'ev-004-ep1-3',
          title: 'Trust Issues',
          description: 'Protagonist struggles to trust anyone after devastating betrayal',
          impact: 'Low Impact',
          evaluatorName: 'Salman Ahmad',
        },
      ],
    },
    {
      episodeNumber: 2,
      totalEvents: 1,
      events: [
        {
          id: 'ev-004-ep2-1',
          title: 'Healing Begins',
          description: 'Childhood friend\'s support helps protagonist start emotional healing journey',
          impact: 'Medium Impact',
          evaluatorName: 'Farah Naz',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 1,
      events: [
        {
          id: 'ev-004-ep3-1',
          title: 'Growing Connection',
          description: 'Friendship deepens as shared vulnerabilities create emotional bond',
          impact: 'Low Impact',
          evaluatorName: 'Imran Hussain',
        },
      ],
    },
    {
      episodeNumber: 4,
      totalEvents: 1,
      events: [
        {
          id: 'ev-004-ep4-1',
          title: 'Second Chance Confession',
          description: 'Childhood friend confesses long-hidden love, offering second chance at happiness',
          impact: 'High Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 5,
      totalEvents: 2,
      events: [
        {
          id: 'ev-004-ep5-1',
          title: 'Past Haunts Present',
          description: 'Ex-spouse\'s return threatens newfound happiness and stability',
          impact: 'Medium Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
        {
          id: 'ev-004-ep5-2',
          title: 'Choosing Love',
          description: 'Protagonist chooses genuine love over toxic past relationship',
          impact: 'Low Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
      ],
    },
    {
      episodeNumber: 6,
      totalEvents: 0,
      events: [],
    },
  ],
  'CR-2025-0005': [
    {
      episodeNumber: 1,
      totalEvents: 0,
      events: [],
    },
    {
      episodeNumber: 2,
      totalEvents: 1,
      events: [
        {
          id: 'ev-005-ep2-1',
          title: 'Hidden Identity Exposed',
          description: 'Protagonist discovers lover has been living under false identity',
          impact: 'Medium Impact',
          evaluatorName: 'Salman Ahmad',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 1,
      events: [
        {
          id: 'ev-005-ep3-1',
          title: 'Deception Unravels',
          description: 'Web of lies begins to unravel, revealing ulterior motives behind romance',
          impact: 'Low Impact',
          evaluatorName: 'Farah Naz',
        },
      ],
    },
    {
      episodeNumber: 4,
      totalEvents: 0,
      events: [],
    },
    {
      episodeNumber: 5,
      totalEvents: 0,
      events: [],
    },
  ],
  'CR-2025-0006': [
    {
      episodeNumber: 1,
      totalEvents: 2,
      events: [
        {
          id: 'ev-006-ep1-1',
          title: 'Against All Odds',
          description: 'Couple from different social classes faces family opposition to their love',
          impact: 'High Impact',
          evaluatorName: 'Imran Hussain',
        },
        {
          id: 'ev-006-ep1-2',
          title: 'Promise of Forever',
          description: 'Lovers vow to overcome every obstacle standing between them',
          impact: 'Low Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 2,
      totalEvents: 1,
      events: [
        {
          id: 'ev-006-ep2-1',
          title: 'Family Pressure',
          description: 'Parents arrange alternative matches to break the couple apart',
          impact: 'Medium Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 1,
      events: [
        {
          id: 'ev-006-ep3-1',
          title: 'Sacrifice for Love',
          description: 'One lover makes personal sacrifice to prove commitment to relationship',
          impact: 'Low Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
      ],
    },
    {
      episodeNumber: 4,
      totalEvents: 2,
      events: [
        {
          id: 'ev-006-ep4-1',
          title: 'Near Separation',
          description: 'Misunderstanding creates rift threatening to end relationship permanently',
          impact: 'High Impact',
          evaluatorName: 'Salman Ahmad',
        },
        {
          id: 'ev-006-ep4-2',
          title: 'Truth Prevails',
          description: 'Honesty and communication help couple overcome misunderstanding',
          impact: 'Medium Impact',
          evaluatorName: 'Farah Naz',
        },
      ],
    },
    {
      episodeNumber: 5,
      totalEvents: 2,
      events: [
        {
          id: 'ev-006-ep5-1',
          title: 'Family Acceptance',
          description: 'Parents witness couple\'s devotion and begin softening opposition',
          impact: 'Medium Impact',
          evaluatorName: 'Imran Hussain',
        },
        {
          id: 'ev-006-ep5-2',
          title: 'Love Conquers All',
          description: 'Families unite in blessing the marriage, celebrating triumph of love',
          impact: 'Low Impact',
          evaluatorName: 'Nadeem Siddiqi',
        },
      ],
    },
    {
      episodeNumber: 6,
      totalEvents: 0,
      events: [],
    },
  ],
  'CR-2025-0007': [
    {
      episodeNumber: 1,
      totalEvents: 1,
      events: [
        {
          id: 'ev-007-ep1-1',
          title: 'Selfish Protagonist',
          description: 'Self-centered character prioritizes personal desires over family welfare',
          impact: 'Medium Impact',
          evaluatorName: 'Dr. Hamza Ali',
        },
      ],
    },
    {
      episodeNumber: 2,
      totalEvents: 1,
      events: [
        {
          id: 'ev-007-ep2-1',
          title: 'Consequences Emerge',
          description: 'Selfish actions begin causing pain to loved ones around protagonist',
          impact: 'Low Impact',
          evaluatorName: 'Prof. Ayesha Khan',
        },
      ],
    },
    {
      episodeNumber: 3,
      totalEvents: 0,
      events: [],
    },
    {
      episodeNumber: 4,
      totalEvents: 0,
      events: [],
    },
  ],
};

// ============================================================================
// DUMMY SCRIPTING PHASE DATA
// ============================================================================

export const dummyScriptingPhase: DummyScriptingPhaseData = {
  planning: 18,
  writing: 27,
  review: 15,
  revision: 12,
  approved: 34,
};

// ============================================================================
// DUMMY ARCHIVE BY GENRE DATA
// ============================================================================

export const dummyArchiveByGenre: { genre: string; count: number }[] = [
  { genre: 'Drama', count: 12 },
  { genre: 'Romance', count: 8 },
  { genre: 'Social', count: 6 },
  { genre: 'Thriller', count: 4 },
  { genre: 'Family', count: 7 },
  { genre: 'Comedy', count: 3 },
  { genre: 'Action', count: 2 },
  { genre: 'Inspirational', count: 5 },
  { genre: 'Mystery', count: 3 },
  { genre: 'Psychological', count: 2 },
];

// ============================================================================
// DUMMY CONTRACT TERMS (NEGOTIATIONS) DATA
// ============================================================================

export const dummyContractTerms: DummyContractTerm[] = [
  {
    id: 'NEG-2025-0001',
    story_id: 'ST-2025-0004',
    story_title: 'Khud Parast',
    writer_name: 'Umera Ahmad',
    negotiated_amount: 13000000,
    status: 'finalized',
    created_at: '2025-01-26T10:00:00Z',
  },
  {
    id: 'NEG-2025-0002',
    story_id: 'ST-2025-0022',
    story_title: 'Zindagi Gulzar Hai',
    writer_name: 'Nehal Toora',
    negotiated_amount: 10500000,
    status: 'finalized',
    created_at: '2025-01-27T11:30:00Z',
  },
  {
    id: 'NEG-2025-0003',
    story_id: 'ST-2025-0003',
    story_title: 'Yeh Dil Mera',
    writer_name: 'Sajal Ali',
    negotiated_amount: 10000000,
    status: 'finalized',
    created_at: '2025-01-23T14:15:00Z',
  },
  {
    id: 'NEG-2025-0004',
    story_id: 'ST-2025-0005',
    story_title: 'Dil Na Umeed Toh Nahi',
    writer_name: 'Bee Gul',
    negotiated_amount: 11000000,
    status: 'in_negotiation',
    created_at: '2025-01-29T09:30:00Z',
  },
  {
    id: 'NEG-2025-0005',
    story_id: 'ST-2025-0006',
    story_title: 'Ishq Jhoota Sahi',
    writer_name: 'Asma Nabeel',
    negotiated_amount: 9000000,
    status: 'in_negotiation',
    created_at: '2025-02-02T10:45:00Z',
  },
  {
    id: 'NEG-2025-0006',
    story_id: 'ST-2025-0007',
    story_title: 'Ranj-o-Gham',
    writer_name: 'Shahid Nadeem',
    negotiated_amount: 14000000,
    status: 'in_negotiation',
    created_at: '2025-02-05T13:00:00Z',
  },
  {
    id: 'NEG-2025-0007',
    story_id: 'ST-2025-0023',
    story_title: 'Tanhaiyaan',
    writer_name: 'Ahmad Maher',
    negotiated_amount: 9500000,
    status: 'in_negotiation',
    created_at: '2025-02-01T15:30:00Z',
  },
  {
    id: 'NEG-2025-0008',
    story_id: 'ST-2025-0024',
    story_title: 'Azm-o-Hausla',
    writer_name: 'Sidra Syed',
    negotiated_amount: 10000000,
    status: 'in_negotiation',
    created_at: '2025-02-03T11:15:00Z',
  },
  {
    id: 'NEG-2025-0009',
    story_id: 'ST-2025-0008',
    story_title: 'Be Baak',
    writer_name: 'Muhammad Ahmad',
    negotiated_amount: 18000000,
    status: 'rejected',
    created_at: '2025-02-08T09:00:00Z',
  },
  {
    id: 'NEG-2025-0010',
    story_id: 'ST-2025-0009',
    story_title: 'Intezaar',
    writer_name: 'Mansha Yaad',
    negotiated_amount: 8000000,
    status: 'rejected',
    created_at: '2025-02-11T10:30:00Z',
  },
];

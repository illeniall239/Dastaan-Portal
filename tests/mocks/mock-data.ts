/**
 * Mock Data for Testing
 *
 * Centralized mock data for all entities used in tests.
 * Provides realistic test data with proper relationships.
 */

// Existing mocks (from setup.ts)
export const mockUser = {
  id: 'user-123',
  email: 'test@geo.com',
  name: 'Test User',
  role: 'content_manager',
  department: 'Content',
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockEvaluator = {
  id: 'evaluator-123',
  email: 'evaluator@geo.com',
  name: 'Test Evaluator',
  role: 'evaluator',
  department: 'Evaluation',
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockStory = {
  id: 'story-123',
  story_id: 'ST-2025-0001',
  title: 'Test Drama Story',
  writer_originator_name: 'John Writer',
  genre: 'Drama',
  category: 'Original',
  status: 'submitted',
  logline: 'A compelling drama about...',
  created_by: mockUser.id,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

export const mockCallReport = {
  id: 'report-123',
  call_report_id: 'CR-2025-0001',
  working_title: 'Test Meeting Report',
  writer_name: 'John Writer',
  meeting_type: 'call_report',
  genre: 'Drama',
  category: 'Original',
  status: 'submitted',
  meeting_date: '2025-01-10',
  logline: 'Meeting summary...',
  created_by: mockUser.id,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  archived_at: null,
};

// New repository mocks

export const mockContract = {
  id: 'contract-123',
  contract_id: 'CON-2025-0001',
  contract_number: 'CON-2025-0001',
  story_id: mockStory.id,
  project_title: 'Test Drama Project',
  total_amount: 5000000,
  status: 'active',
  signed_date: '2025-01-15',
  start_date: '2025-02-01',
  end_date: '2025-12-31',
  terms: 'Standard contract terms',
  created_by: mockUser.id,
  created_at: '2025-01-15T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};

export const mockPayment = {
  id: 'payment-123',
  payment_id: 'PAY-2025-0001',
  contract_id: mockContract.id,
  amount: 1000000,
  due_date: '2025-03-01',
  milestone_name: 'Script Completion',
  milestone_description: 'Upon completion of the script',
  status: 'pending',
  payment_amount: 1000000,
  paid_date: null,
  created_at: '2025-01-15T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};

export const mockPaymentPaid = {
  ...mockPayment,
  id: 'payment-456',
  payment_id: 'PAY-2025-0002',
  status: 'paid',
  paid_date: '2025-03-01T10:00:00Z',
};

export const mockOneLiner = {
  id: 'oneliner-123',
  story_id: mockStory.id,
  executive_id: mockUser.id,
  decision: 'approved',
  summary: 'Excellent story with strong market potential',
  strengths: 'Original concept, strong characters',
  concerns: 'Budget considerations',
  recommendation: 'Proceed with development',
  created_at: '2025-01-20T00:00:00Z',
  updated_at: '2025-01-20T00:00:00Z',
};

export const mockScriptPhase = {
  id: 'phase-123',
  contract_id: mockContract.id,
  phase_name: 'Draft 1',
  phase_number: 1,
  status: 'completed',
  start_date: '2025-02-01',
  end_date: '2025-03-01',
  completed_at: '2025-02-28T00:00:00Z',
  notes: 'First draft completed on time',
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-02-28T00:00:00Z',
};

export const mockScriptPhaseInProgress = {
  ...mockScriptPhase,
  id: 'phase-456',
  phase_name: 'Draft 2',
  phase_number: 2,
  status: 'in_progress',
  completed_at: null,
  updated_at: '2025-03-10T00:00:00Z',
};

export const mockNegotiation = {
  id: 'negotiation-123',
  negotiation_id: 'NEG-2025-0001',
  story_id: mockStory.id,
  proposed_price: 4500000,
  agreed_price: null,
  status: 'pending',
  terms: 'Initial offer terms',
  counter_offer_price: null,
  notes: 'Awaiting response',
  created_by: mockUser.id,
  created_at: '2025-01-10T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
  last_updated: '2025-01-10T00:00:00Z',
};

export const mockNegotiationAgreed = {
  ...mockNegotiation,
  id: 'negotiation-456',
  negotiation_id: 'NEG-2025-0002',
  agreed_price: 5000000,
  status: 'agreed',
  updated_at: '2025-01-15T00:00:00Z',
};

export const mockArchive = {
  id: 'archive-123',
  archive_id: 'ARC-2025-0001',
  story_id: mockStory.id,
  rejection_stage: 'evaluation',
  rejection_date: '2025-01-25',
  rejection_reason: 'Low evaluation scores',
  rejection_category: 'Quality',
  time_in_system_days: 25,
  archived_at: '2025-01-25T00:00:00Z',
  rejected_by: mockUser.id,
};

export const mockRejectedArchive = {
  id: 'rejected-123',
  call_report_id: mockCallReport.id,
  working_title: 'Rejected Story Idea',
  writer_name: 'John Writer',
  category: 'Original',
  average_score: 4.5,
  total_evaluations: 3,
  rejection_reason: 'Below minimum score threshold',
  archived_at: '2025-01-25T00:00:00Z',
  original_created_at: '2025-01-01T00:00:00Z',
};

export const mockEpisode = {
  id: 'episode-123',
  episode_id: 'EP-2025-0001',
  call_report_id: mockCallReport.id,
  story_id: null,
  episode_number: 1,
  no_of_pages: 45,
  no_of_scenes: 23,
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
};

export const mockEpisodicEvaluation = {
  id: 'ep-eval-123',
  episode_id: mockEpisode.id,
  evaluator_id: mockEvaluator.id,
  conflict_of_content_score: 8,
  characterization_score: 7,
  story_progression_score: 8,
  freezes_score: 7,
  whats_next_element_score: 8,
  overall_average: 7.6,
  overall_grade: 'B+',
  events: [
    { title: 'Major plot twist', description: 'Unexpected revelation', impact: 'High Impact' },
  ],
  submitted_at: '2025-02-05T00:00:00Z',
  created_at: '2025-02-05T00:00:00Z',
};

export const mockAuditLog = {
  id: 'audit-123',
  entity_type: 'story',
  entity_id: mockStory.id,
  action: 'created',
  performed_by: mockUser.id,
  timestamp: '2025-01-01T00:00:00Z',
  details: {
    entity_name: mockStory.title,
    story_id: mockStory.story_id,
  },
};

// Collections for bulk testing
export const mockContracts = [
  mockContract,
  {
    ...mockContract,
    id: 'contract-456',
    contract_id: 'CON-2025-0002',
    contract_number: 'CON-2025-0002',
    project_title: 'Another Drama',
    total_amount: 3000000,
    status: 'pending',
  },
  {
    ...mockContract,
    id: 'contract-789',
    contract_id: 'CON-2025-0003',
    contract_number: 'CON-2025-0003',
    project_title: 'Third Drama',
    total_amount: 6000000,
    status: 'active',
  },
];

export const mockPayments = [
  mockPayment,
  mockPaymentPaid,
  {
    ...mockPayment,
    id: 'payment-789',
    payment_id: 'PAY-2025-0003',
    due_date: '2025-06-01',
    milestone_name: 'Shooting Completion',
    status: 'pending',
  },
];

export const mockScriptPhases = [
  mockScriptPhase,
  mockScriptPhaseInProgress,
  {
    ...mockScriptPhase,
    id: 'phase-789',
    phase_name: 'Final Draft',
    phase_number: 3,
    status: 'pending',
    completed_at: null,
  },
];

// Helper to create custom mock data
export function createMockContract(overrides: Partial<typeof mockContract> = {}) {
  return { ...mockContract, ...overrides };
}

export function createMockPayment(overrides: Partial<typeof mockPayment> = {}) {
  return { ...mockPayment, ...overrides };
}

export function createMockOneLiner(overrides: Partial<typeof mockOneLiner> = {}) {
  return { ...mockOneLiner, ...overrides };
}

export function createMockScriptPhase(overrides: Partial<typeof mockScriptPhase> = {}) {
  return { ...mockScriptPhase, ...overrides };
}

export function createMockNegotiation(overrides: Partial<typeof mockNegotiation> = {}) {
  return { ...mockNegotiation, ...overrides };
}

export function createMockArchive(overrides: Partial<typeof mockArchive> = {}) {
  return { ...mockArchive, ...overrides };
}

export function createMockStory(overrides: Partial<typeof mockStory> = {}) {
  return { ...mockStory, ...overrides };
}

export function createMockCallReport(overrides: Partial<typeof mockCallReport> = {}) {
  return { ...mockCallReport, ...overrides };
}

export function createMockEpisode(overrides: Partial<typeof mockEpisode> = {}) {
  return { ...mockEpisode, ...overrides };
}

export function createMockEpisodicEvaluation(overrides: Partial<typeof mockEpisodicEvaluation> = {}) {
  return { ...mockEpisodicEvaluation, ...overrides };
}

export function createMockEvaluatorForm(overrides: Partial<typeof mockEvaluator> = {}) {
  return { ...mockEvaluator, ...overrides };
}

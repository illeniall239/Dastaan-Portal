-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Users & Roles
-- =====================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'content_creator',
    'content_manager',
    'evaluator',
    'executive',
    'legal',
    'finance',
    'admin'
  )),
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB
);

-- =====================================================
-- Stories & Workflow
-- =====================================================

-- Stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id TEXT UNIQUE NOT NULL, -- STR-YYYY-NNNN
  title TEXT NOT NULL,
  logged_by TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'external_producer',
    'writer_pitch',
    'inhouse_content'
  )),
  writer_originator_name TEXT NOT NULL,
  suggested_writer TEXT,
  synopsis TEXT NOT NULL,
  genre TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  current_stage TEXT DEFAULT 'submitted',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call Reports
CREATE TABLE call_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  meeting_date TIMESTAMP,
  writer_name TEXT NOT NULL,
  contact_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  working_title TEXT NOT NULL,
  logline TEXT NOT NULL,
  usp TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  meeting_notes TEXT NOT NULL,
  meeting_attendees TEXT[],
  next_steps TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Evaluator Forms
CREATE TABLE evaluator_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id TEXT UNIQUE NOT NULL,
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id),
  -- Scores
  originality_score INT CHECK (originality_score BETWEEN 1 AND 10),
  market_potential_score INT CHECK (market_potential_score BETWEEN 1 AND 10),
  execution_feasibility_score INT CHECK (execution_feasibility_score BETWEEN 1 AND 10),
  audience_appeal_score INT CHECK (audience_appeal_score BETWEEN 1 AND 10),
  budget_viability_score INT CHECK (budget_viability_score BETWEEN 1 AND 10),
  cultural_relevance_score INT CHECK (cultural_relevance_score BETWEEN 1 AND 10),
  competitive_advantage_score INT CHECK (competitive_advantage_score BETWEEN 1 AND 10),
  production_complexity_score INT CHECK (production_complexity_score BETWEEN 1 AND 10),
  average_score DECIMAL(3,1),
  -- Feedback
  overall_comments TEXT NOT NULL,
  strengths TEXT,
  weaknesses TEXT,
  key_changes TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'need_info')),
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);

-- Evaluation Logs
CREATE TABLE evaluation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE,
  aggregate_average_score DECIMAL(3,1),
  aggregate_median_score DECIMAL(3,1),
  approval_count INT,
  rejection_count INT,
  need_info_count INT,
  total_evaluators INT,
  final_decision TEXT CHECK (final_decision IN ('approved', 'rejected', 'pending')),
  decision_logic_used TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Approvals & Negotiations
-- =====================================================

-- One-Liners
CREATE TABLE one_liners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  one_liner_summary TEXT NOT NULL,
  writer_name TEXT,
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  avg_eval_score DECIMAL(3,1),
  approvals_count INT,
  key_strengths TEXT[],
  estimated_budget DECIMAL(12,2),
  urgency TEXT,
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'pending')),
  decision_notes TEXT,
  budget_approved BOOLEAN,
  conditions TEXT,
  priority TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Negotiations
CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negotiation_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  writer_producer_name TEXT,
  proposed_price DECIMAL(12,2),
  payment_structure TEXT,
  currency TEXT,
  price_justification TEXT,
  expected_start_date DATE,
  expected_completion_date DATE,
  counter_offer DECIMAL(12,2),
  counter_offer_justification TEXT,
  negotiation_history JSONB[],
  status TEXT CHECK (status IN ('in_progress', 'agreed', 'failed')),
  agreed_price DECIMAL(12,2),
  agreed_terms TEXT,
  failed_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Legal & Contracts
-- =====================================================

-- Legal Reviews
CREATE TABLE legal_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_review_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  negotiation_id UUID REFERENCES negotiations(id),
  assigned_to UUID REFERENCES users(id),
  review_start_date TIMESTAMP DEFAULT NOW(),
  checklist JSONB,
  checklist_completion_percentage INT,
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'refused', 'modifications')),
  risk_assessment TEXT CHECK (risk_assessment IN ('low', 'medium', 'high')),
  compliance_status TEXT,
  approval_conditions TEXT,
  recommendations TEXT,
  modifications_required TEXT,
  legal_concerns TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  days_in_review INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  contract_type TEXT,
  party_a_name TEXT,
  party_a_rep_id UUID REFERENCES users(id),
  party_b_name TEXT,
  party_b_nic TEXT,
  party_b_ntn TEXT,
  project_title TEXT,
  project_description TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  total_value DECIMAL(12,2),
  currency TEXT,
  payment_terms TEXT,
  deliverables TEXT,
  milestones JSONB[],
  confidentiality_clause BOOLEAN,
  ip_ownership TEXT,
  termination_conditions TEXT,
  dispute_resolution TEXT,
  governing_law TEXT,
  special_conditions TEXT,
  status TEXT CHECK (status IN ('draft', 'pending_signatures', 'active', 'completed', 'terminated')),
  party_a_signed BOOLEAN DEFAULT FALSE,
  party_a_signature_date DATE,
  party_b_signed BOOLEAN DEFAULT FALSE,
  party_b_signature_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Payments & Scripting
-- =====================================================

-- Payment Schedules
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  writer_producer_name TEXT,
  total_contract_value DECIMAL(12,2),
  currency TEXT,
  payment_structure TEXT,
  milestones JSONB[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id TEXT UNIQUE NOT NULL,
  schedule_id UUID REFERENCES payment_schedules(id) ON DELETE CASCADE,
  milestone_number INT,
  milestone_name TEXT,
  milestone_type TEXT,
  linked_to TEXT,
  payment_amount DECIMAL(10,2),
  payment_percentage DECIMAL(5,2),
  withholding_tax_percentage DECIMAL(5,2),
  net_amount DECIMAL(10,2),
  status TEXT CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'overdue')),
  invoice_url TEXT,
  payment_method TEXT,
  bank_account_details TEXT,
  payment_date DATE,
  overdue_days INT,
  prepared_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Script Phases
CREATE TABLE script_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  step_number INT CHECK (step_number BETWEEN 1 AND 6),
  episode_number INT,
  draft_version INT,
  page_count INT,
  word_count INT,
  scene_count INT,
  writer_notes TEXT,
  file_path TEXT,
  status TEXT,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  deadline DATE,
  is_late BOOLEAN DEFAULT FALSE,
  delay_days INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Script Feedback
CREATE TABLE script_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id TEXT UNIQUE NOT NULL,
  script_phase_id UUID REFERENCES script_phases(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  review_date TIMESTAMP DEFAULT NOW(),
  story_plot_score INT,
  character_development_score INT,
  structure_score INT,
  dialogue_score INT,
  technical_format_score INT,
  average_score DECIMAL(3,1),
  overall_comments TEXT,
  strengths TEXT,
  weaknesses TEXT,
  key_changes_required TEXT,
  decision TEXT CHECK (decision IN ('approve', 'major_revisions', 'reject')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Archive & Supporting Tables
-- =====================================================

-- Archive
CREATE TABLE archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  archive_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  rejection_stage TEXT,
  rejection_date TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT NOT NULL,
  rejection_category TEXT,
  can_resubmit BOOLEAN DEFAULT FALSE,
  resubmission_conditions TEXT,
  time_in_system_days INT,
  archived_at TIMESTAMP DEFAULT NOW()
);

-- Attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  workflow_name TEXT,
  current_stage TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Stages
CREATE TABLE workflow_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  stage_name TEXT,
  assigned_to UUID REFERENCES users(id),
  status TEXT,
  completed_at TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_created_by ON stories(created_by);
CREATE INDEX idx_call_reports_story_id ON call_reports(story_id);
CREATE INDEX idx_evaluator_forms_call_report_id ON evaluator_forms(call_report_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_contracts_status ON contracts(status);

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_reports_updated_at BEFORE UPDATE ON call_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON negotiations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

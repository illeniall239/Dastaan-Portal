-- Complete Detailed One-Liner System Migration
-- This migration creates all tables and columns for the detailed one-liner feature

-- =====================================================
-- 1. Create detailed_one_liners table
-- =====================================================
CREATE TABLE IF NOT EXISTS detailed_one_liners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE UNIQUE,
  preamble TEXT NOT NULL,
  plot TEXT NOT NULL,
  emotional_arena TEXT NOT NULL,
  creed_conflict TEXT NOT NULL,
  new_element TEXT NOT NULL,
  emotional_core_resolution TEXT NOT NULL,
  production_optimization_notes TEXT,
  net_outcome TEXT,
  conclusion_recommendation TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_detailed_one_liners_call_report ON detailed_one_liners(call_report_id);
CREATE INDEX idx_detailed_one_liners_created_by ON detailed_one_liners(created_by);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_detailed_one_liners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detailed_one_liners_updated_at
  BEFORE UPDATE ON detailed_one_liners
  FOR EACH ROW
  EXECUTE FUNCTION update_detailed_one_liners_updated_at();

-- Add comments
COMMENT ON TABLE detailed_one_liners IS 'Detailed one-liner analyses for call reports';
COMMENT ON COLUMN detailed_one_liners.call_report_id IS 'Reference to the call report (one-to-one)';
COMMENT ON COLUMN detailed_one_liners.preamble IS 'Why this drama may work';
COMMENT ON COLUMN detailed_one_liners.plot IS 'Plot description';
COMMENT ON COLUMN detailed_one_liners.emotional_arena IS 'Emotional arena description';
COMMENT ON COLUMN detailed_one_liners.creed_conflict IS 'Creed and conflict description';
COMMENT ON COLUMN detailed_one_liners.new_element IS 'New element description';
COMMENT ON COLUMN detailed_one_liners.emotional_core_resolution IS 'Emotional core and resolution';
COMMENT ON COLUMN detailed_one_liners.production_optimization_notes IS 'Production optimization notes';
COMMENT ON COLUMN detailed_one_liners.net_outcome IS 'Net outcome description';
COMMENT ON COLUMN detailed_one_liners.conclusion_recommendation IS 'Conclusion and recommendation';

-- Enable Row Level Security
ALTER TABLE detailed_one_liners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for detailed_one_liners
-- Evaluators can view detailed one-liners
CREATE POLICY detailed_one_liners_evaluator_select ON detailed_one_liners
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR get_user_role() = 'management'
    OR is_admin()
  );

-- Evaluators and content managers can insert detailed one-liners
CREATE POLICY detailed_one_liners_insert ON detailed_one_liners
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

-- Evaluators and content managers can update their own detailed one-liners
CREATE POLICY detailed_one_liners_update ON detailed_one_liners
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

-- Evaluators and content managers can delete their own detailed one-liners
CREATE POLICY detailed_one_liners_delete ON detailed_one_liners
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

-- =====================================================
-- 2. Create narrative_breakdown_items table
-- =====================================================
CREATE TABLE IF NOT EXISTS narrative_breakdown_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailed_one_liner_id UUID NOT NULL REFERENCES detailed_one_liners(id) ON DELETE CASCADE,
  story_stream TEXT NOT NULL,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  narrative_purpose TEXT NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_narrative_breakdown_detailed_one_liner ON narrative_breakdown_items(detailed_one_liner_id);

-- Add comments
COMMENT ON TABLE narrative_breakdown_items IS 'Narrative breakdown items for detailed one-liners';
COMMENT ON COLUMN narrative_breakdown_items.story_stream IS 'Story stream description';
COMMENT ON COLUMN narrative_breakdown_items.percentage IS 'Percentage allocation (0-100)';
COMMENT ON COLUMN narrative_breakdown_items.narrative_purpose IS 'Purpose of this narrative element';
COMMENT ON COLUMN narrative_breakdown_items.sort_order IS 'Order of items for display';

-- Enable Row Level Security
ALTER TABLE narrative_breakdown_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for narrative_breakdown_items
CREATE POLICY narrative_breakdown_evaluator_select ON narrative_breakdown_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = narrative_breakdown_items.detailed_one_liner_id
      AND (
        get_user_role() = 'evaluator'
        OR get_user_role() = 'content_manager'
        OR get_user_role() = 'management'
        OR is_admin()
      )
    )
  );

CREATE POLICY narrative_breakdown_insert ON narrative_breakdown_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

CREATE POLICY narrative_breakdown_update ON narrative_breakdown_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = narrative_breakdown_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

CREATE POLICY narrative_breakdown_delete ON narrative_breakdown_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = narrative_breakdown_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

-- =====================================================
-- 3. Create event_planning_items table
-- =====================================================
CREATE TABLE IF NOT EXISTS event_planning_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailed_one_liner_id UUID NOT NULL REFERENCES detailed_one_liners(id) ON DELETE CASCADE,
  episode_range TEXT NOT NULL,
  event_scale TEXT NOT NULL,
  on_screen_activity TEXT NOT NULL,
  approx_frequency TEXT NOT NULL,
  budget_category TEXT NOT NULL CHECK (budget_category IN ('High', 'Medium', 'Low')),
  sort_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_event_planning_detailed_one_liner ON event_planning_items(detailed_one_liner_id);

-- Add comments
COMMENT ON TABLE event_planning_items IS 'Event planning items for detailed one-liners with budget categories';
COMMENT ON COLUMN event_planning_items.episode_range IS 'Episode range for this event';
COMMENT ON COLUMN event_planning_items.event_scale IS 'Scale of the event';
COMMENT ON COLUMN event_planning_items.on_screen_activity IS 'Examples of on-screen activity';
COMMENT ON COLUMN event_planning_items.approx_frequency IS 'Approximate frequency of the event';
COMMENT ON COLUMN event_planning_items.budget_category IS 'Budget category: High, Medium, or Low';
COMMENT ON COLUMN event_planning_items.sort_order IS 'Order of items for display';

-- Enable Row Level Security
ALTER TABLE event_planning_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_planning_items
CREATE POLICY event_planning_items_evaluator_select ON event_planning_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = event_planning_items.detailed_one_liner_id
      AND (
        get_user_role() = 'evaluator'
        OR get_user_role() = 'content_manager'
        OR get_user_role() = 'management'
        OR is_admin()
      )
    )
  );

CREATE POLICY event_planning_items_insert ON event_planning_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

CREATE POLICY event_planning_items_update ON event_planning_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = event_planning_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

CREATE POLICY event_planning_items_delete ON event_planning_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = event_planning_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

-- =====================================================
-- 4. Create potential_weaknesses_risks_items table
-- =====================================================
CREATE TABLE IF NOT EXISTS potential_weaknesses_risks_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detailed_one_liner_id UUID NOT NULL REFERENCES detailed_one_liners(id) ON DELETE CASCADE,
  issue TEXT NOT NULL,
  explanation_risk_detail TEXT NOT NULL,
  impact TEXT NOT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_weaknesses_risks_detailed_one_liner ON potential_weaknesses_risks_items(detailed_one_liner_id);

-- Add comments
COMMENT ON TABLE potential_weaknesses_risks_items IS 'Potential weaknesses and risks items for detailed one-liners';
COMMENT ON COLUMN potential_weaknesses_risks_items.issue IS 'The issue or weakness';
COMMENT ON COLUMN potential_weaknesses_risks_items.explanation_risk_detail IS 'Explanation or risk detail';
COMMENT ON COLUMN potential_weaknesses_risks_items.impact IS 'Impact of the issue';
COMMENT ON COLUMN potential_weaknesses_risks_items.sort_order IS 'Order of items for display';

-- Enable Row Level Security
ALTER TABLE potential_weaknesses_risks_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for potential_weaknesses_risks_items
CREATE POLICY weaknesses_risks_evaluator_select ON potential_weaknesses_risks_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
      AND (
        get_user_role() = 'evaluator'
        OR get_user_role() = 'content_manager'
        OR get_user_role() = 'management'
        OR is_admin()
      )
    )
  );

CREATE POLICY weaknesses_risks_insert ON potential_weaknesses_risks_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

CREATE POLICY weaknesses_risks_update ON potential_weaknesses_risks_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

CREATE POLICY weaknesses_risks_delete ON potential_weaknesses_risks_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM detailed_one_liners dol
      WHERE dol.id = potential_weaknesses_risks_items.detailed_one_liner_id
      AND (
        dol.created_by = auth.uid()
        OR get_user_role() = 'content_manager'
        OR is_admin()
      )
    )
  );

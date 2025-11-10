-- Create event planning items table for detailed one-liners
-- This allows evaluators to add event planning details with episode ranges and budget categories

-- Create event_planning_items table
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
-- Evaluators can view event planning items for detailed one-liners they have access to
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

-- Evaluators and content managers can insert event planning items
CREATE POLICY event_planning_items_insert ON event_planning_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'evaluator'
    OR get_user_role() = 'content_manager'
    OR is_admin()
  );

-- Evaluators and content managers can update their own event planning items
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

-- Evaluators and content managers can delete their own event planning items
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

-- Migration: Add production tracking fields for What's Cooking dashboard
-- This adds director, episode tracking, and evaluator score fields to match Excel layout

-- Add new columns to call_reports table
ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS director VARCHAR(255),
  ADD COLUMN IF NOT EXISTS total_episodes INTEGER,
  ADD COLUMN IF NOT EXISTS received_episodes INTEGER,
  ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2);

-- Create table for individual evaluator scores
CREATE TABLE IF NOT EXISTS evaluator_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_report_id UUID NOT NULL REFERENCES call_reports(id) ON DELETE CASCADE,
  evaluator_name VARCHAR(100) NOT NULL,
  score DECIMAL(3,1) CHECK (score >= 0 AND score <= 10),
  notes TEXT,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(call_report_id, evaluator_name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evaluator_scores_call_report_id ON evaluator_scores(call_report_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_scores_evaluator_name ON evaluator_scores(evaluator_name);

-- Add RLS policies for evaluator_scores table
ALTER TABLE evaluator_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and management can see all scores
CREATE POLICY "Admins and management can view all evaluator scores"
  ON evaluator_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'executive')
    )
  );

-- Policy: Evaluators can view their own scores
CREATE POLICY "Evaluators can view their own scores"
  ON evaluator_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'evaluator'
      AND users.name = evaluator_scores.evaluator_name
    )
  );

-- Policy: Evaluators can insert/update their own scores
CREATE POLICY "Evaluators can manage their own scores"
  ON evaluator_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'evaluator'
      AND users.name = evaluator_scores.evaluator_name
    )
  );

-- Policy: Admins can manage all scores
CREATE POLICY "Admins can manage all evaluator scores"
  ON evaluator_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Function to automatically calculate completion percentage
CREATE OR REPLACE FUNCTION calculate_completion_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_episodes IS NOT NULL AND NEW.total_episodes > 0 AND NEW.received_episodes IS NOT NULL THEN
    NEW.completion_percentage := ROUND((NEW.received_episodes::DECIMAL / NEW.total_episodes::DECIMAL) * 100, 2);
  ELSE
    NEW.completion_percentage := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate completion percentage on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_completion_percentage ON call_reports;
CREATE TRIGGER trigger_calculate_completion_percentage
  BEFORE INSERT OR UPDATE OF total_episodes, received_episodes
  ON call_reports
  FOR EACH ROW
  EXECUTE FUNCTION calculate_completion_percentage();

-- Function to update overall_rating based on evaluator scores
CREATE OR REPLACE FUNCTION update_overall_rating_from_evaluators()
RETURNS TRIGGER AS $$
DECLARE
  avg_score DECIMAL(3,1);
BEGIN
  -- Calculate average of all evaluator scores for this call report
  SELECT AVG(score)
  INTO avg_score
  FROM evaluator_scores
  WHERE call_report_id = COALESCE(NEW.call_report_id, OLD.call_report_id)
  AND score IS NOT NULL;

  -- Update the call_reports table with the calculated average
  IF avg_score IS NOT NULL THEN
    UPDATE call_reports
    SET overall_rating = avg_score,
        average_score = avg_score
    WHERE id = COALESCE(NEW.call_report_id, OLD.call_report_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update overall_rating when evaluator scores change
DROP TRIGGER IF EXISTS trigger_update_overall_rating ON evaluator_scores;
CREATE TRIGGER trigger_update_overall_rating
  AFTER INSERT OR UPDATE OR DELETE
  ON evaluator_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_overall_rating_from_evaluators();

-- Add comments for documentation
COMMENT ON COLUMN call_reports.director IS 'Director name for the project';
COMMENT ON COLUMN call_reports.total_episodes IS 'Total number of planned episodes';
COMMENT ON COLUMN call_reports.received_episodes IS 'Number of episodes received so far';
COMMENT ON COLUMN call_reports.completion_percentage IS 'Auto-calculated completion percentage (received/total * 100)';
COMMENT ON TABLE evaluator_scores IS 'Individual evaluator scores for call reports (Nadeem, Salman, Imran, etc.)';

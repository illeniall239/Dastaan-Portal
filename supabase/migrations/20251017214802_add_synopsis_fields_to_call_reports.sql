-- Add short_synopsis and episodic_synopsis fields to call_reports table
-- These fields store detailed story information for evaluators

ALTER TABLE call_reports
ADD COLUMN short_synopsis TEXT,
ADD COLUMN episodic_synopsis TEXT;

COMMENT ON COLUMN call_reports.short_synopsis IS 'Brief overview of the story, characters, and main plot points';
COMMENT ON COLUMN call_reports.episodic_synopsis IS 'Episode-by-episode breakdown or arc description';

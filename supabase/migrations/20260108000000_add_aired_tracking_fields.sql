-- Migration: Add aired tracking fields for production lifecycle metrics
-- Purpose: Track projects that have completed their on-air run with historical data
-- Date: 2026-01-08

-- Add aired project tracking fields to call_reports table
ALTER TABLE call_reports
  ADD COLUMN IF NOT EXISTS on_air_title TEXT,
  ADD COLUMN IF NOT EXISTS aired_date DATE,
  ADD COLUMN IF NOT EXISTS aired_completed BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN call_reports.on_air_title IS 'The actual title used when the project aired (may differ from working_title). Example: working_title "Love Story" might air as "Ishq Hai"';
COMMENT ON COLUMN call_reports.aired_date IS 'Date when the project finished airing completely. Used for historical tracking of completed projects.';
COMMENT ON COLUMN call_reports.aired_completed IS 'Boolean flag to indicate project has completed its on-air run. Allows easy filtering without string comparison on status field.';

-- Create indexes for faster queries on aired projects
CREATE INDEX IF NOT EXISTS idx_call_reports_aired_completed
  ON call_reports(aired_completed) WHERE aired_completed = TRUE;

CREATE INDEX IF NOT EXISTS idx_call_reports_aired_date
  ON call_reports(aired_date) WHERE aired_date IS NOT NULL;

-- Verification: Check that columns were added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'call_reports'
    AND column_name IN ('on_air_title', 'aired_date', 'aired_completed')
  ) THEN
    RAISE NOTICE 'Aired tracking fields added successfully to call_reports table';
  END IF;
END $$;

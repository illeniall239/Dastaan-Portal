-- =====================================================
-- Extend Negotiations Table for Content Delivery Feature
-- =====================================================
-- Adds fields for: genre, episodes, time slot, rate ranges,
-- delivery schedule, and project start date
-- =====================================================

BEGIN;

-- Add new columns to negotiations table
ALTER TABLE negotiations
ADD COLUMN IF NOT EXISTS genre TEXT,
ADD COLUMN IF NOT EXISTS estimated_episodes INTEGER,
ADD COLUMN IF NOT EXISTS suggested_time_slot TEXT CHECK (
  suggested_time_slot IN ('6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM')
),
ADD COLUMN IF NOT EXISTS rate_range TEXT CHECK (
  rate_range IN (
    '50,000 - 100,000',
    '100,000 - 150,000',
    '150,000 - 200,000',
    '200,000 - 250,000',
    '250,000+'
  )
),
ADD COLUMN IF NOT EXISTS delivery_schedule JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS project_start_date DATE;

-- Add comment explaining delivery_schedule structure
COMMENT ON COLUMN negotiations.delivery_schedule IS
'Array of individual episodes with delivery dates: [{"episode_number": 1, "episode_title": "Pilot Episode", "delivery_date": "2025-03-01"}]';

COMMIT;

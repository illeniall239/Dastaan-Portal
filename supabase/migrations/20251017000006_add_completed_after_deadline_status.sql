-- Add 'completed_after_deadline' status to evaluation_status enum
-- This status is used when an evaluation proceeds after the 5-day deadline with fewer than all evaluations completed

-- First, add the new value to the enum
ALTER TYPE evaluation_status ADD VALUE IF NOT EXISTS 'completed_after_deadline';

-- Update any existing functions that reference the enum to handle the new value
-- The trigger function should already handle this since we're using string comparisons in our implementation
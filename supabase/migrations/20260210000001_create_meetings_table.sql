-- ============================================================================
-- Migration: Create dedicated meetings table
-- Purpose: Separate calendar meetings from call reports (Writer Engagement Reports)
-- Meetings are simple calendar events; call reports flow through the story pipeline
-- ============================================================================

-- 1. Create the meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id TEXT UNIQUE NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 60,
  location TEXT,
  notes TEXT,
  agenda TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_type TEXT,        -- Writer, External Producer, In-house
  attendees TEXT[],         -- Array of attendee names/emails
  category TEXT,            -- writer_pitch, external_producer, inhouse_content
  status TEXT DEFAULT 'scheduled',
  team_id UUID REFERENCES teams(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add indexes for common queries
CREATE INDEX idx_meetings_meeting_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_team_id ON meetings(team_id);
CREATE INDEX idx_meetings_created_by ON meetings(created_by);

-- 3. Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (team isolation, same pattern as call_reports)
CREATE POLICY "meetings_select_own_team" ON meetings FOR SELECT
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'management', 'programmer'))
  );

CREATE POLICY "meetings_insert_authenticated" ON meetings FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "meetings_update_own_or_admin" ON meetings FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "meetings_delete_own_or_admin" ON meetings FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Auto-generate meeting_id in format MTG-YYYY-NNNN
CREATE OR REPLACE FUNCTION generate_meeting_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_str TEXT;
BEGIN
  year_str := to_char(NOW(), 'YYYY');

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(meeting_id FROM 10) AS INTEGER)),
    0
  ) + 1
  INTO next_num
  FROM meetings
  WHERE meeting_id LIKE 'MTG-' || year_str || '-%';

  NEW.meeting_id := 'MTG-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_meeting_id
  BEFORE INSERT ON meetings
  FOR EACH ROW
  WHEN (NEW.meeting_id IS NULL OR NEW.meeting_id = '')
  EXECUTE FUNCTION generate_meeting_id();

-- 6. Auto-update updated_at
CREATE TRIGGER set_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Migrate existing scheduled_meeting data from call_reports to meetings
INSERT INTO meetings (
  title, meeting_date, duration_minutes, location, notes,
  contact_name, contact_email, contact_phone, contact_type,
  attendees, category, status, team_id, created_by, created_at, updated_at
)
SELECT
  cr.working_title,
  cr.meeting_date,
  cr.duration_minutes,
  cr.location,
  cr.meeting_notes,
  cr.writer_name,
  cr.contact_email,
  cr.contact_phone,
  cr.contact_type,
  cr.meeting_attendees,
  cr.category,
  COALESCE(cr.status, 'scheduled'),
  cr.team_id,
  cr.created_by,
  cr.created_at,
  COALESCE(cr.updated_at, cr.created_at)
FROM call_reports cr
WHERE cr.meeting_type = 'scheduled_meeting';

-- 8. Clean up orphaned stories created by scheduled meetings
-- Only delete stories that are ONLY referenced by scheduled_meeting call reports
-- (not by any actual call_report entries)
DELETE FROM stories s
WHERE s.id IN (
  SELECT cr.story_id FROM call_reports cr
  WHERE cr.meeting_type = 'scheduled_meeting'
    AND cr.story_id IS NOT NULL
)
AND NOT EXISTS (
  SELECT 1 FROM call_reports cr2
  WHERE cr2.story_id = s.id
    AND cr2.meeting_type = 'call_report'
);

-- 9. Delete migrated scheduled_meeting rows from call_reports
DELETE FROM call_reports WHERE meeting_type = 'scheduled_meeting';

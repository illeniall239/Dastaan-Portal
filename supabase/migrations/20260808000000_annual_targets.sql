-- Annual targets table for tracking concept/idea targets per team per slot group
CREATE TABLE IF NOT EXISTS annual_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  slot_group TEXT NOT NULL CHECK (slot_group IN ('8PM', '7/9PM')),
  target_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, team_id, slot_group)
);

-- Enable RLS
ALTER TABLE annual_targets ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "annual_targets_read" ON annual_targets
  FOR SELECT TO authenticated USING (true);

-- Allow admin, management, programmer to update
CREATE POLICY "annual_targets_write" ON annual_targets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'management', 'programmer')
    )
  );

-- Seed 2026 data
INSERT INTO annual_targets (year, team_id, slot_group, target_count) VALUES
-- Team Parisa Siddiqi
(2026, 'aa2058a0-54c5-4c8e-87a5-1ffd252032c5', '8PM', 10),
(2026, 'aa2058a0-54c5-4c8e-87a5-1ffd252032c5', '7/9PM', 18),
-- Team Zanjabeel Asim (GCM Team)
(2026, '4c0bfbe1-8dc7-4521-9fb7-5a640b57e957', '8PM', 12),
(2026, '4c0bfbe1-8dc7-4521-9fb7-5a640b57e957', '7/9PM', 12),
-- Team Angabeen Shah
(2026, '1b7b66ec-6b15-4151-a47e-1de71252e693', '8PM', 12),
(2026, '1b7b66ec-6b15-4151-a47e-1de71252e693', '7/9PM', 12),
-- Team Geetee Masood
(2026, '081590db-d35b-44f5-841d-6ceae71e4388', '8PM', 6),
(2026, '081590db-d35b-44f5-841d-6ceae71e4388', '7/9PM', 12),
-- Team Humera Safder
(2026, 'bcaaeca4-6d9c-4445-8e74-117c71736f66', '8PM', 2),
(2026, 'bcaaeca4-6d9c-4445-8e74-117c71736f66', '7/9PM', 10),
-- Team Programming
(2026, 'f9686f58-406f-42b2-be2d-f200453b4a8b', '8PM', 4),
(2026, 'f9686f58-406f-42b2-be2d-f200453b4a8b', '7/9PM', 8),
-- Team Nadeem Asad
(2026, 'dfb62a29-b363-48df-bf95-e452e06e12fb', '8PM', 4),
(2026, 'dfb62a29-b363-48df-bf95-e452e06e12fb', '7/9PM', 4)
ON CONFLICT (year, team_id, slot_group) DO NOTHING;

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================================
-- Migration: 20260109000000_create_system_settings.sql
-- Purpose: Store system-wide configuration and feature flags
-- Access: Admin-only writes, all authenticated users can read
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE SYSTEM_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE system_settings IS 'System-wide configuration and feature flags';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting (e.g., cross_team_visibility)';
COMMENT ON COLUMN system_settings.setting_value IS 'JSON value of the setting (supports complex configurations)';
COMMENT ON COLUMN system_settings.description IS 'Human-readable description of what this setting does';
COMMENT ON COLUMN system_settings.updated_by IS 'User ID who last updated this setting';
COMMENT ON COLUMN system_settings.updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN system_settings.created_at IS 'Timestamp when setting was created';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);

-- ============================================================================
-- PART 2: ENABLE RLS AND CREATE POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Policy 1: All authenticated users can view settings
CREATE POLICY "All authenticated users can view settings"
ON system_settings FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Only admins can insert settings
CREATE POLICY "Only admins can modify settings"
ON system_settings FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Policy 3: Only admins can update settings
CREATE POLICY "Only admins can update settings"
ON system_settings FOR UPDATE
TO authenticated
USING (is_admin());

-- Policy 4: Only admins can delete settings
CREATE POLICY "Only admins can delete settings"
ON system_settings FOR DELETE
TO authenticated
USING (is_admin());

-- ============================================================================
-- PART 3: INSERT DEFAULT SETTINGS
-- ============================================================================

-- Insert cross-team visibility setting (default: FALSE for team isolation)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES (
  'cross_team_visibility',
  '{"enabled": false}'::jsonb,
  'When enabled, all teams can view and analyze content created by other teams. When disabled, teams can only see their own content (default behavior).'
)
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================================
-- PART 4: HELPER FUNCTION - Get Setting Value
-- ============================================================================

CREATE OR REPLACE FUNCTION get_setting(key TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT setting_value INTO result
  FROM system_settings
  WHERE setting_key = key;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_setting(TEXT) IS 'Retrieves a system setting value by key. Returns empty JSON if not found.';

-- ============================================================================
-- PART 5: HELPER FUNCTION - Check if Cross-Team Visibility is Enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION is_cross_team_visibility_enabled()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (get_setting('cross_team_visibility')->>'enabled')::boolean,
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_cross_team_visibility_enabled() IS 'Returns TRUE if cross-team visibility is enabled globally, FALSE otherwise (default)';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

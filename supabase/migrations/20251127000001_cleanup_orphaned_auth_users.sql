-- ============================================================================
-- CLEANUP ORPHANED AUTH USERS
-- ============================================================================
-- Purpose: Find and fix auth users without public.users profiles
-- Problem: Trigger exception handler allows orphaned records
-- Solution: Create missing profiles for orphaned auth users
-- ============================================================================

-- Create missing profiles for orphaned auth users
-- This is SAFER - preserves auth records
INSERT INTO public.users (id, email, name, role, status, position, department, created_at)
SELECT
  a.id,
  a.email,
  COALESCE(a.raw_user_meta_data->>'name', 'Recovered User'),
  COALESCE(a.raw_user_meta_data->>'role', 'content_creator'),
  'active',
  a.raw_user_meta_data->>'position',
  a.raw_user_meta_data->>'department',
  a.created_at
FROM auth.users a
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = a.id
)
ON CONFLICT (id) DO NOTHING;

-- Log what was recovered
DO $$
DECLARE
  recovered_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recovered_count
  FROM auth.users a
  WHERE EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id)
  AND a.created_at > NOW() - INTERVAL '1 hour';

  RAISE NOTICE 'Recovered % orphaned auth users', recovered_count;
END $$;

COMMENT ON TABLE users IS 'User profiles. Orphaned auth users from failed triggers have been recovered.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

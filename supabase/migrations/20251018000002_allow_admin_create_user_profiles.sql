-- =====================================================
-- Allow Admins to Create User Profiles for Others
-- =====================================================
-- This migration fixes the "User not allowed" error when admins
-- try to create users via the admin panel.
--
-- Problem:
-- The existing RLS policy only allows users to create their own profile
-- (WITH CHECK auth.uid() = id). When an admin creates a user, the
-- auth.uid() is the admin's ID, not the new user's ID, so the check fails.
--
-- Solution:
-- Add a second RLS policy that allows admins to insert user profiles.
-- RLS policies are OR-based, so if ANY policy passes, the operation succeeds.

-- =====================================================
-- Add Policy: Admins Can Create User Profiles
-- =====================================================
-- This policy allows users with admin role to insert into users table
-- for any user ID, not just their own

CREATE POLICY "Admins can create user profiles"
  ON users FOR INSERT
  WITH CHECK (
    -- Check if the current user is an admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON POLICY "Admins can create user profiles" ON users IS
'Allows admin users to create user profiles for other users via the admin panel. Works alongside the self-registration policy.';

-- =====================================================
-- Security Notes
-- =====================================================
-- This migration provides:
-- 1. Allows admins to create user profiles via API
-- 2. Maintains existing self-registration capability
-- 3. Does not compromise security (admin role required)
-- 4. Works with OR logic (either policy can allow INSERT)
--
-- Existing policies remain:
-- - "Users can create own profile" (for self-signup)
-- New policy:
-- - "Admins can create user profiles" (for admin user creation)

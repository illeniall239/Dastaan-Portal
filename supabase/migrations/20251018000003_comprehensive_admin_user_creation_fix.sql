-- =====================================================
-- COMPREHENSIVE FIX: Admin User Creation
-- =====================================================
-- This migration fixes ALL issues preventing admins from creating users
--
-- Issues Fixed:
-- 1. Email domain validation blocking admin-created users
-- 2. RLS policy blocking admin from inserting user profiles
-- 3. handle_new_user() function email validation
--
-- This migration is idempotent and can be run multiple times safely.

-- =====================================================
-- STEP 1: Fix Email Domain Validation Trigger
-- =====================================================
-- Allow admin-created users to bypass email domain validation

DROP TRIGGER IF EXISTS check_org_email_domain ON auth.users;

CREATE OR REPLACE FUNCTION public.validate_org_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.tv';
  is_admin_created BOOLEAN;
BEGIN
  -- Check if this user is being created by an admin
  is_admin_created := COALESCE((NEW.raw_user_meta_data->>'admin_created')::boolean, false);

  -- If admin created, skip email domain validation entirely
  IF is_admin_created THEN
    RETURN NEW;
  END IF;

  -- For regular signups, validate email domain
  email_domain := split_part(NEW.email, '@', 2);

  IF email_domain != allowed_domain THEN
    RAISE EXCEPTION 'Only @% organization email addresses are allowed. Please use your organization email.', allowed_domain
      USING HINT = 'Contact your administrator if you believe this is an error.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER check_org_email_domain
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_org_email_domain();

-- =====================================================
-- STEP 2: Fix User Profile Creation Function
-- =====================================================
-- Allow admin-created users to bypass email validation
-- This function runs with SECURITY DEFINER to bypass RLS

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.tv';
  is_admin_created BOOLEAN;
BEGIN
  -- Check if this user is being created by an admin
  is_admin_created := COALESCE((NEW.raw_user_meta_data->>'admin_created')::boolean, false);

  -- Only validate domain for non-admin created users
  IF NOT is_admin_created THEN
    email_domain := split_part(NEW.email, '@', 2);

    IF email_domain != allowed_domain THEN
      RAISE EXCEPTION 'Invalid email domain. Only @% addresses are allowed.', allowed_domain;
    END IF;
  END IF;

  -- Create user profile (this bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.users (id, email, name, role, status, position, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'content_creator'),
    'active',
    COALESCE(NEW.raw_user_meta_data->>'position', NULL),
    COALESCE(NEW.raw_user_meta_data->>'department', NULL)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 3: Add RLS Policy for Admin User Creation
-- =====================================================
-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Admins can create user profiles" ON users;

-- Create new policy allowing admins to insert user profiles
CREATE POLICY "Admins can create user profiles"
  ON users FOR INSERT
  WITH CHECK (
    -- Allow if current user is admin
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Also allow if the new user ID matches the current auth user (for self-signup)
    auth.uid() = id
  );

-- =====================================================
-- STEP 4: Update Existing Self-Registration Policy
-- =====================================================
-- Remove the old "Users can create own profile" policy since we combined it above
DROP POLICY IF EXISTS "Users can create own profile" ON users;

-- =====================================================
-- STEP 5: Verification Queries
-- =====================================================
-- Check that functions exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'validate_org_email_domain'
  ) THEN
    RAISE EXCEPTION 'Function validate_org_email_domain was not created!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'Function handle_new_user was not created!';
  END IF;

  RAISE NOTICE 'All functions created successfully';
END $$;

-- Check that triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'check_org_email_domain'
  ) THEN
    RAISE EXCEPTION 'Trigger check_org_email_domain was not created!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'Trigger on_auth_user_created was not created!';
  END IF;

  RAISE NOTICE 'All triggers created successfully';
END $$;

-- Check that policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Admins can create user profiles'
  ) THEN
    RAISE EXCEPTION 'RLS Policy "Admins can create user profiles" was not created!';
  END IF;

  RAISE NOTICE 'RLS policy created successfully';
END $$;

-- =====================================================
-- STEP 6: Display Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Admin users can now:';
  RAISE NOTICE '  1. Create users with ANY email domain';
  RAISE NOTICE '  2. Bypass RLS restrictions';
  RAISE NOTICE '';
  RAISE NOTICE 'Regular users (self-signup):';
  RAISE NOTICE '  1. Must use @geo.tv email domain';
  RAISE NOTICE '';
  RAISE NOTICE 'Test by creating a user via admin panel';
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION public.validate_org_email_domain() IS
'Validates email domain is @geo.tv before allowing user signup. Skips validation for admin-created users (admin_created flag in metadata).';

COMMENT ON FUNCTION public.handle_new_user() IS
'Creates user profile after signup. Skips email domain validation for admin-created users. Runs with SECURITY DEFINER to bypass RLS.';

COMMENT ON POLICY "Admins can create user profiles" ON users IS
'Allows admin users to create user profiles for any user, and allows users to create their own profile during self-signup.';

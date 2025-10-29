-- =====================================================
-- Email Domain Validation (Backend Security)
-- =====================================================
-- This migration adds server-side email domain validation
-- to ensure only @geo.com organization emails can sign up

-- =====================================================
-- Function: Validate Organization Email Domain
-- =====================================================
-- Validates that email ends with @geo.com
-- Prevents non-organization signups at database level

CREATE OR REPLACE FUNCTION public.validate_org_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.com';
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);

  -- Check if domain matches allowed domain
  IF email_domain != allowed_domain THEN
    RAISE EXCEPTION 'Only @% organization email addresses are allowed. Please use your organization email.', allowed_domain
      USING HINT = 'Contact your administrator if you believe this is an error.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger: Check Email Domain Before User Creation
-- =====================================================
-- Fires BEFORE INSERT on auth.users
-- Validates email domain before allowing signup

DROP TRIGGER IF EXISTS check_org_email_domain ON auth.users;

CREATE TRIGGER check_org_email_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_org_email_domain();

-- =====================================================
-- Update existing handle_new_user function
-- =====================================================
-- Add domain check in user profile creation as well
-- Double layer of validation for extra security

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.com';
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);

  -- Validate domain (redundant check for extra security)
  IF email_domain != allowed_domain THEN
    RAISE EXCEPTION 'Invalid email domain. Only @% addresses are allowed.', allowed_domain;
  END IF;

  -- Create user profile
  INSERT INTO public.users (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'content_creator'),
    'active'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Validation Function for Existing Users (Optional)
-- =====================================================
-- Check existing users for invalid domains
-- Useful for data cleanup if needed

CREATE OR REPLACE FUNCTION public.check_existing_user_emails()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  domain TEXT,
  is_valid BOOLEAN
) AS $$
DECLARE
  allowed_domain TEXT := 'geo.com';
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    split_part(u.email, '@', 2) as domain,
    (split_part(u.email, '@', 2) = allowed_domain) as is_valid
  FROM public.users u;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION public.validate_org_email_domain() IS
'Validates email domain is @geo.com before allowing user signup. Provides backend security validation that cannot be bypassed.';

COMMENT ON FUNCTION public.check_existing_user_emails() IS
'Utility function to check existing users for invalid email domains. Useful for auditing and data cleanup.';

COMMENT ON TRIGGER check_org_email_domain ON auth.users IS
'Validates email domain before user creation. Ensures only @geo.com organization emails can sign up.';

-- =====================================================
-- Security Notes
-- =====================================================
-- This migration provides:
-- 1. Server-side validation (cannot be bypassed by frontend)
-- 2. Protection against API-level signup attempts
-- 3. Double validation (trigger + profile creation)
-- 4. Clear error messages for users
-- 5. Audit function for existing users
--
-- To change allowed domain in future:
-- 1. Update allowed_domain variable in both functions
-- 2. Run this migration again with updated domain
-- OR use ALTER FUNCTION to update inline

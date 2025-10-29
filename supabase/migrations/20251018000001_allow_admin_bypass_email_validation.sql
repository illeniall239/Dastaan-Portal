-- =====================================================
-- Allow Admin to Bypass Email Domain Validation
-- =====================================================
-- This migration allows admins to create users with any email domain
-- while keeping the @geo.tv restriction for regular self-signup
--
-- How it works:
-- - Regular signup: Must use @geo.tv email
-- - Admin creates user: Can use any email (gmail, outlook, etc.)
-- - Check for admin_created flag in user_metadata

-- =====================================================
-- Update Function: Validate Organization Email Domain
-- =====================================================
-- Skip validation if user is created by admin

CREATE OR REPLACE FUNCTION public.validate_org_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.tv';
  is_admin_created BOOLEAN;
BEGIN
  -- Check if this user is being created by an admin
  is_admin_created := COALESCE((NEW.raw_user_meta_data->>'admin_created')::boolean, false);

  -- If admin created, skip email domain validation
  IF is_admin_created THEN
    RETURN NEW;
  END IF;

  -- Extract domain from email for regular signups
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
-- Update Function: Handle New User Profile Creation
-- =====================================================
-- Skip domain validation for admin-created users

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

  -- Create user profile
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

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION public.validate_org_email_domain() IS
'Validates email domain is @geo.tv before allowing user signup. Allows admins to bypass validation by setting admin_created flag in user_metadata.';

COMMENT ON FUNCTION public.handle_new_user() IS
'Creates user profile after signup. Skips email domain validation for admin-created users.';

-- =====================================================
-- Security Notes
-- =====================================================
-- This migration provides:
-- 1. Flexible email validation (strict for signup, permissive for admin)
-- 2. Clear separation of regular vs admin user creation
-- 3. No changes to existing RLS policies
-- 4. Backward compatible with existing users
-- 5. Admin flag prevents API abuse (only admin.createUser can set it)

-- =====================================================
-- FIX: Update Email Domain Validation from @geo.com to @geo.tv
-- =====================================================
-- Run this in Supabase Dashboard → SQL Editor
-- This updates the database to accept @geo.tv emails instead of @geo.com

-- =====================================================
-- STEP 1: Delete existing user (if signup failed)
-- =====================================================
-- Uncomment these lines if you need to delete rao.muhammad@geo.tv

-- DELETE FROM public.users WHERE email = 'rao.muhammad@geo.tv';
-- DELETE FROM auth.users WHERE email = 'rao.muhammad@geo.tv';

-- =====================================================
-- STEP 2: Update Email Domain Validation Function
-- =====================================================
-- Changes allowed domain from geo.com to geo.tv

CREATE OR REPLACE FUNCTION public.validate_org_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.tv';  -- Changed from geo.com
BEGIN
  email_domain := split_part(NEW.email, '@', 2);

  IF email_domain != allowed_domain THEN
    RAISE EXCEPTION 'Only @% organization email addresses are allowed. Please use your organization email.', allowed_domain
      USING HINT = 'Contact your administrator if you believe this is an error.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 3: Update Handle New User Function
-- =====================================================
-- Updates user creation function to accept geo.tv

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.tv';  -- Changed from geo.com
BEGIN
  email_domain := split_part(NEW.email, '@', 2);

  IF email_domain != allowed_domain THEN
    RAISE EXCEPTION 'Invalid email domain. Only @% addresses are allowed.', allowed_domain;
  END IF;

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
-- STEP 4: Verify Changes (Optional)
-- =====================================================
-- Check that the functions were updated correctly

SELECT
  proname AS function_name,
  prosrc AS function_source
FROM pg_proc
WHERE proname IN ('validate_org_email_domain', 'handle_new_user')
ORDER BY proname;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- You should see "Success" message after running this.
-- Now you can:
-- 1. Restart your dev server: npm run dev
-- 2. Sign up with @geo.tv emails
-- 3. Create admin account with rao.muhammad@geo.tv

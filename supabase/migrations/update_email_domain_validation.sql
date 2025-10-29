-- Update email domain validation to accept @geo.tv instead of @geo.com
-- Run this script in Supabase Dashboard > SQL Editor

-- Step 1: Drop the existing trigger
DROP TRIGGER IF EXISTS check_org_email_domain ON auth.users;

-- Step 2: Update the validation function to use geo.tv
CREATE OR REPLACE FUNCTION public.validate_org_email_domain()
RETURNS TRIGGER AS $$
DECLARE
  email_domain TEXT;
  allowed_domain TEXT := 'geo.tv';  -- Changed from 'geo.com'
BEGIN
  -- Extract domain from email
  email_domain := split_part(NEW.email, '@', 2);

  -- Check if domain matches
  IF email_domain != allowed_domain THEN
    RAISE EXCEPTION 'Only @% organization email addresses are allowed. Got: @%', allowed_domain, email_domain;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
CREATE TRIGGER check_org_email_domain
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_org_email_domain();

-- Step 4: Verify the function was created correctly
SELECT
  proname as function_name,
  prosrc as function_body
FROM pg_proc
WHERE proname = 'validate_org_email_domain';

-- Step 5: Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'check_org_email_domain';

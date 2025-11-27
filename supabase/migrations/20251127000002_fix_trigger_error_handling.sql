-- ============================================================================
-- FIX TRIGGER ERROR HANDLING
-- ============================================================================
-- Purpose: Make trigger fail hard on constraint violations
-- Problem: Current trigger swallows ALL errors
-- Solution: Only catch and suppress transient errors, fail on constraints
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_created BOOLEAN;
BEGIN
  -- Check if this user is being created by an admin
  is_admin_created := COALESCE((NEW.raw_user_meta_data->>'admin_created')::boolean, false);

  -- Create user profile (bypasses RLS)
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
EXCEPTION
  -- Fail hard on constraint violations - these indicate real problems
  WHEN unique_violation THEN
    RAISE EXCEPTION 'PROFILE_UNIQUE_VIOLATION: User profile with email % already exists', NEW.email;
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'PROFILE_FK_VIOLATION: Invalid reference in user profile for %', NEW.email;
  WHEN not_null_violation THEN
    RAISE EXCEPTION 'PROFILE_NULL_VIOLATION: Required field missing for user %', NEW.email;

  -- Only suppress transient errors that might resolve on retry
  WHEN connection_exception OR deadlock_detected THEN
    RAISE WARNING 'Transient error creating profile for %: %. Will retry.', NEW.email, SQLERRM;
    RETURN NEW;

  -- Catch-all for unexpected errors - log and fail
  WHEN OTHERS THEN
    RAISE EXCEPTION 'PROFILE_CREATION_ERROR: Failed to create profile for %: %', NEW.email, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates user profile when auth user is created. Fails hard on constraint violations to prevent orphaned records.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

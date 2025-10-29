-- =====================================================
-- Update Auth Trigger to Include Position Field
-- =====================================================
-- This migration updates the handle_new_user() function
-- to include the position field from signup metadata
-- Note: "position" is a reserved keyword in PostgreSQL, so we wrap it in double quotes

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, "position", status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'content_creator'),
    NEW.raw_user_meta_data->>'position', -- Extract position from metadata
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Update get_current_user() to include position
-- =====================================================
-- Must drop the function first because we're changing the return type

DROP FUNCTION IF EXISTS public.get_current_user();

CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  department TEXT,
  phone TEXT,
  "position" TEXT,
  avatar_url TEXT,
  status TEXT,
  created_at TIMESTAMP,
  last_login TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.role,
    u.department,
    u.phone,
    u."position",
    u.avatar_url,
    u.status,
    u.created_at,
    u.last_login
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user() IS
'Automatically creates a user profile in public.users when a new user signs up via Supabase Auth. Includes position field from signup metadata.';

COMMENT ON FUNCTION public.get_current_user() IS
'Returns the full user profile (including position) for the currently authenticated user';

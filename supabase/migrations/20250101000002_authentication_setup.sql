-- =====================================================
-- Authentication Setup
-- =====================================================
-- This migration sets up the authentication system
-- linking Supabase Auth with our custom users table

-- =====================================================
-- Function: Handle New User Registration
-- =====================================================
-- This function automatically creates a user profile
-- in the public.users table when someone signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
-- Trigger: Auto-create User Profile on Signup
-- =====================================================
-- Trigger the function above whenever a new user signs up

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Function: Update Last Login Timestamp
-- =====================================================
-- Updates the last_login field when user logs in

CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET last_login = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger: Update Last Login on Auth
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_user_login();

-- =====================================================
-- Function: Get Current User Data
-- =====================================================
-- Helper function to get full user data for the authenticated user

CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  role TEXT,
  department TEXT,
  phone TEXT,
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
    u.avatar_url,
    u.status,
    u.created_at,
    u.last_login
  FROM public.users u
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Additional RLS Policies for Auth
-- =====================================================

-- Allow users to read their own auth data
CREATE POLICY "Users can view own auth data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- Seed Data: Default Roles
-- =====================================================

INSERT INTO roles (name, description, permissions) VALUES
('admin', 'Full system access and user management', '{
  "users": ["create", "read", "update", "delete"],
  "stories": ["create", "read", "update", "delete"],
  "evaluations": ["create", "read", "update", "delete"],
  "contracts": ["create", "read", "update", "delete"],
  "payments": ["create", "read", "update", "delete"]
}'::jsonb),

('content_manager', 'Manage content workflow and pipeline', '{
  "users": ["read"],
  "stories": ["create", "read", "update", "delete"],
  "call_reports": ["create", "read", "update", "delete"],
  "evaluations": ["read", "update"],
  "one_liners": ["create", "read", "update"],
  "negotiations": ["create", "read", "update"],
  "workflows": ["create", "read", "update", "delete"]
}'::jsonb),

('evaluator', 'Evaluate story submissions', '{
  "stories": ["read"],
  "call_reports": ["read"],
  "evaluations": ["create", "read", "update"]
}'::jsonb),

('executive', 'Approve stories and budgets', '{
  "stories": ["read"],
  "evaluations": ["read"],
  "one_liners": ["read", "update"],
  "negotiations": ["read"]
}'::jsonb),

('legal', 'Review legal aspects and contracts', '{
  "stories": ["read"],
  "negotiations": ["read"],
  "legal_reviews": ["create", "read", "update"],
  "contracts": ["create", "read", "update"]
}'::jsonb),

('finance', 'Manage payments and invoices', '{
  "contracts": ["read"],
  "payment_schedules": ["read"],
  "payments": ["create", "read", "update"]
}'::jsonb),

('content_creator', 'Submit and track story ideas', '{
  "stories": ["create", "read"],
  "attachments": ["create", "read"]
}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user() IS
'Automatically creates a user profile in public.users when a new user signs up via Supabase Auth';

COMMENT ON FUNCTION public.handle_user_login() IS
'Updates the last_login timestamp when a user signs in';

COMMENT ON FUNCTION public.get_current_user() IS
'Returns the full user profile for the currently authenticated user';

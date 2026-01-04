-- =====================================================
-- Add Programmer Role
-- =====================================================

-- Update users table CHECK constraint to include 'programmer' role
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN (
    'content_creator',
    'content_manager',
    'content_head',
    'evaluator',
    'executive',
    'legal',
    'finance',
    'management',
    'admin',
    'programmer'
  ));

-- =====================================================
-- RLS Policies for Programmer Role
-- =====================================================

-- Programmer role gets basic authenticated user access
-- They can view their own user profile
CREATE POLICY "Programmers can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() AND get_user_role() = 'programmer'
  );

-- Note: Programmer role has standard authenticated user access.
-- Add additional policies here if programmers need specific access to other tables.
-- For now, they have dashboard access but no special permissions beyond basic user access.

COMMENT ON CONSTRAINT users_role_check ON users IS 'Enforces valid user roles including: content_creator, content_manager, content_head, evaluator, executive, legal, finance, management, admin, programmer';

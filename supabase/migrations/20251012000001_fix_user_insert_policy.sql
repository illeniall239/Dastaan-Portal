-- =====================================================
-- FIX: Allow users to create their own profile during registration
-- =====================================================

-- Drop the old policy
DROP POLICY IF EXISTS "Only admins can insert users" ON users;

-- Create the new policy that allows users to create their own profile
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);
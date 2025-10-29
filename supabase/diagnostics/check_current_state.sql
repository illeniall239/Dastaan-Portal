-- =====================================================
-- DIAGNOSTIC: Check Current Database State
-- =====================================================
-- Run this to see what's actually in your database
-- Copy the output and share it

-- Check if validate_org_email_domain function exists
SELECT 'Function Check: validate_org_email_domain' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_org_email_domain')
            THEN '✓ EXISTS'
            ELSE '✗ MISSING'
       END as status;

-- Check if handle_new_user function exists
SELECT 'Function Check: handle_new_user' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
            THEN '✓ EXISTS'
            ELSE '✗ MISSING'
       END as status;

-- Check triggers on auth.users
SELECT 'Trigger Check: auth.users triggers' as check_name,
       tgname as trigger_name,
       tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

-- Check RLS policies on public.users
SELECT 'Policy Check: public.users' as check_name,
       policyname as policy_name,
       cmd as command
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

-- Check if RLS is enabled on users table
SELECT 'RLS Check: public.users' as check_name,
       CASE WHEN relrowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' AND c.relname = 'users';

-- Check current admin user
SELECT 'Admin User Check' as check_name,
       id,
       email,
       role
FROM public.users
WHERE role = 'admin'
LIMIT 5;

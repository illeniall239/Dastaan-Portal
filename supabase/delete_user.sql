-- =====================================================
-- DELETE EXISTING USER: rao.muhammad@geo.tv
-- =====================================================
-- Run this first if signup failed previously
-- Then run fix_email_domain_to_geotv.sql

-- Delete from public.users table
DELETE FROM public.users
WHERE email = 'rao.muhammad@geo.tv';

-- Delete from auth.users table (Supabase Auth)
DELETE FROM auth.users
WHERE email = 'rao.muhammad@geo.tv';

-- Verify deletion (should return 0 rows)
SELECT * FROM public.users WHERE email = 'rao.muhammad@geo.tv';
SELECT * FROM auth.users WHERE email = 'rao.muhammad@geo.tv';

-- =====================================================
-- After running this, run: fix_email_domain_to_geotv.sql
-- Then restart dev server and sign up fresh
-- =====================================================

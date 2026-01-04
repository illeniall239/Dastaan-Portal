-- Run this in Supabase SQL Editor to check your user's role
SELECT id, email, name, role, status 
FROM users 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

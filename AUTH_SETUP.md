# Authentication Setup Guide

Complete guide to set up and test the authentication system for Content Portal.

## Migration Files

You need to run **3 migration files** in your Supabase dashboard in this order:

### 1. Initial Schema Migration
**File:** `supabase/migrations/20250101000000_initial_schema.sql`
- Creates all database tables (users, stories, evaluations, etc.)
- Sets up indexes for performance
- Creates triggers for automatic timestamp updates

### 2. Row Level Security Migration
**File:** `supabase/migrations/20250101000001_row_level_security.sql`
- Enables RLS on all tables
- Creates security policies for role-based access
- Sets up helper functions for permissions

### 3. Authentication Setup Migration ✨ NEW
**File:** `supabase/migrations/20250101000002_authentication_setup.sql`
- Links Supabase Auth with custom users table
- Auto-creates user profile on signup
- Tracks last login timestamps
- Seeds default roles with permissions

## How to Run Migrations

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `ivrsilgscxrobuewnbnd`
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run Migrations in Order

**Migration 1 - Initial Schema:**
```sql
-- Copy and paste contents of:
-- supabase/migrations/20250101000000_initial_schema.sql
-- Then click "Run"
```

**Migration 2 - Row Level Security:**
```sql
-- Copy and paste contents of:
-- supabase/migrations/20250101000001_row_level_security.sql
-- Then click "Run"
```

**Migration 3 - Authentication Setup:**
```sql
-- Copy and paste contents of:
-- supabase/migrations/20250101000002_authentication_setup.sql
-- Then click "Run"
```

## What the Auth Migration Does

### 1. Auto-Create User Profiles
When someone signs up via Supabase Auth, a trigger automatically creates their profile in the `public.users` table with:
- Their email
- Their name (from signup form)
- Default role: `content_creator`
- Status: `active`

### 2. Track Last Login
Every time a user logs in, their `last_login` timestamp is updated automatically.

### 3. Helper Functions
- `get_current_user()` - Get full user profile for authenticated user
- `get_user_role()` - Get role of authenticated user
- `is_admin()` - Check if user is admin
- `is_content_manager()` - Check if user is content manager

### 4. Seed Default Roles
Automatically creates 7 roles with their permissions:
- **admin** - Full system access
- **content_manager** - Manage content workflow
- **evaluator** - Evaluate submissions
- **executive** - Approve stories
- **legal** - Review contracts
- **finance** - Manage payments
- **content_creator** - Submit stories

## Authentication Flow

### User Registration Flow
1. User visits `/signup`
2. Fills out form (name, email, password)
3. Clicks "Sign Up"
4. **Backend Process:**
   - Supabase Auth creates user in `auth.users`
   - Trigger `on_auth_user_created` fires
   - Function `handle_new_user()` creates profile in `public.users`
   - User metadata (name, role) stored in profile
5. User receives verification email
6. After verification, redirected to `/login`

### User Login Flow
1. User visits `/login`
2. Enters email and password
3. Clicks "Sign In"
4. **Backend Process:**
   - Supabase Auth validates credentials
   - Session created
   - Trigger `on_auth_user_login` fires
   - `last_login` timestamp updated
   - Middleware validates session
5. User redirected to `/dashboard`

### Protected Routes
Middleware automatically protects these routes:
- `/dashboard` - Main dashboard
- `/stories` - Story management
- `/evaluations` - Evaluation system
- `/approvals` - Executive approvals
- `/contracts` - Contract management
- `/payments` - Payment tracking

**Not logged in?** → Redirected to `/login`
**Already logged in?** → Cannot access `/login` or `/signup`, redirected to `/dashboard`

## Test the Authentication System

### 1. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 2. Create First User
1. Click "Sign Up" or go to http://localhost:3000/signup
2. Fill out the form:
   - **Name:** Your Name
   - **Email:** your.email@example.com
   - **Password:** At least 6 characters
   - **Confirm Password:** Same as password
3. Click "Sign Up"

### 3. Check Email (Supabase Auto-Confirms in Dev)
In development mode, Supabase auto-confirms emails. Check:
- Go to Supabase Dashboard → Authentication → Users
- You should see your new user

### 4. Check User Profile
In SQL Editor, run:
```sql
SELECT * FROM users;
```

You should see:
- Your user ID
- Email
- Name
- Role: `content_creator`
- Status: `active`
- Created timestamp

### 5. Login
1. Go to http://localhost:3000/login
2. Enter your email and password
3. Click "Sign In"
4. You should be redirected to `/dashboard`

### 6. Test Protected Routes
Try accessing:
- ✅ http://localhost:3000/dashboard - Should work
- ✅ http://localhost:3000/login - Should redirect to dashboard
- ✅ Sign out - Should redirect to login
- ❌ Access dashboard without login - Should redirect to login

## Create Admin User

After your first signup, upgrade yourself to admin:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your.email@example.com';
```

Admin users can:
- Manage all users
- Access all features
- Create/update/delete any content
- Override role restrictions

## User Roles & Permissions

### Content Creator
- Submit story ideas
- View own stories
- Track submission status
- Upload attachments

### Content Manager
- View all stories
- Create call reports
- Assign evaluators
- Manage workflow
- Create negotiations

### Evaluator
- View assigned stories
- Complete evaluation forms
- Submit feedback and scores
- View own evaluations

### Executive
- View evaluation summaries
- Review one-liners
- Approve/reject stories
- View pipeline metrics

### Legal
- View negotiations
- Create legal reviews
- Approve contracts
- Track compliance

### Finance
- View contracts
- Track payment schedules
- Process payments
- Approve invoices

### Admin
- All of the above
- Manage users
- Configure system
- Access all data

## Troubleshooting

### Issue: User created but no profile in users table
**Solution:** Check trigger is created:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

If missing, run migration 3 again.

### Issue: Can't login after signup
**Solution:** Check email confirmation:
- Go to Supabase Dashboard → Authentication → Users
- Find your user
- If unconfirmed, click the "..." menu → "Confirm Email"

### Issue: Redirected to login even when logged in
**Solution:** Clear cookies and try again:
1. Open browser DevTools (F12)
2. Application → Cookies
3. Delete all cookies for localhost:3000
4. Try logging in again

### Issue: "Unauthorized" error
**Solution:** Check RLS policies are enabled:
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

Should show multiple policies for each table.

## Next Steps

After authentication is working:

1. **Test all user roles** - Create test users with different roles
2. **Build story submission** - Next feature in Phase 1
3. **Add role-specific dashboards** - Customize dashboard per role
4. **Implement notifications** - Email alerts for key actions
5. **Add user management** - Admin interface for managing users

## Files Created

### Migrations
- ✅ `supabase/migrations/20250101000002_authentication_setup.sql`

### Backend/Utilities
- ✅ `lib/auth.ts` - Server-side auth utilities
- ✅ `hooks/use-auth.ts` - Client-side auth hook
- ✅ `middleware.ts` - Route protection (updated)

### UI Components
- ✅ `components/ui/input.tsx` - Input component
- ✅ `components/ui/label.tsx` - Label component
- ✅ `components/ui/card.tsx` - Card component

### Pages
- ✅ `app/(auth)/layout.tsx` - Auth pages layout
- ✅ `app/(auth)/login/page.tsx` - Login page
- ✅ `app/(auth)/signup/page.tsx` - Signup page
- ✅ `app/dashboard/page.tsx` - Dashboard page
- ✅ `app/page.tsx` - Landing page (updated)
- ✅ `app/api/auth/signout/route.ts` - Sign out API route

## Quick Reference

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://ivrsilgscxrobuewnbnd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Important URLs
- Landing: http://localhost:3000
- Login: http://localhost:3000/login
- Signup: http://localhost:3000/signup
- Dashboard: http://localhost:3000/dashboard
- Supabase Dashboard: https://supabase.com/dashboard/project/ivrsilgscxrobuewnbnd

### Useful Commands
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Check TypeScript
npx tsc --noEmit
```

## Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Check Supabase logs in Dashboard → Logs
3. Verify all migrations ran successfully
4. Check environment variables are set correctly
5. Clear browser cache and cookies

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Dastaan Portal** (داستان - "Story" in Urdu) is a Story Development Management System for a media organization. It manages the complete content lifecycle from initial story pitch through to final payment, providing visibility and accountability across 8 workflow stages.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), shadcn/ui, React Hook Form + Zod

## Common Commands

### Development
```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Database Migrations
Migrations are applied via Supabase Dashboard → SQL Editor (not CLI):
1. Navigate to https://supabase.com/dashboard → your project → SQL Editor
2. Copy migration file contents from `supabase/migrations/`
3. Paste and click "Run"
4. Run in order by timestamp (20250101000000, 20250101000001, etc.)

### Testing Authentication
```bash
# Clear Next.js cache if auth issues occur
rm -rf .next
npm run dev
```

## Architecture

### 8-Stage Story Workflow
The system models a linear workflow with automated routing:
1. **Submission** → Content creators submit story ideas
2. **Writer Engagement Report** → Content managers create meeting reports
3. **Evaluation** → Multiple evaluators score stories (8 criteria, 1-10 scale)
4. **Approval** → Executives approve/reject via one-liners
5. **Negotiation** → Price and terms negotiation tracking
6. **Legal Review** → Legal compliance and contract review
7. **Contract** → Signed agreements with payment milestones
8. **Payment** → Milestone-based payment tracking

Each stage has specific database tables, API routes, and UI pages. Status changes flow automatically based on actions (e.g., completing an evaluation changes story status to "in_evaluation").

### Role-Based Access Control (RBAC)
7 user roles with specific permissions enforced via middleware and RLS:
- **admin** - Full system access
- **content_manager** - Manages workflow, creates call reports, assigns evaluators
- **content_creator** - Submits stories, tracks own submissions
- **evaluator** - Scores assigned stories (8 evaluation criteria)
- **executive** - Approves/rejects via one-liners
- **legal** - Reviews contracts and compliance
- **finance** - Processes payments

**Middleware** (`middleware.ts`) redirects users to role-appropriate dashboards:
- content_manager/content_creator → `/content-department`
- Other roles → `/dashboard`

### Database Architecture

**17 core tables** organized in 4 groups:

**Core Workflow:**
- `users` - User accounts with role/department
- `stories` - Story submissions (status: draft → submitted → in_evaluation → approved → contracted → in_payment)
- `call_reports` - Meeting reports linked to stories
- `evaluator_forms` - Individual evaluator assessments (8 scoring criteria)
- `evaluation_logs` - Aggregated evaluation results

**Business Logic:**
- `one_liners` - Executive approval summaries
- `negotiations` - Price negotiation tracking
- `legal_reviews` - Legal compliance checks
- `contracts` - Signed agreements
- `payment_schedules` - Payment milestone plans
- `payments` - Individual payment records

**Script Development:**
- `script_phases` - Script development stages
- `script_feedback` - Script review feedback

**Supporting:**
- `archive` - Rejected stories
- `attachments` - File uploads
- `notifications` - User notifications
- `audit_logs` - Complete audit trail

**Key Pattern:** All tables have RLS policies that filter by role. Content creators can only see their own stories; evaluators only see assigned evaluations; executives see only approval tasks.

### Supabase Integration

**Four client patterns:**
1. **Browser Client** (`lib/supabase/client.ts`) - For client components
2. **Server Client** (`lib/supabase/server.ts`) - For server components/actions
3. **Admin Client** (`lib/supabase/admin.ts`) - For admin operations with service role key (bypasses RLS)
4. **Middleware Client** (in `middleware.ts`) - For route protection

**IMPORTANT:** Always use the appropriate client:
- Client components: `import { createClient } from '@/lib/supabase/client'`
- Server components: `import { createClient } from '@/lib/supabase/server'`
- API routes (regular): Use server client
- API routes (admin operations): `import { createAdminClient } from '@/lib/supabase/admin'`

**Authentication Flow:**
- **No self-service signup** - All accounts created by admin only
- Admin creates users via `/admin/users/new` using service role key
- Users login with credentials provided by admin
- Supabase Auth manages auth.users table
- Trigger `on_auth_user_created` auto-creates profile in public.users
- Middleware validates session and enforces role-based routing
- Helper functions in database: `get_current_user()`, `get_user_role()`, `is_admin()`

### File Organization

```
app/
├── (auth)/              # Auth pages (login only - no signup)
├── dashboard/           # Generic dashboard
├── content-department/  # Content manager & creator hub
│   ├── calendar/        # Meeting calendar
│   ├── call-reports/    # Call report CRUD
│   ├── evaluations/     # Evaluation management
│   └── evaluate/        # Evaluator scoring interface
├── admin/              # User management
└── api/                # API routes
    ├── admin/          # User management APIs
    └── auth/           # Auth APIs

components/
├── ui/                 # shadcn/ui components (button, card, input, etc.)
├── auth/              # Auth-specific (password-input, password-strength)
├── layout/            # Header, sidebar
└── dashboard/         # Dashboard widgets

lib/
├── supabase/          # Supabase clients
├── validations/       # Zod schemas (auth, etc.)
├── utils/             # Utilities (password strength)
├── evaluations/       # Evaluation business logic
├── meetings/          # Meeting/call report logic
└── notifications/     # Notification helpers

types/
└── index.ts           # TypeScript types (User, Story, CallReport, Evaluation, etc.)

supabase/migrations/   # Database migrations (run via dashboard)
```

### Form Validation Pattern

**All forms use React Hook Form + Zod:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 1. Define schema
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// 2. Use in form
const form = useForm({
  resolver: zodResolver(schema),
  mode: 'onBlur' // Validate on blur for better UX
});

// 3. Display errors
{errors.email && <p className="text-destructive">{errors.email.message}</p>}
```

**Validation schemas in:** `lib/validations/`
**Reusable components:** `components/auth/password-input.tsx`, `components/auth/password-strength.tsx`

### Email Domain Restriction

**Frontend and backend enforce @geo.com email addresses:**
- Frontend: Zod schema in `lib/validations/auth.ts`
- Backend: PostgreSQL trigger in migration `20250101000003_email_domain_validation.sql`
- Environment variable: `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=geo.com`

**IMPORTANT:** Both layers required for security. Frontend for UX, backend to prevent API bypasses.

### Content Department Hub

The `/content-department` route is the main workspace for content_manager and content_creator roles:
- **Calendar** - Schedule and view meetings
- **Writer Engagement Reports** - Create detailed meeting reports (linked to stories)
- **Evaluations** - Assign evaluators, track evaluation status
- **Evaluate** - Evaluators fill out 8-criteria scoring forms

**Evaluation Criteria (1-10 scale):**
1. Originality
2. Market Potential
3. Execution Feasibility
4. Audience Appeal
5. Budget Viability
6. Cultural Relevance
7. Competitive Advantage
8. Production Complexity

Total score calculated automatically. Recommendation: strong_yes/yes/maybe/no/strong_no.

### Business Logic Modules

**Evaluations** (`lib/evaluations/`):
- `client.ts` - Client-side evaluation CRUD
- `server.ts` - Server-side evaluation logic with RLS

**Meetings** (`lib/meetings/`):
- `client.ts` - Meeting/call report client operations
- `server.ts` - Server-side meeting logic

Pattern: Separate client/server implementations to properly handle Supabase auth context.

## Development Workflow

### Adding a New Feature
1. **Database First:** Create migration in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. **Types:** Add TypeScript types to `types/index.ts`
3. **Business Logic:** Create functions in `lib/[domain]/`
4. **API Routes:** Add API routes in `app/api/[domain]/`
5. **UI:** Build pages/components in `app/[domain]/`
6. **Validation:** Add Zod schemas to `lib/validations/`

### Modifying Authentication
- Auth logic lives in `lib/auth.ts`, `lib/validations/auth.ts`
- Update RLS policies if changing permissions (new migration required)
- Test with multiple user roles

### Adding a User Role
1. Update `types/index.ts` UserRole type
2. Add role to migration seed data
3. Update middleware.ts protectedRoutes
4. Add RLS policies for new role
5. Create role-specific dashboard routes

### Working with Migrations
- Never edit migration files after running them
- Create new migration for schema changes
- Include both schema changes and RLS policy updates
- Name format: `YYYYMMDDHHMMSS_description.sql`
- Run via Supabase Dashboard, NOT CLI

## Important Patterns

### Protected Routes
Middleware automatically protects routes. Add new protected routes to `middleware.ts`:
```typescript
const protectedRoutes: Record<string, string[]> = {
  "/new-section": ["allowed_role1", "allowed_role2", "admin"],
};
```

### Getting Current User
```typescript
// Server component
import { createClient } from '@/lib/supabase/server';

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

// Get full user profile with role
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();
```

### Client-Side Data Fetching
```typescript
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data, error } = await supabase
  .from('stories')
  .select('*')
  .eq('status', 'submitted');
```

### File Uploads
Storage buckets: `story-attachments`, `call-report-attachments`, `contract-documents`, `script-files`

```typescript
const { data, error } = await supabase.storage
  .from('story-attachments')
  .upload(`${userId}/${fileName}`, file);
```

### ID Generation Pattern
Auto-generated IDs with format PREFIX-YYYY-NNNN:
- Stories: ST-2025-0001
- Writer Engagement Reports: CR-2025-0001
- Implemented via database triggers on INSERT

## Troubleshooting

### Authentication Issues
1. Clear Next.js cache: `rm -rf .next && npm run dev`
2. Check Supabase Dashboard → Authentication → Users for user status
3. Verify email confirmed (auto-confirmed in dev mode)
4. Check browser console for session errors
5. Ensure all 4 auth migrations ran successfully

### Permission Errors
1. Check user role in database: `SELECT * FROM users WHERE email = 'user@geo.com'`
2. Verify RLS policies enabled: `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'`
3. Test if admin role bypasses issue (indicates RLS policy problem)
4. Check middleware protectedRoutes configuration

### Database Errors
1. Verify migration ran: Check Supabase Dashboard → Database → Migrations
2. Check table exists: `SELECT * FROM information_schema.tables WHERE table_schema = 'public'`
3. Verify RLS enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`

### Build Errors
- TypeScript errors: Restart TS server in VS Code (Ctrl+Shift+P → "TypeScript: Restart TS Server")
- Module not found: Delete node_modules, reinstall: `rm -rf node_modules && npm install`
- Environment variables: Ensure `.env.local` matches `.env.example` format

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=geo.com
```

## Documentation

- `README.md` - Quick start guide
- `DEVELOPMENT_GUIDE.md` - Detailed development guide with workflow explanation
- `AUTH_SETUP.md` - Authentication setup and testing guide
- `VALIDATION_IMPLEMENTATION.md` - Form validation implementation details
- `PRD.md` - Product Requirements Document
- `Software Requirements Specification.txt` - Detailed requirements

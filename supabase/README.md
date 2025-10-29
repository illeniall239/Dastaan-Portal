# Supabase Database Setup

This directory contains database migrations for the Content Portal project.

## Prerequisites

- Supabase account and project
- Supabase CLI installed (optional, for local development)

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended for Quick Setup)

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to the SQL Editor
3. Run the migrations in order:
   - First run `20250101000000_initial_schema.sql`
   - Then run `20250101000001_row_level_security.sql`

### Option 2: Using Supabase CLI

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. Push migrations:
```bash
supabase db push
```

## Migration Files

### 20250101000000_initial_schema.sql
Creates all the core tables for the Content Portal:
- Users & Roles
- Stories & Workflow (stories, call_reports, evaluator_forms, evaluation_logs)
- Approvals & Negotiations (one_liners, negotiations)
- Legal & Contracts (legal_reviews, contracts)
- Payments & Scripting (payment_schedules, payments, script_phases, script_feedback)
- Supporting Tables (archive, attachments, notifications, audit_logs, workflows, workflow_stages)

### 20250101000001_row_level_security.sql
Sets up Row Level Security (RLS) policies for all tables to ensure:
- Role-based access control
- Data privacy and security
- Proper authorization for CRUD operations

## Post-Migration Setup

After running the migrations, you need to:

1. **Create Initial Admin User:**
   - Go to Authentication > Users in Supabase Dashboard
   - Add a new user with your email
   - Go to SQL Editor and run:
   ```sql
   INSERT INTO users (id, email, name, role, status)
   VALUES (
     'YOUR_AUTH_USER_ID', -- Get this from auth.users table
     'admin@example.com',
     'Admin User',
     'admin',
     'active'
   );
   ```

2. **Create Seed Roles:**
   ```sql
   INSERT INTO roles (name, description) VALUES
   ('admin', 'Full system access'),
   ('content_manager', 'Manage content workflow'),
   ('evaluator', 'Evaluate story submissions'),
   ('executive', 'Approve one-liners and budgets'),
   ('legal', 'Review legal aspects and contracts'),
   ('finance', 'Manage payments and invoices'),
   ('content_creator', 'Submit story ideas');
   ```

3. **Configure Storage Buckets:**
   - Go to Storage in Supabase Dashboard
   - Create buckets:
     - `story-attachments` (for story documents)
     - `call-report-attachments` (for call report files)
     - `contract-documents` (for contracts and legal docs)
     - `script-files` (for script uploads)
   - Set appropriate access policies for each bucket

## Database Schema Overview

```
users (Authentication & User Management)
  ├─→ stories (Story Submissions)
  │    ├─→ call_reports (Meeting Reports)
  │    │    ├─→ evaluator_forms (Evaluation Scores)
  │    │    └─→ evaluation_logs (Aggregated Results)
  │    ├─→ one_liners (Executive Approvals)
  │    ├─→ negotiations (Price Negotiations)
  │    ├─→ legal_reviews (Legal Compliance)
  │    ├─→ contracts (Signed Agreements)
  │    │    ├─→ payment_schedules (Payment Plans)
  │    │    │    └─→ payments (Payment Tracking)
  │    │    └─→ script_phases (Script Development)
  │    │         └─→ script_feedback (Script Reviews)
  │    ├─→ archive (Rejected Stories)
  │    └─→ workflows (Workflow Tracking)
  │         └─→ workflow_stages (Stage Details)
  ├─→ notifications (User Notifications)
  ├─→ audit_logs (System Audit Trail)
  └─→ attachments (File Uploads)
```

## Environment Variables

Make sure these are set in your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Troubleshooting

### Error: "relation already exists"
If you see this error, the tables already exist. You can either:
- Drop all tables and re-run migrations (CAUTION: This deletes all data)
- Skip the migration if the schema is already correct

### Error: "permission denied"
Make sure you're using the service role key or have proper database permissions.

### RLS Policies Not Working
- Verify RLS is enabled on the table
- Check that helper functions (get_user_role, is_admin) exist
- Ensure the authenticated user exists in the users table

## Next Steps

After setting up the database:
1. Test the Supabase connection from your Next.js app
2. Create seed data for testing
3. Implement API routes and server actions
4. Build the UI components


Support Multiple Evaluators Per Call Report                                                                                  │
     │                                                                                                                              │
     │ Good News: The database already supports this! Multiple evaluators can evaluate the same call report (no unique constraint). │
     │                                                                                                                              │
     │ The Problem:                                                                                                                 │
     │ - Current "Pending Evaluations" = call reports with NO evaluations                                                           │
     │ - But you want: each evaluator sees call reports THEY haven't evaluated yet                                                  │
     │ - Final score should be: average of all evaluators' averages                                                                 │
     │                                                                                                                              │
     │ Solution: Per-User Evaluation Tracking                                                                                       │
     │                                                                                                                              │
     │ Approach:                                                                                                                    │
     │                                                                                                                              │
     │ 1. "Pending Evaluations" means "call reports I personally haven't evaluated yet"                                             │
     │ 2. Each evaluator can evaluate any call report independently                                                                 │
     │ 3. Call reports can have multiple evaluations from different evaluators                                                      │
     │ 4. When viewing evaluations, show aggregated scores                                                                          │
     │                                                                                                                              │
     │ ---                                                                                                                          │
     │ Changes Needed:                                                                                                              │
     │                                                                                                                              │
     │ 1. Dashboard: Change Pending Evaluations Logic                                                                               │
     │                                                                                                                              │
     │ File: app/content-department/page.tsx                                                                                        │
     │                                                                                                                              │
     │ Current logic:                                                                                                               │
     │ // Call reports NO ONE has evaluated                                                                                         │
     │ pendingEvaluationsCount = callReportsCount - evaluatedCallReportIds.size                                                     │
     │                                                                                                                              │
     │ New logic:                                                                                                                   │
     │ // Call reports I (current user) haven't evaluated yet                                                                       │
     │ const myEvaluations = await getEvaluationsByEvaluator(user.id);                                                              │
     │ const myEvaluatedIds = new Set(myEvaluations.map(e => e.call_report_id));                                                    │
     │ pendingEvaluationsCount = callReportsCount - myEvaluatedIds.size;                                                            │
     │                                                                                                                              │
     │ 2. Evaluations Page: Show My Status                                                                                          │
     │                                                                                                                              │
     │ File: app/content-department/evaluations/page.tsx                                                                            │
     │                                                                                                                              │
     │ Add indicator for each call report:                                                                                          │
     │ - Show if current user has already evaluated it                                                                              │
     │ - Still allow clicking to evaluate again (or show "View Your Evaluation")                                                    │
     │ - Display: "You've evaluated this" badge or checkmark                                                                        │
     │                                                                                                                              │
     │ 3. Call Report Detail Page: Show All Evaluations                                                                             │
     │                                                                                                                              │
     │ File: app/content-department/call-reports/[id]/page.tsx                                                                      │
     │                                                                                                                              │
     │ Add section showing:                                                                                                         │
     │ - All evaluations for this call report                                                                                       │
     │ - Each evaluator's average score                                                                                             │
     │ - Overall average (average of all evaluators' averages)                                                                      │
     │ - Link to view each evaluation detail                                                                                        │
     │                                                                                                                              │
     │ 4. Completed Evaluations Page: Add Aggregate View                                                                            │
     │                                                                                                                              │
     │ File: app/content-department/evaluations/completed/page.tsx                                                                  │
     │                                                                                                                              │
     │ Option to view:                                                                                                              │
     │ - "My Evaluations" (current view)                                                                                            │
     │ - "All Evaluations" (grouped by call report with aggregate scores)                                                           │
     │                                                                                                                              │
     │ 5. Create Aggregate Evaluation View (NEW)                                                                                    │
     │                                                                                                                              │
     │ File: app/content-department/call-reports/[id]/evaluations/page.tsx                                                          │
     │                                                                                                                              │
     │ Shows all evaluations for a specific call report:                                                                            │
     │ - List each evaluator's scores                                                                                               │
     │ - Show average of averages                                                                                                   │
     │ - Compare scores across evaluators                                                                                           │
     │                                                                                                                              │
     │ ---                                                                                                                          │
     │ Database Functions to Add:                                                                                                   │
     │                                                                                                                              │
     │ lib/evaluations/server.ts:                                                                                                   │
     │                                                                                                                              │
     │ /**                                                                                                                          │
     │  * Get aggregate evaluation data for a call report                                                                           │
     │  * Returns all evaluations with calculated overall average                                                                   │
     │  */                                                                                                                          │
     │ export async function getAggregateEvaluationForCallReport(callReportId: string) {                                            │
     │   // Fetch all evaluations for this call report                                                                              │
     │   // Calculate average of all evaluators' average_score                                                                      │
     │   // Return: { evaluations: [...], overallAverage: X.X }                                                                     │
     │ }                                                                                                                            │
     │                                                                                                                              │
     │ /**                                                                                                                          │
     │  * Check if current user has evaluated a specific call report                                                                │
     │  */                                                                                                                          │
     │ export async function hasUserEvaluatedCallReport(userId: string, callReportId: string) {                                     │
     │   // Returns boolean                                                                                                         │
     │ }                                                                                                                            │
     │                                                                                                                              │
     │ ---                                                                                                                          │
     │ User Experience Flow:                                                                                                        │
     │                                                                                                                              │
     │ Scenario: 3 evaluators need to evaluate a call report                                                                        │
     │                                                                                                                              │
     │ Evaluator A:                                                                                                                 │
     │ 1. Sees "Pending Evaluations: 10" (all 10 call reports)                                                                      │
     │ 2. Evaluates Call Report #1                                                                                                  │
     │ 3. Sees "Pending Evaluations: 9" (hasn't evaluated the other 9)                                                              │
     │                                                                                                                              │
     │ Evaluator B:                                                                                                                 │
     │ 1. Sees "Pending Evaluations: 10" (all 10 call reports)                                                                      │
     │ 2. Evaluates Call Report #1                                                                                                  │
     │ 3. Sees "Pending Evaluations: 9"                                                                                             │
     │                                                                                                                              │
     │ Viewing Call Report #1:                                                                                                      │
     │ - Shows 2 evaluations (A's and B's)                                                                                          │
     │ - Overall Average: (A's avg + B's avg) / 2                                                                                   │
     │ - If C evaluates later: (A's avg + B's avg + C's avg) / 3                                                                    │
     │                                                                                                                              │
     │ No Pre-Set Evaluator Count:                                                                                                  │
     │ - System doesn't track "how many evaluators needed"                                                                          │
     │ - Any evaluator can evaluate any call report                                                                                 │
     │ - Just shows current state: "X evaluators have reviewed this"                                                                │
     │                                                                                                                              │
     │ ---                                                                                                                          │
     │ Implementation Priority:                                                                                                     │
     │                                                                                                                              │
     │ High Priority (Essential):                                                                                                   │
     │ 1. Fix dashboard pending count (per-user)                                                                                    │
     │ 2. Add "already evaluated" indicator on evaluations page                                                                     │
     │ 3. Show all evaluations in call report detail page                                                                           │
     │                                                                                                                              │
     │ Medium Priority (Nice to have):                                                                                              │
     │ 4. Create aggregate evaluation view page                                                                                     │
     │ 5. Allow re-evaluation or viewing own evaluation                                                                             │
     │                                                                                                                              │
     │ Low Priority (Future enhancement):                                                                                           │
     │ 6. Set target evaluator count per call report                                                                                │
     │ 7. Progress tracking (3/5 evaluators completed)
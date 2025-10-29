# Development Guide - Content Portal

## Project Summary

**Content Portal** is a comprehensive Story Development Management System for a media organization. It streamlines the entire content lifecycle from initial story pitch to final payment, providing complete visibility and accountability across all stages.

## What This System Does

### The Problem It Solves
Currently, story development is chaotic:
- Story submissions get lost in email threads
- No visibility into evaluation status
- Payment delays without clear accountability (20% miss deadlines)
- No data-driven insights into the content pipeline
- Average 45 days from submission to contract (too slow)

### The Solution
A centralized platform that provides:
- Clear 8-stage workflow with automated routing
- Real-time status tracking for all stakeholders
- Structured evaluation with scoring criteria
- Payment milestone tracking
- Complete audit trail
- Target: 25-day average time to contract (45% improvement)

## 8-Stage Story Workflow

1. **Submission** - Content creators submit story ideas
2. **Call Report** - Content managers create detailed meeting reports
3. **Evaluation** - Multiple evaluators score stories (8 criteria, 1-10 scale)
4. **Approval** - Executives review one-liners and approve/reject
5. **Negotiation** - Price and terms negotiation with writers/producers
6. **Legal Review** - Legal team reviews compliance and contracts
7. **Contract** - Signed agreements with payment milestones
8. **Payment** - Milestone-based payment tracking and processing

## User Roles

1. **Content Creator** - Submit story ideas, track status
2. **Content Manager** - Coordinate workflow, create reports, manage pipeline
3. **Evaluator** - Review and score story submissions
4. **Executive** - Approve one-liners, make final decisions
5. **Legal** - Review contracts, ensure compliance
6. **Finance** - Process payments, track milestones
7. **Admin** - Full system access, user management

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Forms**: React Hook Form + Zod validation
- **Email**: Resend
- **Charts**: Recharts
- **Deployment**: Vercel (frontend) + Supabase Cloud (backend)

## Database Schema

17 core tables organized into:

**Core Workflow:**
- `users` - User accounts and roles
- `stories` - Story submissions
- `call_reports` - Meeting reports with story details
- `evaluator_forms` - Individual evaluator assessments
- `evaluation_logs` - Aggregated evaluation results

**Business Logic:**
- `one_liners` - Executive approval summaries
- `negotiations` - Price negotiation tracking
- `legal_reviews` - Legal compliance checks
- `contracts` - Signed agreements
- `payment_schedules` - Payment plans
- `payments` - Individual payment tracking

**Script Development:**
- `script_phases` - Script development stages
- `script_feedback` - Script review feedback

**Supporting:**
- `archive` - Rejected stories
- `attachments` - File uploads
- `notifications` - User notifications
- `audit_logs` - Complete audit trail

## Development Phases (15-Day Timeline)

### Phase 1: Foundation & Core Workflow (Days 1-7) ✅
- [x] Project setup and infrastructure
- [x] Database schema and migrations
- [x] Supabase integration
- [ ] Authentication system
- [ ] Story submission workflow
- [ ] Call report creation
- [ ] Evaluation system

### Phase 2: Extended Workflow & Business Logic (Days 8-11)
- [ ] Approval workflow (one-liners)
- [ ] Negotiation tracking
- [ ] Legal review process
- [ ] Contract management
- [ ] Payment tracking

### Phase 3: Visibility & Intelligence Layer (Days 12-15)
- [ ] Dashboard and analytics
- [ ] Archive system
- [ ] Email notifications
- [ ] Reports and exports
- [ ] Final polish

## Project Structure

```
C:\Content Portal\
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/
│   └── ui/                      # shadcn/ui components
│       ├── button.tsx
│       └── sonner.tsx
├── lib/
│   ├── supabase/                # Supabase clients
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   └── utils.ts                 # Utility functions
├── types/
│   └── index.ts                 # TypeScript types
├── hooks/                       # Custom React hooks
├── supabase/
│   ├── migrations/              # Database migrations
│   │   ├── 20250101000000_initial_schema.sql
│   │   └── 20250101000001_row_level_security.sql
│   └── README.md                # Database setup guide
├── middleware.ts                # Next.js auth middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.local                   # Environment variables
├── PRD.md                       # Product Requirements Document
├── Software Requirements Specification.txt
└── README.md
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase Database
See `supabase/README.md` for detailed instructions:
1. Go to Supabase Dashboard → SQL Editor
2. Run `20250101000000_initial_schema.sql`
3. Run `20250101000001_row_level_security.sql`
4. Create initial admin user
5. Set up storage buckets

### 3. Configure Environment Variables
Your `.env.local` is already configured with:
- Supabase URL and keys
- Resend API key
- App URL

### 4. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### 5. Build for Production
```bash
npm run build
npm start
```

## Next Steps

### Immediate Tasks
1. **Set up Supabase database** - Run migrations in Supabase dashboard
2. **Create admin user** - Add initial user to users table
3. **Test authentication** - Implement login/signup pages
4. **Build story submission form** - First user-facing feature

### Week 1 Goals (Phase 1)
- Complete authentication system
- Build story submission workflow
- Create call report form
- Implement evaluation system
- Set up file uploads

## Key Features to Implement

### Authentication (Priority 1)
- Email/password login
- Role-based access control
- Protected routes
- User profile management

### Story Submission (Priority 2)
- Story submission form with validation
- Auto-generated Story IDs (ST-YYYY-NNNN)
- File attachment support
- Draft/submit functionality

### Call Reports (Priority 3)
- Meeting report creation
- Rich text editor for notes
- Link to story submissions
- Auto-population from story data

### Evaluation System (Priority 4)
- Evaluator assignment
- 8-criteria scoring (1-10 scale)
- Structured feedback form
- Aggregate scoring logic
- Decision routing (approve/reject/need info)

### Dashboard (Priority 5)
- Pipeline overview
- Status metrics
- My Tasks view (role-specific)
- Recent activity
- Overdue items

## Database Row Level Security (RLS)

All tables have RLS policies configured:
- Content creators can view all stories but only edit their own
- Evaluators can only see assigned evaluations
- Executives see one-liners and approval tasks
- Legal sees contracts and legal reviews
- Finance sees payments only
- Admins and managers have broader access

## File Upload Strategy

Storage buckets in Supabase:
- `story-attachments` - Story documents, pitches
- `call-report-attachments` - Meeting notes, presentations
- `contract-documents` - Contracts, legal documents
- `script-files` - Script uploads

## Email Notifications

Triggered emails (via Resend):
- Story submission confirmation
- Evaluation assignment
- Decision notifications
- Payment approvals
- Contract signatures
- Overdue reminders

## Success Metrics

Track these KPIs in the dashboard:
- Average time to contract (target: 25 days)
- Payment delays (target: 0%)
- Pipeline visibility (target: 100%)
- Evaluation consistency (target: 95%)
- User self-service (target: 80%)

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Product Requirements Document](./PRD.md)
- [Software Requirements Specification](./Software%20Requirements%20Specification.txt)

## Support

For issues or questions:
- Check the PRD for feature specifications
- Review Supabase README for database questions
- Consult Next.js docs for framework questions

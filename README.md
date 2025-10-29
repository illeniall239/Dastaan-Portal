# Dastaan Portal - Story Development Management System

A comprehensive web-based content management system that transforms the story development process from initial pitch to final payment with complete visibility and streamlined workflow.

**Dastaan Portal** (داستان - "Story" in Urdu) - Where stories come to life.

## Tech Stack

- **Frontend:** Next.js 15 (React 19), TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui, Radix UI
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Email:** Resend
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Deployment:** Vercel

## Features

- 8-stage story workflow management
- Multi-role access control (Content Creators, Managers, Evaluators, Executives, Legal, Finance)
- Admin-controlled user management (no self-service signup)
- Structured evaluation system with scoring criteria
- Payment tracking and milestone management
- Real-time dashboards and analytics
- Complete audit trail
- File upload and management
- Email notifications

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Resend account (for emails)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy .env.example to .env.local and fill in your values
cp .env.example .env.local
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Required environment variables (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `RESEND_API_KEY` - Your Resend API key
- `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for development)

## Project Structure

```
├── app/                      # Next.js App Router pages
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── ...                   # Custom components
├── lib/
│   ├── supabase/             # Supabase client utilities
│   └── utils.ts              # Utility functions
├── types/                    # TypeScript type definitions
├── hooks/                    # Custom React hooks
└── middleware.ts             # Next.js middleware (auth)
```

## Development Phases

### Phase 1: Foundation & Core Workflow (Days 1-7)
- [x] Project setup and infrastructure
- [x] Authentication system
- [ ] Story submission workflow
- [ ] Call report creation
- [ ] Evaluation system

### Phase 2: Extended Workflow & Business Logic (Days 8-11)
- [ ] Approval workflow
- [ ] Negotiation tracking
- [ ] Legal review process
- [ ] Contract management
- [ ] Payment tracking

### Phase 3: Visibility & Intelligence Layer (Days 12-15)
- [ ] Dashboard and analytics
- [ ] Archive system
- [ ] Email notifications
- [ ] Reports and exports

## Documentation

- [Product Requirements Document](./PRD.md)
- [Software Requirements Specification](./Software%20Requirements%20Specification.txt)

## License

Private - All rights reserved

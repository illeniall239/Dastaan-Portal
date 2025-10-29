# Product Requirements Document (PRD)
## Content Management System - Story Development Portal

**Version:** 1.0
**Date:** October 2025
**Product Manager:** Content Portal Team
**Target Launch:** 15 Days (3 Phases)
**Expected Users:** 50-100 (scalable to 1,000+)

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [User Personas](#3-user-personas)
4. [PHASE 1: Foundation & Core Workflow](#phase-1-foundation--core-workflow-days-1-7)
5. [PHASE 2: Extended Workflow & Business Logic](#phase-2-extended-workflow--business-logic-days-8-11)
6. [PHASE 3: Visibility & Intelligence Layer](#phase-3-visibility--intelligence-layer-days-12-15)
7. [Technical Architecture](#7-technical-architecture)
8. [Database Schema](#8-database-schema)
9. [Security & Permissions](#9-security--permissions)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Risk Management](#11-risk-management)
12. [Appendices](#12-appendices)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
Build a web-based content management system that transforms the chaotic, email-based story development process into a streamlined, transparent workflow - enabling a media organization to track every story from initial pitch to final payment with complete visibility into status, bottlenecks, and decisions.

### 1.2 The Problem
**Current State Pain Points:**
- 📧 Story submissions lost in email threads and spreadsheets
- 🔍 Zero visibility into evaluation status or decision reasons
- 💰 Payment delays without clear accountability (20% miss deadlines)
- 📊 No data-driven insights into content pipeline performance
- 🤝 Frequent miscommunication between departments
- ⏱️ Average 45 days from submission to contract (too slow)

### 1.3 The Solution
**A centralized platform where:**
- ✅ Every story follows a clear 8-stage workflow with automated routing
- 🔎 Stakeholders drill down to understand "why, when, who" for any action
- 💳 Payments tracked automatically with milestone-based releases
- 📈 Real-time dashboards provide instant pipeline visibility
- 📝 Complete audit trail ensures nothing falls through cracks
- 🎯 25-day average time to contract (45% improvement)

### 1.4 Success Metrics (90-Day Targets)
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Time to Contract | 45 days | 25 days | 45% faster |
| Payment Delays | 20% | 0% | Zero missed deadlines |
| Pipeline Visibility | 0% | 100% | Full transparency |
| User Self-Service | 40% | 80% | Less support needed |
| Evaluation Consistency | 60% | 95% | Standardized scoring |

### 1.5 Phased Delivery Approach

**Phase 1 (Days 1-7):** Foundation & Core Workflow
- Setup, authentication, story submission, evaluation system

**Phase 2 (Days 8-11):** Extended Workflow & Business Logic
- Approvals, negotiation, legal review, contracts, payments

**Phase 3 (Days 12-15):** Visibility & Intelligence Layer
- Dashboard, analytics, archive, notifications, polish

---

## 2. PRODUCT VISION & STRATEGY

### 2.1 Strategic Objectives

**Primary Goal:** Reduce operational friction in content pipeline by 50%

**Secondary Goals:**
1. **Transparency:** Every stakeholder knows exactly what's happening, when, and why
2. **Accountability:** Clear ownership at every stage with audit trail
3. **Speed:** Reduce time from idea to production by 45%
4. **Quality:** Consistent evaluation criteria and structured feedback
5. **Financial Control:** Zero payment delays, complete budget visibility

### 2.2 Product Principles

1. **Simplicity First:** Low-tech users should complete tasks without training
2. **Mobile-Friendly:** Executives approve on-the-go from phones
3. **Drill-Down Everything:** Every metric clicks through to details
4. **Auto-Save Always:** Never lose work due to connection issues
5. **Notify Proactively:** Tell users what needs attention before they ask
6. **Audit Everything:** Complete trail of who did what and when

### 2.3 Out of Scope (Won't Build)

❌ Payment processing (tracking only, not execution)
❌ Script writing tools (upload only)
❌ Production scheduling
❌ AI-powered features
❌ Native mobile apps (web-responsive only)
❌ Video/media playback

---

## 3. USER PERSONAS

### 3.1 Content Creator
**Profile:** Sara Ahmed, 28, Story Writer
**Tech Skill:** Low
**Goals:** Submit ideas easily, track status, understand feedback
**Pain Points:** Ideas get lost, unclear rejection reasons, no visibility
**Success = Can submit story in < 5 minutes without help**

### 3.2 Content Manager
**Profile:** Ali Khan, 35, Senior Content Manager
**Tech Skill:** Medium
**Goals:** Coordinate meetings, create reports, manage pipeline
**Pain Points:** Manual tracking, chasing updates, data scattered
**Success = Complete call report in < 10 minutes, see all stories at a glance**

### 3.3 Evaluator
**Profile:** Dr. Fatima Hassan, 42, Creative Director
**Tech Skill:** Low-Medium
**Goals:** Review stories efficiently, provide structured feedback
**Pain Points:** Inconsistent criteria, missing context, manual forms
**Success = Complete evaluation in < 15 minutes with clear guidance**

### 3.4 Executive
**Profile:** Imran Malik, 50, CEO
**Tech Skill:** Low
**Goals:** Quick approve/reject, big picture view, budget oversight
**Pain Points:** Too much detail, can't see trends, slow decision requests
**Success = Approve one-liner in < 2 minutes from mobile**

### 3.5 Legal Team
**Profile:** Ayesha Siddiqui, 38, Legal Counsel
**Tech Skill:** Medium
**Goals:** Verify compliance, track docs, approve contracts
**Pain Points:** Missing documents, unclear requirements, manual checklists
**Success = Complete legal review in < 5 days with digital checklist**

### 3.6 Finance Team
**Profile:** Hassan Raza, 33, Finance Officer
**Tech Skill:** Medium
**Goals:** Track payments, process milestones, monitor budget
**Pain Points:** Manual tracking, missed milestones, unclear approvals
**Success = Process payment in < 2 days with clear approval chain**

### 3.7 Stakeholder/Admin
**Profile:** Nadia Chaudhry, 45, COO
**Tech Skill:** High
**Goals:** Complete visibility, identify bottlenecks, data-driven decisions
**Pain Points:** No unified view, can't drill down, reactive not proactive
**Success = Answer any "status?" question in < 30 seconds via dashboard**

---

## PHASE 1: FOUNDATION & CORE WORKFLOW (Days 1-7)

### Phase 1 Objectives
✅ Establish technical foundation
✅ Implement user authentication & authorization
✅ Build story submission to evaluation pipeline
✅ Create multi-evaluator workflow with decision logic
✅ Set up basic notification system

### Phase 1 Deliverables

#### 1.1 Project Setup & Infrastructure (Day 1-2)

**Technical Setup:**
- [x] Next.js 14+ project with TypeScript & App Router
- [x] Tailwind CSS configuration
- [x] Supabase project creation & configuration
- [x] Database schema implementation
- [x] Row Level Security (RLS) policies
- [x] shadcn/ui integration
- [x] Development environment setup

**Acceptance Criteria:**
- Project runs locally on `localhost:3000`
- Supabase connection established
- Environment variables configured
- Git repository initialized
- README with setup instructions

**User Story US-1.1: Developer Environment**
```
As a Developer
I want a properly configured development environment
So that I can build features efficiently

Acceptance:
- npm run dev starts app successfully
- TypeScript compiles without errors
- Supabase client connects to database
- Hot reload works properly
```

---

#### 1.2 Authentication & User Management (Day 2)

**Features:**
- Email/password authentication
- Role-based access control (7 roles)
- User profile management
- Session management
- Logout functionality

**User Roles:**
1. Content Creator
2. Content Manager
3. Evaluator
4. Executive
5. Legal Team
6. Finance Team
7. Stakeholder/Admin

**User Story US-1.2: User Login**
```
As a User
I want to log in with my email and password
So that I can access the system securely

Acceptance:
- Login form with email/password fields
- Form validation (email format, required fields)
- Secure password handling (hashed, never plain text)
- Session created on successful login
- Redirect to dashboard after login
- Error message on failed login
- "Forgot password" link (basic implementation)
```

**User Story US-1.3: Role-Based Access**
```
As a System Administrator
I want users to have specific permissions based on their role
So that data security is maintained

Acceptance:
- User assigned to one role
- Navigation menu shows only relevant sections per role
- API endpoints enforce role permissions via RLS
- Unauthorized access shows 403 error
- Audit log captures access attempts
```

**Database Tables:**
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- Content Creator, Manager, etc.
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
)

roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB
)
```

---

#### 1.3 Story Submission (Day 3)

**Features:**
- Story submission form
- File upload (multi-file support)
- Auto-generated Story ID
- Draft auto-save (every 2 minutes)
- Validation & error handling

**User Story US-1.4: Submit Story Idea**
```
As a Content Creator
I want to submit a story idea with all relevant details
So that it enters the evaluation pipeline

Acceptance:
- Form includes all required fields:
  * Title (text, max 200 chars)
  * Category (External Producer/Writer Pitch/In-house)
  * Writer/Originator Name
  * Suggested Writer (optional)
  * Synopsis (rich text, max 2000 chars)
  * Genre (Drama/Comedy/Action/Thriller/Romance/Documentary/Reality/Other)
  * Target Audience (text, max 500 chars)
- File upload supports PDF, DOC, DOCX
- Multiple files allowed (max 25MB per file, 100MB total)
- Required fields validated before submission
- Receives unique Story ID (STR-YYYY-NNNN format)
- Email confirmation sent after submission
- Redirected to story detail page
- Story appears in "My Submissions" list
```

**User Story US-1.5: View My Submissions**
```
As a Content Creator
I want to see all my submitted stories
So that I can track their progress

Acceptance:
- List shows all stories by logged-in user
- Each row displays: Story ID, Title, Category, Current Stage, Status, Date
- List sortable by any column
- Filterable by: Status, Category, Date Range, Current Stage
- Search by title or Story ID
- Click row to view full details
- Color-coded status badges
```

**Database Tables:**
```sql
stories (
  id UUID PRIMARY KEY,
  story_id TEXT UNIQUE, -- STR-YYYY-NNNN
  title TEXT NOT NULL,
  logged_by TEXT NOT NULL,
  category TEXT NOT NULL, -- External Producer, Writer Pitch, In-house
  writer_originator_name TEXT NOT NULL,
  suggested_writer TEXT,
  synopsis TEXT NOT NULL,
  genre TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  current_stage TEXT DEFAULT 'submitted',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

attachments (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL, -- 'story', 'call_report', 'contract', etc.
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 1.4 Call Report Creation (Day 4)

**Features:**
- Meeting scheduling interface
- Comprehensive call report form
- Auto-population from story data
- POC selection based on category
- Draft auto-save

**User Story US-1.6: Schedule Meeting**
```
As a Content Manager
I want to schedule a meeting with the relevant POC
So that we can discuss the story idea

Acceptance:
- System displays story category prominently
- Can select POC based on category:
  * External Producer → External Relations POC
  * Writer Pitch → Writer Relations POC
  * In-house Content → Content Department POC
- Meeting details form:
  * Date & Time (datetime picker)
  * Location/Link (text)
  * Duration (30min/1hr/1.5hr/2hr)
  * Additional Attendees (multi-select)
  * Agenda (optional text area)
- Email invitation sent to all participants
- Meeting status tracked (Scheduled/Completed/Cancelled)
- Can reschedule or cancel
```

**User Story US-1.7: Create Call Report**
```
As a Content Manager
I want to create a detailed call report after the meeting
So that evaluators have complete context

Acceptance:
- Form auto-populated with:
  * Story title, writer name, meeting date from scheduling
- Required fields:
  * Call Report ID (auto: CR-YYYY-NNNN)
  * Working Title (editable)
  * Logline (max 500 chars)
  * USP - Unique Selling Proposition (max 1000 chars)
  * Target Audience (max 500 chars)
  * Meeting Notes (rich text, max 5000 chars)
  * Contact Info (email, phone, address)
  * Contact Type (Direct/Agent/Production Company/Other)
  * Meeting Attendees (from scheduling, editable)
- Can attach additional documents
- Auto-save every 2 minutes
- Status options: Draft/Ready for Evaluation/In Review
- When set to "Ready for Evaluation":
  * Validates all required fields
  * Triggers evaluator assignment workflow
  * Sends notifications to evaluators
  * Updates story status to "In Evaluation"
```

**Database Tables:**
```sql
call_reports (
  id UUID PRIMARY KEY,
  call_report_id TEXT UNIQUE, -- CR-YYYY-NNNN
  story_id UUID REFERENCES stories(id),
  meeting_date TIMESTAMP,
  writer_name TEXT NOT NULL,
  contact_type TEXT, -- Direct/Agent/Production Company/Other
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  working_title TEXT NOT NULL,
  logline TEXT NOT NULL,
  usp TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  meeting_notes TEXT NOT NULL,
  meeting_attendees TEXT[],
  next_steps TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 1.5 Evaluation Workflow (Day 5-7)

**Features:**
- Multi-evaluator assignment
- Structured evaluation form (8 criteria scoring)
- Individual evaluator forms
- Evaluation log & aggregation
- Automated decision logic
- Auto-routing based on decision

**User Story US-1.8: Assign Evaluators**
```
As a Content Manager
I want to assign multiple evaluators to review a story
So that we get diverse perspectives

Acceptance:
- Can select 1-10 evaluators from dropdown
- Evaluators filtered by genre expertise (optional)
- Can set due date for evaluation
- Can set priority (High/Medium/Low)
- System sends email to each evaluator with:
  * Story details
  * Call report
  * Attachments
  * Evaluation form link
- Evaluators see task in their "My Tasks" dashboard
- Assignment logged in audit trail
```

**User Story US-1.9: Complete Evaluation**
```
As an Evaluator
I want to score a story across defined criteria
So that I can provide structured feedback

Acceptance:
- Evaluation form shows:
  * All story details (title, synopsis, genre, etc.)
  * Full call report
  * All attachments with download links
- Scoring section with 8 criteria (1-10 scale each):
  1. Originality
  2. Market Potential
  3. Execution Feasibility
  4. Target Audience Appeal
  5. Budget Viability
  6. Cultural Relevance
  7. Competitive Advantage
  8. Production Complexity (lower is better)
- Each criterion has:
  * Slider or number input (1-10)
  * Comments field (optional)
- Overall assessment fields:
  * Total Score (auto-calculated sum)
  * Average Score (auto-calculated)
  * Target Writer/Writer's Detail (text area)
  * Per Episode Price Range (Min-Max)
  * Overall Comments (required, max 2000 chars)
  * Strengths (optional, max 1000 chars)
  * Weaknesses (optional, max 1000 chars)
  * Key Changes Required (optional)
- Decision (required):
  * ✅ Approve - Recommend for One-Liner
  * ❌ Reject - Not Suitable
  * ⏸️ Need More Information
- Can save draft and complete later
- Confirmation shown on submission
- Cannot edit after submission
```

**User Story US-1.10: View Evaluation Log**
```
As a Content Manager
I want to see aggregated evaluation results
So that I understand the overall decision

Acceptance:
- Evaluation Log shows:
  * List of all evaluators
  * Individual scores per criterion (table view)
  * Individual total scores
  * Individual decisions (Approve/Reject/Need Info)
  * Individual comments
- Aggregated metrics:
  * Average score across all evaluators
  * Median score
  * Approval rate (% who approved)
  * Rejection rate (% who rejected)
  * Need info rate (% who need more info)
- Visual representation (chart showing score distribution)
- Can export log as PDF
```

**User Story US-1.11: Automated Decision Logic**
```
As a System
I want to automatically determine the outcome based on evaluator responses
So that the workflow advances without manual intervention

Decision Rules:
Primary (Unanimous/Majority):
- IF all evaluators approve → APPROVED → Move to One-Liner
- IF all evaluators reject → REJECTED → Move to Archive
- IF majority approve (>50%) → APPROVED → Move to One-Liner
- IF majority reject (>50%) → REJECTED → Move to Archive
- IF any evaluator selects "Need More Info" → PENDING → Request additional info
- IF split decision (50-50) → PENDING → Escalate to Content Manager

Secondary (Score Threshold):
- IF average score ≥ 7.0 AND majority approve → APPROVED
- IF average score < 5.0 → REJECTED (regardless of votes)
- IF average score 5.0-6.9 → Use majority vote logic

Routing Actions:
- IF APPROVED:
  * Update workflow status to "One-Liner Approval"
  * Notify Executives
  * Create One-Liner task
  * Log approval decision
- IF REJECTED:
  * Update workflow status to "Archived - Rejected at Evaluation"
  * Notify Story Creator and Content Manager
  * Move to Archive with reasons
- IF PENDING:
  * Notify Content Manager
  * Content Manager contacts writer for clarification
  * After info received, loop back to evaluators
```

**Database Tables:**
```sql
evaluator_forms (
  id UUID PRIMARY KEY,
  form_id TEXT UNIQUE, -- EF-YYYY-NNNN
  call_report_id UUID REFERENCES call_reports(id),
  evaluator_id UUID REFERENCES users(id),
  meeting_time TIMESTAMP,
  writer_name TEXT,
  -- Criteria scores
  originality_score INT CHECK (originality_score BETWEEN 1 AND 10),
  market_potential_score INT CHECK (market_potential_score BETWEEN 1 AND 10),
  execution_feasibility_score INT CHECK (execution_feasibility_score BETWEEN 1 AND 10),
  audience_appeal_score INT CHECK (audience_appeal_score BETWEEN 1 AND 10),
  budget_viability_score INT CHECK (budget_viability_score BETWEEN 1 AND 10),
  cultural_relevance_score INT CHECK (cultural_relevance_score BETWEEN 1 AND 10),
  competitive_advantage_score INT CHECK (competitive_advantage_score BETWEEN 1 AND 10),
  production_complexity_score INT CHECK (production_complexity_score BETWEEN 1 AND 10),
  -- Calculated scores
  total_score INT,
  average_score DECIMAL(3,1),
  -- Additional fields
  target_writer_detail TEXT,
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  overall_comments TEXT NOT NULL,
  strengths TEXT,
  weaknesses TEXT,
  key_changes TEXT,
  decision TEXT NOT NULL, -- 'approve', 'reject', 'need_info'
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
)

evaluation_logs (
  id UUID PRIMARY KEY,
  call_report_id UUID REFERENCES call_reports(id),
  evaluator_forms UUID[], -- Array of form IDs
  aggregate_average_score DECIMAL(3,1),
  aggregate_median_score DECIMAL(3,1),
  approval_count INT,
  rejection_count INT,
  need_info_count INT,
  total_evaluators INT,
  final_decision TEXT, -- 'approved', 'rejected', 'pending'
  decision_logic_used TEXT, -- Description of which rule was applied
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 1.6 Basic Notification System (Day 7)

**Features:**
- Email notifications for key events
- In-app notification bell
- Notification preferences (basic)

**User Story US-1.12: Receive Notifications**
```
As a User
I want to be notified when an action requires my attention
So that I don't miss important tasks

Acceptance:
- Email sent for:
  * Story submitted (to Content Manager)
  * Call report ready (to assigned Evaluators)
  * Evaluation completed (to Content Manager)
  * Decision made (to Story Creator)
- Email includes:
  * Clear subject line
  * Summary of action
  * Call-to-action button (link to relevant page)
  * Sender info and unsubscribe link
- In-app notification bell shows:
  * Unread count badge
  * Last 10 notifications in dropdown
  * Click to go to related item
  * Mark as read/unread
- Notification types color-coded:
  * 🔵 Info (blue): New submission
  * 🟢 Success (green): Approved
  * 🟡 Warning (yellow): Overdue
  * 🔴 Error (red): Rejected
```

**Database Tables:**
```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT, -- 'story', 'evaluation', etc.
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

### Phase 1 Exit Criteria

✅ All Phase 1 features tested and working
✅ Users can submit stories and track status
✅ Content Managers can create call reports
✅ Evaluators can score stories
✅ Automated decision logic routes stories correctly
✅ Basic notifications sent for key events
✅ Database has RLS policies protecting data
✅ Code reviewed and documented
✅ Demo-ready for stakeholders

---

## PHASE 2: EXTENDED WORKFLOW & BUSINESS LOGIC (Days 8-11)

### Phase 2 Objectives
✅ Complete the full 8-stage workflow
✅ Implement negotiation and legal review
✅ Build contract management system
✅ Create payment tracking with milestone-based releases
✅ Implement scripting phase (6 steps)

### Phase 2 Deliverables

#### 2.1 One-Liner Approval (Day 8)

**Features:**
- Auto-generated one-liner document
- Executive approval interface
- Decision routing

**User Story US-2.1: Review One-Liner**
```
As an Executive
I want to review a concise one-liner summary
So that I can make quick approve/reject decisions

Acceptance:
- One-liner document auto-generated containing:
  * Story Title
  * One-Liner Summary (max 150 chars, from logline)
  * Writer Name
  * Suggested Price Range (from evaluator forms)
  * Average Evaluation Score
  * Number of Evaluators Approved
  * Key Strengths (from evaluation feedback)
  * Estimated Budget
  * Target Delivery Timeline
  * Links to full Call Report and evaluation details
- Approval interface shows:
  * One-liner document (read-only)
  * Quick access buttons to supporting docs
  * Historical context (similar projects if any)
- Decision options:
  * ✅ Approve - Proceed to Negotiation
  * ❌ Reject - Decline project
  * ⏸️ Request More Info
- Additional fields:
  * Decision Notes (required for Reject, optional for Approve)
  * Budget Approval checkbox (required for Approve)
  * Conditions/Caveats (optional text area)
  * Priority Level (High/Medium/Low)
- Can complete on mobile
- Decision time logged (should be < 5 minutes)
```

**Routing Logic:**
- IF APPROVED:
  * Status → "Negotiation"
  * Notify Content Manager
  * Create negotiation task
  * Log approval
- IF REJECTED:
  * Status → "Archived - Rejected at One-Liner"
  * Notify all stakeholders
  * Move to Archive
- IF MORE INFO:
  * Return to Content Manager
  * Can update Call Report
  * Returns to executive for re-review

**Database Tables:**
```sql
one_liners (
  id UUID PRIMARY KEY,
  story_id UUID REFERENCES stories(id),
  one_liner_summary TEXT NOT NULL,
  writer_name TEXT,
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  avg_eval_score DECIMAL(3,1),
  approvals_count INT,
  key_strengths TEXT[],
  estimated_budget DECIMAL(12,2),
  target_timeline TEXT,
  status TEXT DEFAULT 'pending',
  decision TEXT, -- 'approved', 'rejected', 'more_info'
  decision_notes TEXT,
  budget_approved BOOLEAN,
  conditions TEXT,
  priority TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 2.2 Negotiation Phase (Day 8)

**Features:**
- Negotiation terms form
- Status tracking
- Negotiation history log

**User Story US-2.2: Negotiate Terms**
```
As a Content Manager
I want to negotiate terms with the writer/producer
So that we agree on price, timeline, and scope

Acceptance:
- Negotiation form includes:
  Financial Terms:
  * Proposed Price (per episode OR total project OR both)
  * Payment Structure (Per Episode/Milestone-based/Upfront+Completion/Custom)
  * Currency (USD, EUR, PKR, etc.)
  * Price Justification (text area)

  Timeline:
  * Expected Start Date
  * Expected Completion Date
  * Script Delivery Milestones (First Draft/Revisions/Final)

  Terms & Conditions:
  * Scope of Work (episodes count, duration, deliverables, revisions)
  * IP Rights (Full Transfer/Shared/Licensed)
  * Exclusivity Clause (yes/no)
  * Confidentiality Requirements
  * Additional Terms

  Negotiation Notes:
  * Meeting notes (rich text)
  * Negotiation history (auto-logged):
    - Date of each discussion
    - Topics discussed
    - Agreements reached
    - Outstanding issues
  * Attachments (emails, draft agreements)

- Status tracking:
  * In Progress
  * Terms Agreed
  * Pending Final Approval
  * Failed/Abandoned

- Tracks:
  * Number of negotiation rounds
  * Duration of negotiation
  * Changes made to terms
  * Who made each change

- When "Terms Agreed":
  * Requires confirmation checkboxes:
    - All financial terms finalized
    - Timeline confirmed
    - Scope of work clear
    - Writer/Producer agreed
  * Generates negotiation summary document
  * Routes to Legal Review

- If "Failed":
  * Reason required
  * Story archived
  * All stakeholders notified
```

**Database Tables:**
```sql
negotiations (
  id UUID PRIMARY KEY,
  negotiation_id TEXT UNIQUE, -- NEG-YYYY-NNNN
  story_id UUID REFERENCES stories(id),
  writer_producer_name TEXT,
  -- Financial
  proposed_price DECIMAL(12,2),
  payment_structure TEXT,
  currency TEXT,
  price_justification TEXT,
  -- Timeline
  expected_start_date DATE,
  expected_completion_date DATE,
  milestones JSONB,
  -- Terms
  scope_of_work TEXT,
  ip_rights TEXT,
  exclusivity_clause BOOLEAN,
  confidentiality_requirements TEXT,
  additional_terms TEXT,
  -- Tracking
  status TEXT DEFAULT 'in_progress',
  negotiation_rounds INT DEFAULT 0,
  negotiation_history JSONB[],
  terms_agreed BOOLEAN DEFAULT FALSE,
  failed_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 2.3 Legal Review & Vetting (Day 9)

**Features:**
- Digital compliance checklist
- Document upload & verification
- Legal decision workflow

**User Story US-2.3: Legal Review**
```
As a Legal Team Member
I want to review compliance requirements and verify documents
So that we can approve the contract with confidence

Acceptance:
- Legal Review form includes:

  Pakistani Legal Checklist:
  Individual Writer/Producer:
  ✓ NIC/CNIC (upload + verify)
  ✓ NTN (provide + FBR verification)
  ✓ Bank Account Details (validate)
  ✓ Previous Work Portfolio (review)
  ✓ Professional References (optional)

  Company/Production House:
  ✓ Company Registration Certificate
  ✓ NTN (Company)
  ✓ Sales Tax Registration
  ✓ Board Resolution for Contract Authority
  ✓ Authorized Signatory Details
  ✓ Company Bank Account Details
  ✓ Financial Statements (Last 2 years)

  Legal Documents:
  ✓ Draft Contract Prepared
  ✓ IP Terms Clear
  ✓ Payment Terms Legally Sound
  ✓ Termination Clauses Included
  ✓ Dispute Resolution Defined
  ✓ Confidentiality Agreement Signed
  ✓ Non-Compete Clause (if applicable)

  Compliance:
  ✓ AML Check Completed
  ✓ Sanctions List Check (OFAC, UN)
  ✓ Background Verification
  ✓ Copyright Clearance
  ✓ Prior Claims Check

- For each checklist item:
  * Upload supporting document
  * Mark as: Verified/Not Verified/Pending
  * Add notes/comments
  * Set priority: Critical/Important/Nice-to-have

- Enforcement:
  * All "Critical" items must be verified before approval
  * Documents stored securely
  * Access restricted to Legal + Finance teams

- Decision options:

  ✅ APPROVE:
  * All critical requirements met
  * All documents verified
  * Risk Assessment (Low/Medium/High)
  * Final Legal Notes
  * Special Conditions (optional)
  * Routes to Contract Signing

  ❌ REJECT:
  * Critical requirements not met
  * Rejection Reason (min 100 chars)
  * Missing Requirements list
  * Recommendations
  * Story archived

  ⏸️ REFUSE (Missing Docs):
  * List of Missing Items (auto from checklist)
  * Deadline to Provide (date picker)
  * Instructions to Writer
  * Returns to Content Manager to collect items
  * Re-review when docs received

  🔄 REQUEST MODIFICATIONS:
  * Terms need adjustment
  * Modifications Required (detailed)
  * Legal Concerns
  * Suggested Changes
  * Returns to Negotiation stage
```

**Database Tables:**
```sql
legal_reviews (
  id UUID PRIMARY KEY,
  legal_review_id TEXT UNIQUE, -- LR-YYYY-NNNN
  story_id UUID REFERENCES stories(id),
  negotiation_id UUID REFERENCES negotiations(id),
  assigned_to UUID REFERENCES users(id),
  review_start_date TIMESTAMP DEFAULT NOW(),
  -- Checklist (JSONB for flexibility)
  checklist JSONB, -- {item: {verified: bool, document_id: uuid, notes: text, priority: text}}
  checklist_completion_percentage INT,
  -- Decision
  decision TEXT, -- 'approved', 'rejected', 'refused', 'modifications'
  risk_assessment TEXT, -- 'low', 'medium', 'high'
  final_legal_notes TEXT,
  special_conditions TEXT,
  rejection_reason TEXT,
  missing_requirements TEXT[],
  recommendations TEXT,
  modifications_required TEXT,
  legal_concerns TEXT,
  -- Tracking
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  days_in_review INT,
  created_at TIMESTAMP DEFAULT NOW()
)

legal_documents (
  id UUID PRIMARY KEY,
  legal_review_id UUID REFERENCES legal_reviews(id),
  checklist_item TEXT,
  document_type TEXT, -- 'NIC', 'NTN', 'Bank Details', etc.
  file_id UUID REFERENCES attachments(id),
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP,
  notes TEXT,
  priority TEXT
)
```

---

#### 2.4 Contract Management (Day 10)

**Features:**
- Contract generation & information form
- Signing workflow
- Document management

**User Story US-2.4: Create Contract**
```
As a Legal Team Member
I want to generate and manage the formal contract
So that all parties can sign and proceed

Acceptance:
- Contract auto-generated using:
  * Organization template
  * Negotiated terms (price, timeline, scope)
  * Legal requirements (clauses, conditions)
  * Writer/Producer details
  * One-liner (as annexure)

- Contract Information Form:
  * Contract ID (auto: CNT-YYYY-NNNN)
  * Contract Type (Script Writing/Production Services/Content Licensing/Other)
  * Parties:
    - Party A: Company Name (auto)
    - Party A Rep (authorized signatories dropdown)
    - Party B: Writer/Producer Name (auto)
    - Party B NIC/NTN (auto from legal review)

  * Scope of Work:
    - Project Title
    - Number of Episodes
    - Episode Duration
    - Deliverables (detailed list)
    - Delivery Format (PDF, Final Draft, etc.)
    - Language (English/Urdu/Other)

  * Financial Terms:
    - Total Contract Value
    - Currency (PKR/USD/EUR)
    - Payment Structure (Milestone/Per Episode/Upfront+Completion/Custom)
    - Payment Terms (detailed breakdown)
    - Tax Treatment (Inclusive/Exclusive/TDS)
    - Withholding Tax %

  * Timeline:
    - Start Date
    - End Date
    - Key Milestones (repeatable):
      * Milestone Name
      * Delivery Date
      * Payment Amount
      * Payment Due Date

  * Intellectual Property:
    - IP Ownership (Full transfer/Shared/Licensed)
    - Rights Included (Broadcast/Digital/International/Merchandising/Remake/Adaptation)
    - Territory (Worldwide/Specific regions)
    - Duration of Rights (Perpetual/Years)

  * Legal Clauses:
    - Confidentiality Clause (yes/no)
    - Non-Compete Period (months)
    - Termination Notice Period (days)
    - Force Majeure (yes/no)
    - Dispute Resolution (Arbitration/Court/Mediation)
    - Governing Law (Laws of Pakistan)
    - Jurisdiction (Courts of [City])

  * Additional:
    - Credits (how writer will be credited)
    - Warranty & Indemnity
    - Insurance Requirements
    - Special Conditions

- Document Management:
  * Upload final signed contract (PDF)
  * Version control:
    - Draft versions
    - Amendments
    - Final signed version
  * Each version has:
    - Version number
    - Upload date
    - Uploaded by
    - Status (Draft/Final/Amended)
  * All versions retained for audit

- Signing Process:
  * Track signing status per party:

    Company Representative:
    - Name (auto)
    - Designation
    - Signature Date
    - Digital Signature (upload)
    - Status: Pending/Signed

    Writer/Producer:
    - Name (auto)
    - NIC/NTN (auto)
    - Signature Date
    - Digital Signature (upload)
    - Status: Pending/Signed

    Witnesses (if required):
    - Witness 1: Name, NIC, Signature Date
    - Witness 2: Name, NIC, Signature Date

- Signing Methods:
  * Physical: Signed manually, scanned copy uploaded
  * Digital: E-signature integration (future)

- Post-Signing Actions (when all signed):
  * Status → "Contract Active"
  * Triggers Scripting Phase workflow
  * Notifies Finance to set up payment schedule
  * Sends confirmation emails with contract copy to:
    - Writer/Producer
    - Finance team
    - Legal team
    - Content Manager
    - All stakeholders
  * Creates calendar reminders for:
    - Milestone deadlines
    - Payment due dates
    - Contract renewal date
```

**Database Tables:**
```sql
contracts (
  id UUID PRIMARY KEY,
  contract_id TEXT UNIQUE, -- CNT-YYYY-NNNN
  story_id UUID REFERENCES stories(id),
  contract_type TEXT,
  -- Parties
  party_a_name TEXT,
  party_a_rep_id UUID REFERENCES users(id),
  party_b_name TEXT,
  party_b_nic TEXT,
  party_b_ntn TEXT,
  -- Scope
  project_title TEXT,
  episodes_count INT,
  episode_duration TEXT,
  deliverables JSONB,
  delivery_format TEXT,
  language TEXT,
  -- Financial
  total_value DECIMAL(12,2),
  currency TEXT,
  payment_structure TEXT,
  payment_terms TEXT,
  tax_treatment TEXT,
  withholding_tax_percentage DECIMAL(5,2),
  -- Timeline
  start_date DATE,
  end_date DATE,
  milestones JSONB[],
  -- IP
  ip_ownership TEXT,
  rights_included TEXT[],
  territory TEXT,
  rights_duration TEXT,
  -- Legal
  confidentiality_clause BOOLEAN,
  non_compete_period_months INT,
  termination_notice_days INT,
  force_majeure BOOLEAN,
  dispute_resolution TEXT,
  governing_law TEXT,
  jurisdiction TEXT,
  -- Additional
  credits TEXT,
  warranty_indemnity TEXT,
  insurance_requirements TEXT,
  special_conditions TEXT,
  -- Status
  status TEXT DEFAULT 'draft', -- draft, pending_signatures, active, completed, expired, terminated
  signed_date DATE,
  -- Signatures
  party_a_signed BOOLEAN DEFAULT FALSE,
  party_a_signature_date DATE,
  party_b_signed BOOLEAN DEFAULT FALSE,
  party_b_signature_date DATE,
  witness_1_name TEXT,
  witness_1_nic TEXT,
  witness_1_signature_date DATE,
  witness_2_name TEXT,
  witness_2_nic TEXT,
  witness_2_signature_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

contract_versions (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  version_number INT,
  file_id UUID REFERENCES attachments(id),
  status TEXT, -- draft, final, amended
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP
)
```

---

#### 2.5 Payment Tracking (Day 10-11)

**Features:**
- Payment schedule setup (milestone-based)
- Milestone achievement tracking
- Payment processing workflow
- Approval chain

**User Story US-2.5: Set Up Payment Schedule**
```
As a Finance Team Member
I want to create a milestone-based payment schedule
So that payments are released as work progresses

Acceptance:
- Auto-triggered when contract signed
- Payment Schedule form:
  * Schedule ID (auto: PS-YYYY-NNNN)
  * Contract ID (auto-linked)
  * Writer/Producer Name (auto)
  * Total Contract Value (auto from contract)
  * Currency (auto from contract)
  * Payment Structure (auto from contract)

- Payment Milestones (Repeatable 1-10):
  Each milestone:
  * Milestone Number (1, 2, 3...)
  * Milestone Name (e.g., "Contract Signing", "First Draft", "Final Script")
  * Milestone Type (Contract Signing/Script Submission/Script Approval/Completion/Custom)
  * Linked To:
    - Specific scripting phase step, OR
    - Date-based, OR
    - Manual trigger
  * Payment Amount
  * Payment Percentage (auto: amount/total × 100)
  * Due Date (date picker OR auto from milestone)
  * Payment Terms (e.g., "Within 30 days of milestone")
  * Status:
    - Pending Milestone
    - Milestone Achieved
    - Payment Pending
    - Payment Processing
    - Payment Completed
    - Payment Failed
    - Payment Overdue

- Milestone Achievement:
  * System auto-detects when linked step completed
  * Sends notification to Finance team
  * Calculates payment due date
  * Creates payment task

- Manual achievement:
  * Finance can manually mark achieved
  * Requires reason/justification
  * Requires manager approval
```

**User Story US-2.6: Process Payment**
```
As a Finance Team Member
I want to process a payment when milestone achieved
So that writers are paid on time

Acceptance:
- Payment Processing Form (when milestone achieved):
  * Payment ID (auto: PAY-YYYY-NNNN)
  * Payment Schedule ID (auto-linked)
  * Milestone Name (auto)
  * Payment Amount (auto, editable if needed)

  * Beneficiary Details (auto from contract):
    - Name
    - Bank Name
    - Account Number
    - IBAN (if international)
    - Branch Code
    - Swift Code (if international)

  * Payment Method:
    - Bank Transfer
    - Check
    - Cash (small amounts only)
    - International Wire

  * Tax Deduction:
    - Withholding Tax % (auto from contract)
    - Tax Amount (auto-calculated)
    - Net Payment Amount (auto: amount - tax)

  * Payment Execution:
    - Payment Date (date picker)
    - Payment Reference Number (bank transaction ID)
    - Payment Proof (upload: receipt, transfer confirmation)
    - Payment Notes (internal)

  * Approval:
    - Processed By (auto, finance team member)
    - Approved By (dropdown, finance manager, required)
    - Status (auto-updated based on workflow)

- Two-Level Approval:
  Level 1: Finance Team Member
  * Prepares payment details
  * Validates bank details
  * Calculates tax deductions
  * Submits for approval

  Level 2: Finance Manager
  * Reviews payment details
  * Verifies milestone achievement
  * Checks budget availability
  * Approves or Rejects
    - If approved: Payment released
    - If rejected: Returns with reason

- For payments > threshold (e.g., $10,000):
  * Requires CFO/Executive approval (Level 3)
  * System enforces approval hierarchy

- Status Flow:
  1. Pending Milestone → Waiting for achievement
  2. Milestone Achieved → Finance notified
  3. Payment Pending Approval → Awaiting manager
  4. Payment Approved → Ready to release
  5. Payment Processing → Being processed by bank
  6. Payment Completed → Delivered to beneficiary
  7. Payment Failed → Issue occurred, needs resolution
  8. Payment Overdue → Due date passed

- For each status change:
  * Timestamp recorded
  * User recorded
  * Notification sent

- Notifications:
  To Writer/Producer:
  * Milestone achieved (payment processing)
  * Payment approved (expected date)
  * Payment completed (with receipt)
  * Payment delayed (reason + new date)

  To Finance Team:
  * Milestone achieved (action required)
  * Payment overdue
  * Payment failed (action required)
  * Approval needed

  To Stakeholders:
  * Weekly payment summary
  * Monthly financial report
  * Any payment issues/delays
```

**Database Tables:**
```sql
payment_schedules (
  id UUID PRIMARY KEY,
  schedule_id TEXT UNIQUE, -- PS-YYYY-NNNN
  contract_id UUID REFERENCES contracts(id),
  writer_producer_name TEXT,
  total_contract_value DECIMAL(12,2),
  currency TEXT,
  payment_structure TEXT,
  milestones JSONB[], -- Array of milestone objects
  created_at TIMESTAMP DEFAULT NOW()
)

payments (
  id UUID PRIMARY KEY,
  payment_id TEXT UNIQUE, -- PAY-YYYY-NNNN
  schedule_id UUID REFERENCES payment_schedules(id),
  milestone_number INT,
  milestone_name TEXT,
  milestone_type TEXT,
  linked_to TEXT, -- 'scripting_step_1', 'date_2025-11-30', 'manual'
  -- Amount
  payment_amount DECIMAL(10,2),
  payment_percentage DECIMAL(5,2),
  withholding_tax_percentage DECIMAL(5,2),
  tax_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  -- Beneficiary
  beneficiary_name TEXT,
  bank_name TEXT,
  account_number TEXT,
  iban TEXT,
  branch_code TEXT,
  swift_code TEXT,
  -- Payment
  payment_method TEXT,
  payment_date DATE,
  payment_reference TEXT,
  payment_proof_file_id UUID REFERENCES attachments(id),
  payment_notes TEXT,
  -- Status
  status TEXT DEFAULT 'pending_milestone',
  milestone_achieved_date DATE,
  due_date DATE,
  overdue_days INT,
  -- Approval
  prepared_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

payment_delays (
  id UUID PRIMARY KEY,
  payment_id UUID REFERENCES payments(id),
  reason TEXT, -- 'budget_unavailable', 'bank_delay', 'missing_docs', 'approval_pending', 'technical', 'other'
  description TEXT,
  expected_resolution_date DATE,
  actions_taken TEXT,
  status TEXT, -- 'investigating', 'in_progress', 'resolved'
  resolved_date DATE,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 2.6 Scripting Phase (Day 11)

**Features:**
- 6-step workflow (simplified for MVP)
- Script upload by writer
- Feedback form by reviewer
- Revision tracking
- Final approval

**User Story US-2.7: Scripting Workflow**
```
As a System
I want to manage the 6-step scripting process
So that scripts are developed with quality control

6 Steps:
1. First Episode Draft
2. Feedback via Scripting Template
3. 2nd Draft (incorporating feedback)
4. Next 4 Episodes Draft
5. Feedback & Approval
6. Final Script Approved

For MVP, simplified to:
- Step 1: Writer uploads first episode draft
- Step 2: Reviewer provides feedback
- Step 3: Writer uploads revised draft
- Step 4: Writer uploads episodes 2-5
- Step 5: Reviewer provides final feedback
- Step 6: Final approval (all scripts approved)

Acceptance:
- Each step has:
  * Script upload (writer)
  * Feedback form (reviewer)
  * Status tracking
  * Submission timestamps
  * Deadline tracking

- Step 1 - First Episode Draft:
  * Episode Number: 1
  * Draft Version: 1
  * Script Document upload (PDF/DOCX/FDX, max 50MB)
  * Page Count (auto-extract if possible)
  * Word Count (auto-extract if possible)
  * Writer's Notes (optional)
  * Status: "Submitted - Awaiting Feedback"
  * Notifies reviewer
  * Checks deadline compliance

- Step 2 - Feedback:
  * Reviewer completes feedback form
  * Structured categories (Story/Plot, Character, Structure, Dialogue, Technical, Production)
  * Each category: Score 1-10 + Comments
  * Overall Comments, Strengths, Weaknesses
  * Key Changes Required
  * Decision: Approve for Next Draft / Major Revisions / Reject
  * If Approved: Move to Step 3
  * If Major Revisions: Back to Step 1 with feedback

- Step 3-6: Similar pattern

- Final Approval (Step 6):
  * All episodes approved
  * Status → "Delivered - Complete"
  * Notifies Finance to release final payment
  * Archives scripts in production folder
  * Generates completion certificate
  * Updates stakeholder dashboard
```

**Database Tables:**
```sql
script_phases (
  id UUID PRIMARY KEY,
  phase_id TEXT UNIQUE, -- SP-YYYY-NNNN-S[1-6]
  contract_id UUID REFERENCES contracts(id),
  step_number INT CHECK (step_number BETWEEN 1 AND 6),
  episode_number INT,
  draft_version INT,
  -- Script
  script_file_id UUID REFERENCES attachments(id),
  page_count INT,
  word_count INT,
  scene_count INT,
  writer_notes TEXT,
  changes_made TEXT, -- For revision drafts
  response_to_feedback TEXT,
  -- Status
  status TEXT, -- 'not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'needs_revision', 'rejected'
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  deadline DATE,
  is_late BOOLEAN DEFAULT FALSE,
  delay_days INT,
  created_at TIMESTAMP DEFAULT NOW()
)

script_feedback (
  id UUID PRIMARY KEY,
  feedback_id TEXT UNIQUE, -- FB-YYYY-NNNN
  script_phase_id UUID REFERENCES script_phases(id),
  reviewer_id UUID REFERENCES users(id),
  review_date TIMESTAMP DEFAULT NOW(),
  -- Category Scores (1-10)
  story_plot_score INT,
  character_development_score INT,
  structure_score INT,
  dialogue_score INT,
  technical_format_score INT,
  production_feasibility_score INT,
  -- Calculated
  total_score INT,
  average_score DECIMAL(3,1),
  -- Feedback
  overall_comments TEXT,
  strengths TEXT,
  weaknesses TEXT,
  key_changes_required TEXT,
  -- Decision
  decision TEXT, -- 'approve', 'major_revisions', 'reject'
  annotated_script_file_id UUID REFERENCES attachments(id),
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

### Phase 2 Exit Criteria

✅ One-liner approval workflow functional
✅ Negotiation terms captured and tracked
✅ Legal review checklist operational with document upload
✅ Contract management complete with signing workflow
✅ Payment schedules created and tracked
✅ Milestone-based payment processing works
✅ Scripting phase tracks all 6 steps
✅ All workflows route correctly
✅ Database integrity maintained
✅ Integration tests passed

---

## PHASE 3: VISIBILITY & INTELLIGENCE LAYER (Days 12-15)

### Phase 3 Objectives
✅ Complete archive system for rejected items
✅ Build comprehensive stakeholder dashboard
✅ Implement drill-down capabilities
✅ Create analytics & reporting
✅ Polish notification system
✅ Testing, bug fixes, deployment

### Phase 3 Deliverables

#### 3.1 Archive System (Day 12)

**Features:**
- Rejected story storage with complete history
- Archive listing, search, and filtering
- Resubmission workflow

**User Story US-3.1: Archive Rejected Stories**
```
As a System
I want to move rejected stories to Archive with complete history
So that we can learn from rejections

Acceptance:
- Story archived when rejected at any stage:
  * After Evaluation (evaluators reject)
  * After One-Liner (executive rejects)
  * After Legal Review (legal issues)
  * After Negotiation (failed)
  * Manual rejection by authorized user

- Rejection Capture:
  * Rejection Stage (which stage rejected at)
  * Rejection Date (timestamp)
  * Rejected By (user name + role)
  * Rejection Reason (text area, min 100 chars)
  * Rejection Category:
    - Quality Issues
    - Budget Constraints
    - Market Fit
    - Legal/Compliance Issues
    - Writer/Producer Issues
    - Strategic Decision
    - Other (specify)
  * Can Resubmit (yes/no)
  * Resubmission Conditions (if allowed)

- All data retained:
  * Original story submission
  * Call Report (if created)
  * Evaluator forms (if completed)
  * All attachments
  * All comments/notes
  * Complete workflow history
  * All audit logs

- Archive metadata:
  * Archive ID (ARC-YYYY-NNNN)
  * Archive Date
  * Reason for Archive
  * Archived By
```

**User Story US-3.2: Search & Analyze Archive**
```
As a Stakeholder
I want to search and analyze rejected stories
So that we can identify patterns and improve

Acceptance:
- Archive Listing shows:
  * Story ID, Title, Submitted By
  * Submission Date, Rejection Date
  * Rejected At Stage
  * Rejection Reason (summary)
  * Rejected By
  * Can Resubmit (Yes/No flag)

- Search by:
  * Story title
  * Writer name
  * Story ID
  * Keywords in rejection reason

- Filter by:
  * Rejection stage
  * Rejection date (range)
  * Rejection category
  * Rejected by (user)
  * Can resubmit (yes/no)
  * Genre
  * Original submission date

- Sort by:
  * Newest to oldest rejection
  * Oldest to newest
  * By title (A-Z)
  * By rejection stage

- Detail View shows:
  Summary:
  * Story details (all original fields)
  * Journey timeline (visual)
  * Time in system (total days)
  * Final stage reached
  * Rejection info

  History Tab:
  * Chronological list of all actions
  * Each with date/time, action, by whom, details

  Documents Tab:
  * All uploaded/generated files
  * Download capability

  Feedback Tab:
  * All evaluator feedback
  * All reviewer comments
  * Organized by stage

  Rejection Details Tab:
  * Full rejection reason
  * Rejection category
  * Resubmit conditions
  * Additional context
```

**Database Tables:**
```sql
archive (
  id UUID PRIMARY KEY,
  archive_id TEXT UNIQUE, -- ARC-YYYY-NNNN
  story_id UUID REFERENCES stories(id),
  rejection_stage TEXT, -- 'evaluation', 'one_liner', 'legal', 'negotiation'
  rejection_date TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT NOT NULL,
  rejection_category TEXT,
  can_resubmit BOOLEAN DEFAULT FALSE,
  resubmission_conditions TEXT,
  time_in_system_days INT,
  archived_at TIMESTAMP DEFAULT NOW()
)

archive_notes (
  id UUID PRIMARY KEY,
  archive_id UUID REFERENCES archive(id),
  note_type TEXT, -- 'lessons_learned', 'why_rejected', 'future_consideration', 'pattern'
  note TEXT,
  added_by UUID REFERENCES users(id),
  visibility TEXT, -- 'internal', 'share_with_creator'
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

#### 3.2 Stakeholder Dashboard (Day 12-13)

**Features:**
- Pipeline overview with metrics
- Stage distribution charts
- Financial summary
- Drill-down capabilities
- Real-time updates

**User Story US-3.3: Stakeholder Dashboard Overview**
```
As a Stakeholder
I want to see the entire content pipeline at a glance
So that I can monitor performance and identify issues

Acceptance:
- High-Level Metrics (Top Cards):
  Idea Pipeline:
  * Total Active Stories (clickable → list)
  * Total Submissions This Month (with trend arrow)
  * Total Approved This Month (with trend arrow)
  * Total Rejected This Month (with trend arrow)
  * Approval Rate % (color-coded: green >70%, yellow 50-70%, red <50%)

  Financial:
  * Total Active Contracts (count)
  * Total Contract Value ($XXX,XXX)
  * Total Paid to Date ($XXX,XXX)
  * Total Pending Payments ($XXX,XXX)
  * Budget Utilization (XX% with progress bar)

  Time Metrics:
  * Average Time to Approval (X days)
  * Average Time in Evaluation (X days)
  * Average Scripting Duration (X days)
  * Longest Pending Story (X days with link)

- Current Stage Distribution:
  * Pie/Bar chart showing:
    - Stories in Call Report: X
    - Stories in Evaluation: X
    - Stories in One-Liner: X
    - Stories in Negotiation: X
    - Stories in Legal Review: X
    - Stories in Contract Signing: X
    - Stories in Scripting: X
    - Stories in Finance: X
  * Each segment clickable → drills down to story list

- Pipeline Funnel Visualization:
  ```
  Story Ideas Submitted: 100
  ↓ (85% conversion)
  Call Reports Created: 85
  ↓ (88% conversion)
  Evaluations Completed: 75
  ↓ (60% conversion)
  One-Liners Approved: 45
  ↓ (67% conversion)
  Contracts Signed: 30
  ↓ (50% conversion)
  Scripts Completed: 15
  ```
  * Shows count + % conversion from previous
  * Click any stage → see stories at that stage

- Conversion Rates:
  * Submission → Evaluation: XX%
  * Evaluation → One-Liner: XX%
  * One-Liner → Contract: XX%
  * Contract → Completion: XX%
```

**User Story US-3.4: Drill-Down - Why Rejected?**
```
As a Stakeholder
I want to understand why any story was rejected
So that I can identify patterns and provide guidance

Acceptance:
- Click rejected story → Rejection Details page shows:

  Who Disapproved:
  * Evaluator Name
  * Role
  * Date + Time

  Decision:
  * Decision type (Rejected)
  * Overall Score (X.X / 10)
  * Threshold (e.g., "Below threshold of 7.0")

  Individual Scores:
  * Originality: X/10
  * Market Potential: X/10 ← (highlighted if low)
  * Execution Feasibility: X/10
  * Budget Viability: X/10 ← (highlighted if low)
  * Cultural Relevance: X/10
  * Competitive Advantage: X/10
  * Production Complexity: X/10
  * Average: X.X/10

  Why Disapproved (Comments):
  * Full evaluator comments displayed
  * Weakness points highlighted
  * Key quotes shown

  Other Evaluators:
  * If multiple evaluators, show all decisions
  * Consensus indicator
  * Decision logic used

  Full Timeline:
  * Submitted: Date/Time
  * Call Report Created: Date/Time
  * Sent to Evaluators: Date/Time
  * Each Evaluator Reviewed: Date/Time + Decision
  * System Decision: Date/Time
  * Creator Notified: Date/Time
  * Archived: Date/Time
```

**User Story US-3.5: Drill-Down - Why Payment Stuck?**
```
As a Stakeholder
I want to understand why a payment is delayed
So that I can take corrective action immediately

Acceptance:
- Dashboard highlights overdue payments in RED
- Click payment → Payment Details page shows:

  Payment Information:
  * Payment ID
  * Contract ID (clickable)
  * Writer Name (clickable)
  * Amount ($XXX)
  * Due Date
  * Current Date
  * Days Overdue (RED highlighted)

  Why Stuck:
  * Current Status (exact status)
  * Stuck At (which approval level)
  * Stuck Since (date + days ago)

  Approval Chain:
  * ✓ Level 1: Prepared by [Name] (Finance Team) - Date/Time
  * ⏳ Level 2: Pending approval by [Name] (Finance Manager) - Sent Date
  * ⏸️ Level 3: Awaiting Level 2 (CFO approval required after)
  * Shows exactly who is blocking with name, role, contact

  Actions Taken:
  * Reminder #1 sent to [Name]: Date/Time
  * Reminder #2 sent to [Name]: Date/Time
  * Escalation email sent to [CFO]: Date/Time
  * List of all actions chronologically

  Next Steps:
  * Auto-escalation rule displayed
  * Contact info for blocker
  * Suggested action

  Why This Payment Needs Approval:
  * Amount exceeds threshold explanation
  * Milestone details
  * Payment calculation verification
  * Bank details verification status
  * Budget availability status

  Complete Timeline:
  * Milestone Achieved: Date/Time (trigger event)
  * Payment Request Auto-Created: Date/Time
  * Assigned to [Finance User]: Date/Time
  * [Finance User] Prepared Payment: Date/Time
  * Sent to [Manager] for Approval: Date/Time
  * STUCK HERE for X days
  * All reminders listed
  * Escalations listed
```

---

#### 3.3 Analytics & Reporting (Day 13-14)

**Features:**
- Pre-built reports
- Custom date ranges
- Export capabilities

**User Story US-3.6: Generate Reports**
```
As a Stakeholder
I want to generate various reports
So that I can analyze performance and present to management

Acceptance:
- Report Types:

  1. Pipeline Report:
  * Total submissions by month/quarter
  * Approval/Rejection rates by stage
  * Average time per stage
  * Bottleneck identification
  * Conversion funnel
  * Exportable as PDF/Excel

  2. Financial Report:
  * Total contracts active
  * Total contract value
  * Total paid to date
  * Total pending payments
  * Total overdue payments
  * Budget utilization
  * Tax deductions summary
  * Grouped by month/quarter/year
  * Exportable as PDF/Excel

  3. Performance Report:
  * Evaluator performance (count, avg score, avg time)
  * Reviewer performance (turnaround time)
  * Finance team performance (payment processing time)
  * Content Manager performance (call reports created)
  * Filterable by date range
  * Exportable as PDF/Excel

  4. Rejection Analysis:
  * Total rejections by stage
  * Rejection reasons (frequency)
  * Rejection rate by genre
  * Common patterns (word cloud)
  * Exportable as PDF/Excel

- All reports:
  * Customizable date ranges
  * Filterable by various criteria
  * Visual charts included
  * Print-friendly format
  * Exportable (PDF, Excel, CSV)
  * Shareable via email
```

---

#### 3.4 Notification System Enhancement (Day 14)

**Features:**
- Email templates for all events
- In-app notification improvements
- Notification preferences

**User Story US-3.7: Comprehensive Notifications**
```
As a User
I want to receive timely notifications for all important events
So that I never miss an action item

Acceptance:
- Email Notifications:
  * Professional template with company branding
  * Clear subject line
  * Summary of action
  * Call-to-action button (link to page)
  * Footer with contact and unsubscribe

- Email Events:
  1. Story submitted → Content Manager
  2. Call report ready → Evaluators
  3. Evaluation complete → Content Manager
  4. All evaluations done → Content Manager + Executive (if approved)
  5. One-liner approved → Content Manager
  6. Terms agreed → Legal Team
  7. Legal approved → Finance + Parties
  8. Contract signed → Writer + Finance + All
  9. Milestone achieved → Finance Team
  10. Payment overdue → Finance Manager + Escalate
  11. Story rejected → Creator with details
  12. Script submitted → Reviewer
  13. Feedback provided → Writer
  14. Deadline approaching → Assigned user

- Reminder Notifications:
  * Evaluation pending > 3 days → Remind evaluator
  * One-liner pending > 3 days → Remind executive
  * Legal review pending > 5 days → Remind legal team
  * Payment pending > 7 days → Escalate to CFO
  * Contract expiring < 30 days → Notify parties

- In-App Notifications:
  * Bell icon with unread count badge
  * Dropdown shows last 10 notifications
  * Color-coded by type (info/success/warning/error)
  * Click to go to related item
  * Mark as read/unread
  * Mark all as read
  * View all notifications page

- Notification Preferences (basic):
  * Enable/disable email for certain events
  * Enable/disable in-app for certain events
  * Digest mode (daily summary email)
```

---

#### 3.5 Testing, Bug Fixes & Deployment (Day 14-15)

**Activities:**
- [ ] Comprehensive testing of all workflows
- [ ] User acceptance testing (UAT)
- [ ] Performance testing (50 concurrent users)
- [ ] Security audit (RLS policies, SQL injection, XSS)
- [ ] Mobile responsiveness testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Bug fixes and refinements
- [ ] Documentation (user guide, API docs)
- [ ] Deployment to production
- [ ] Training session with key users
- [ ] Go-live support

**User Story US-3.8: System Deployment**
```
As a Development Team
I want to deploy the system to production
So that users can start using it

Acceptance:
- Production environment configured:
  * Supabase production project
  * Vercel production deployment
  * Environment variables set
  * Domain configured (portal.company.com)
  * SSL certificate active

- Database:
  * Production schema created
  * RLS policies applied
  * Initial admin user created
  * Seed data loaded (roles, etc.)

- Performance:
  * Page load < 2 seconds
  * Dashboard load < 3 seconds
  * Supports 50 concurrent users
  * All API endpoints respond < 500ms

- Security:
  * HTTPS enforced
  * Authentication working
  * RLS policies tested
  * No sensitive data exposed
  * Error handling prevents info leakage

- Monitoring:
  * Error tracking configured (Sentry/similar)
  * Performance monitoring active
  * Uptime monitoring configured
  * Alerts set up for critical issues

- Backup:
  * Automated daily backups scheduled
  * Backup restoration tested
  * Disaster recovery plan documented

- Documentation:
  * User guide (PDF) available
  * Video tutorials (5-10 mins each) created
  * FAQ documented
  * Support contact info visible
  * Admin documentation complete

- Training:
  * Training session conducted
  * Q&A session held
  * Support available during rollout
```

---

### Phase 3 Exit Criteria

✅ Archive system operational with search and analytics
✅ Stakeholder dashboard complete with all metrics
✅ Drill-down working for payments and rejections
✅ Reports generate and export successfully
✅ Notification system sends all required emails
✅ All Phase 1 & 2 features tested and stable
✅ Performance meets targets (< 2s page load, 50 users)
✅ Security audit passed (RLS, auth, data protection)
✅ Mobile responsive on 3+ devices
✅ Cross-browser tested (Chrome, Firefox, Safari, Edge)
✅ Critical bugs fixed (P0/P1)
✅ Deployed to production successfully
✅ User training completed
✅ Documentation delivered
✅ Go-live support plan in place

---

## 7. TECHNICAL ARCHITECTURE

### 7.1 Technology Stack

**Frontend:**
- Next.js 14+ (React 18)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Hook Form + Zod validation
- Recharts / Tremor (charts)
- Sonner (toast notifications)

**Backend:**
- Next.js API Routes / Server Actions
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Storage
- Supabase Realtime (for live updates)

**Email:**
- Resend or SendGrid
- React Email (templates)

**Deployment:**
- Vercel (frontend)
- Supabase Cloud (backend)

**Monitoring:**
- Vercel Analytics
- Sentry (error tracking)
- Supabase Dashboard (database monitoring)

### 7.2 Application Architecture

```
┌─────────────────────────────────────────────┐
│           User Browser (Client)              │
│  ┌─────────────────────────────────────┐   │
│  │  Next.js Frontend (React)           │   │
│  │  - App Router                       │   │
│  │  - shadcn/ui Components             │   │
│  │  - Client Components                │   │
│  │  - Server Components                │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     ├─── HTTPS (Fetch/API Calls)
                     │
┌─────────────────────────────────────────────┐
│        Next.js Server (Edge/Node)            │
│  ┌─────────────────────────────────────┐   │
│  │  API Routes & Server Actions        │   │
│  │  - Authentication middleware        │   │
│  │  - Business logic                   │   │
│  │  - Data validation (Zod)            │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     ├─── PostgreSQL Protocol
                     │
┌─────────────────────────────────────────────┐
│           Supabase Cloud                     │
│  ┌─────────────────────────────────────┐   │
│  │  PostgreSQL Database                │   │
│  │  - Tables                           │   │
│  │  - RLS Policies                     │   │
│  │  - Functions/Triggers               │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  Authentication                     │   │
│  │  - User management                  │   │
│  │  - Session handling                 │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  Storage                            │   │
│  │  - File uploads                     │   │
│  │  - Presigned URLs                   │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  Realtime                           │   │
│  │  - Live updates                     │   │
│  │  - Subscriptions                    │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                     │
                     ├─── SMTP/API
                     │
┌─────────────────────────────────────────────┐
│           Email Service (Resend)             │
│  - Transactional emails                      │
│  - Templates                                 │
│  - Delivery tracking                         │
└─────────────────────────────────────────────┘
```

### 7.3 Folder Structure

```
content-portal/
├── app/
│   ├── (auth)/                    # Auth layout group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/               # Dashboard layout group
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Stakeholder dashboard
│   │   ├── stories/
│   │   │   ├── page.tsx           # Story listing
│   │   │   ├── new/
│   │   │   │   └── page.tsx       # New story submission
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Story detail
│   │   │       ├── call-report/
│   │   │       │   └── page.tsx   # Call report form
│   │   │       └── evaluation/
│   │   │           └── page.tsx   # Evaluation form
│   │   ├── workflows/
│   │   │   ├── page.tsx           # Workflow listing
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Workflow detail
│   │   ├── contracts/
│   │   │   ├── page.tsx           # Contract listing
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Contract detail
│   │   ├── finance/
│   │   │   ├── page.tsx           # Payment dashboard
│   │   │   └── payments/
│   │   │       └── [id]/
│   │   │           └── page.tsx   # Payment detail
│   │   ├── archive/
│   │   │   ├── page.tsx           # Archive listing
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Archived story detail
│   │   └── layout.tsx
│   │
│   ├── api/                       # API routes
│   │   ├── stories/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── evaluations/
│   │   │   └── route.ts
│   │   ├── payments/
│   │   │   └── route.ts
│   │   └── webhooks/
│   │       └── route.ts
│   │
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page
│
├── components/
│   ├── ui/                        # shadcn components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   │
│   ├── forms/                     # Form components
│   │   ├── story-submission-form.tsx
│   │   ├── call-report-form.tsx
│   │   ├── evaluation-form.tsx
│   │   ├── negotiation-form.tsx
│   │   ├── legal-review-form.tsx
│   │   ├── contract-form.tsx
│   │   └── payment-form.tsx
│   │
│   ├── dashboard/                 # Dashboard components
│   │   ├── metric-card.tsx
│   │   ├── pipeline-funnel.tsx
│   │   ├── stage-distribution.tsx
│   │   ├── payment-status-table.tsx
│   │   └── drill-down-modal.tsx
│   │
│   ├── layout/                    # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── footer.tsx
│   │   └── mobile-nav.tsx
│   │
│   └── shared/                    # Shared components
│       ├── file-upload.tsx
│       ├── status-badge.tsx
│       ├── timeline.tsx
│       ├── notification-bell.tsx
│       └── loading-spinner.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   ├── server.ts              # Server client
│   │   └── middleware.ts          # Auth middleware
│   ├── validations/
│   │   ├── story.schema.ts
│   │   ├── evaluation.schema.ts
│   │   ├── payment.schema.ts
│   │   └── ...
│   ├── utils.ts                   # Utility functions
│   ├── constants.ts               # Constants
│   └── email/
│       ├── templates/
│       │   ├── story-submitted.tsx
│       │   ├── evaluation-assigned.tsx
│       │   ├── payment-completed.tsx
│       │   └── ...
│       └── send-email.ts
│
├── types/
│   ├── database.types.ts          # Supabase generated types
│   ├── index.ts                   # App types
│   └── api.types.ts               # API types
│
├── hooks/
│   ├── use-auth.ts
│   ├── use-stories.ts
│   ├── use-payments.ts
│   ├── use-notifications.ts
│   └── ...
│
├── middleware.ts                  # Next.js middleware (auth)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

---

## 8. DATABASE SCHEMA

### 8.1 Core Tables

#### Users & Roles
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'content_creator',
    'content_manager',
    'evaluator',
    'executive',
    'legal',
    'finance',
    'stakeholder'
  )),
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB
);
```

#### Stories & Workflow
```sql
-- Stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id TEXT UNIQUE NOT NULL, -- STR-YYYY-NNNN
  title TEXT NOT NULL,
  logged_by TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'external_producer',
    'writer_pitch',
    'inhouse_content'
  )),
  writer_originator_name TEXT NOT NULL,
  suggested_writer TEXT,
  synopsis TEXT NOT NULL,
  genre TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  current_stage TEXT DEFAULT 'submitted',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Call Reports
CREATE TABLE call_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  meeting_date TIMESTAMP,
  writer_name TEXT NOT NULL,
  contact_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  working_title TEXT NOT NULL,
  logline TEXT NOT NULL,
  usp TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  meeting_notes TEXT NOT NULL,
  meeting_attendees TEXT[],
  next_steps TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Evaluator Forms
CREATE TABLE evaluator_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id TEXT UNIQUE NOT NULL,
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id),
  -- Scores
  originality_score INT CHECK (originality_score BETWEEN 1 AND 10),
  market_potential_score INT CHECK (market_potential_score BETWEEN 1 AND 10),
  execution_feasibility_score INT CHECK (execution_feasibility_score BETWEEN 1 AND 10),
  audience_appeal_score INT CHECK (audience_appeal_score BETWEEN 1 AND 10),
  budget_viability_score INT CHECK (budget_viability_score BETWEEN 1 AND 10),
  cultural_relevance_score INT CHECK (cultural_relevance_score BETWEEN 1 AND 10),
  competitive_advantage_score INT CHECK (competitive_advantage_score BETWEEN 1 AND 10),
  production_complexity_score INT CHECK (production_complexity_score BETWEEN 1 AND 10),
  total_score INT,
  average_score DECIMAL(3,1),
  -- Details
  target_writer_detail TEXT,
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  overall_comments TEXT NOT NULL,
  strengths TEXT,
  weaknesses TEXT,
  key_changes TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'need_info')),
  created_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP
);

-- Evaluation Logs
CREATE TABLE evaluation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE,
  aggregate_average_score DECIMAL(3,1),
  aggregate_median_score DECIMAL(3,1),
  approval_count INT,
  rejection_count INT,
  need_info_count INT,
  total_evaluators INT,
  final_decision TEXT CHECK (final_decision IN ('approved', 'rejected', 'pending')),
  decision_logic_used TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Approvals & Negotiations
```sql
-- One-Liners
CREATE TABLE one_liners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  one_liner_summary TEXT NOT NULL,
  writer_name TEXT,
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  avg_eval_score DECIMAL(3,1),
  approvals_count INT,
  key_strengths TEXT[],
  estimated_budget DECIMAL(12,2),
  target_timeline TEXT,
  status TEXT DEFAULT 'pending',
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'more_info')),
  decision_notes TEXT,
  budget_approved BOOLEAN,
  conditions TEXT,
  priority TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Negotiations
CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negotiation_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  writer_producer_name TEXT,
  proposed_price DECIMAL(12,2),
  payment_structure TEXT,
  currency TEXT,
  price_justification TEXT,
  expected_start_date DATE,
  expected_completion_date DATE,
  milestones JSONB,
  scope_of_work TEXT,
  ip_rights TEXT,
  exclusivity_clause BOOLEAN,
  confidentiality_requirements TEXT,
  additional_terms TEXT,
  status TEXT DEFAULT 'in_progress',
  negotiation_rounds INT DEFAULT 0,
  negotiation_history JSONB[],
  terms_agreed BOOLEAN DEFAULT FALSE,
  failed_reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Legal & Contracts
```sql
-- Legal Reviews
CREATE TABLE legal_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_review_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  negotiation_id UUID REFERENCES negotiations(id),
  assigned_to UUID REFERENCES users(id),
  review_start_date TIMESTAMP DEFAULT NOW(),
  checklist JSONB,
  checklist_completion_percentage INT,
  decision TEXT CHECK (decision IN ('approved', 'rejected', 'refused', 'modifications')),
  risk_assessment TEXT CHECK (risk_assessment IN ('low', 'medium', 'high')),
  final_legal_notes TEXT,
  special_conditions TEXT,
  rejection_reason TEXT,
  missing_requirements TEXT[],
  recommendations TEXT,
  modifications_required TEXT,
  legal_concerns TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMP,
  days_in_review INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contracts
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  contract_type TEXT,
  party_a_name TEXT,
  party_a_rep_id UUID REFERENCES users(id),
  party_b_name TEXT,
  party_b_nic TEXT,
  party_b_ntn TEXT,
  project_title TEXT,
  episodes_count INT,
  episode_duration TEXT,
  deliverables JSONB,
  delivery_format TEXT,
  language TEXT,
  total_value DECIMAL(12,2),
  currency TEXT,
  payment_structure TEXT,
  payment_terms TEXT,
  tax_treatment TEXT,
  withholding_tax_percentage DECIMAL(5,2),
  start_date DATE,
  end_date DATE,
  milestones JSONB[],
  ip_ownership TEXT,
  rights_included TEXT[],
  territory TEXT,
  rights_duration TEXT,
  confidentiality_clause BOOLEAN,
  non_compete_period_months INT,
  termination_notice_days INT,
  force_majeure BOOLEAN,
  dispute_resolution TEXT,
  governing_law TEXT,
  jurisdiction TEXT,
  credits TEXT,
  warranty_indemnity TEXT,
  insurance_requirements TEXT,
  special_conditions TEXT,
  status TEXT DEFAULT 'draft',
  signed_date DATE,
  party_a_signed BOOLEAN DEFAULT FALSE,
  party_a_signature_date DATE,
  party_b_signed BOOLEAN DEFAULT FALSE,
  party_b_signature_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Payments & Scripting
```sql
-- Payment Schedules
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  writer_producer_name TEXT,
  total_contract_value DECIMAL(12,2),
  currency TEXT,
  payment_structure TEXT,
  milestones JSONB[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id TEXT UNIQUE NOT NULL,
  schedule_id UUID REFERENCES payment_schedules(id) ON DELETE CASCADE,
  milestone_number INT,
  milestone_name TEXT,
  milestone_type TEXT,
  linked_to TEXT,
  payment_amount DECIMAL(10,2),
  payment_percentage DECIMAL(5,2),
  withholding_tax_percentage DECIMAL(5,2),
  tax_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  beneficiary_name TEXT,
  bank_name TEXT,
  account_number TEXT,
  iban TEXT,
  payment_method TEXT,
  payment_date DATE,
  payment_reference TEXT,
  payment_notes TEXT,
  status TEXT DEFAULT 'pending_milestone',
  milestone_achieved_date DATE,
  due_date DATE,
  overdue_days INT,
  prepared_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Script Phases
CREATE TABLE script_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id TEXT UNIQUE NOT NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  step_number INT CHECK (step_number BETWEEN 1 AND 6),
  episode_number INT,
  draft_version INT,
  page_count INT,
  word_count INT,
  scene_count INT,
  writer_notes TEXT,
  changes_made TEXT,
  response_to_feedback TEXT,
  status TEXT,
  submitted_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  deadline DATE,
  is_late BOOLEAN DEFAULT FALSE,
  delay_days INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Script Feedback
CREATE TABLE script_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feedback_id TEXT UNIQUE NOT NULL,
  script_phase_id UUID REFERENCES script_phases(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id),
  review_date TIMESTAMP DEFAULT NOW(),
  story_plot_score INT,
  character_development_score INT,
  structure_score INT,
  dialogue_score INT,
  technical_format_score INT,
  production_feasibility_score INT,
  total_score INT,
  average_score DECIMAL(3,1),
  overall_comments TEXT,
  strengths TEXT,
  weaknesses TEXT,
  key_changes_required TEXT,
  decision TEXT CHECK (decision IN ('approve', 'major_revisions', 'reject')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Archive & Supporting Tables
```sql
-- Archive
CREATE TABLE archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  archive_id TEXT UNIQUE NOT NULL,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  rejection_stage TEXT,
  rejection_date TIMESTAMP,
  rejected_by UUID REFERENCES users(id),
  rejection_reason TEXT NOT NULL,
  rejection_category TEXT,
  can_resubmit BOOLEAN DEFAULT FALSE,
  resubmission_conditions TEXT,
  time_in_system_days INT,
  archived_at TIMESTAMP DEFAULT NOW()
);

-- Attachments
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title TEXT NOT NULL,
  message TEXT,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB
);

-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  workflow_name TEXT,
  current_stage TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Stages
CREATE TABLE workflow_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  stage_name TEXT,
  assigned_to UUID REFERENCES users(id),
  status TEXT,
  completed_at TIMESTAMP,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. SECURITY & PERMISSIONS

### 9.1 Row Level Security (RLS) Policies

#### Stories Table
```sql
-- Content Creators can view their own stories
CREATE POLICY "creators_view_own_stories" ON stories
  FOR SELECT USING (auth.uid() = created_by);

-- Content Managers can view all stories
CREATE POLICY "managers_view_all_stories" ON stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'content_manager'
    )
  );

-- Stakeholders can view all stories
CREATE POLICY "stakeholders_view_all_stories" ON stories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'stakeholder'
    )
  );

-- Content Creators can create stories
CREATE POLICY "creators_create_stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = created_by);
```

#### Evaluator Forms
```sql
-- Evaluators can view forms assigned to them
CREATE POLICY "evaluators_view_own_forms" ON evaluator_forms
  FOR SELECT USING (auth.uid() = evaluator_id);

-- Evaluators can create their own forms
CREATE POLICY "evaluators_create_forms" ON evaluator_forms
  FOR INSERT WITH CHECK (auth.uid() = evaluator_id);

-- Content Managers can view all evaluation forms
CREATE POLICY "managers_view_evaluation_forms" ON evaluator_forms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('content_manager', 'stakeholder')
    )
  );
```

#### Payments
```sql
-- Finance team can view all payments
CREATE POLICY "finance_view_payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('finance', 'stakeholder')
    )
  );

-- Finance team can process payments
CREATE POLICY "finance_process_payments" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'finance'
    )
  );

-- Writers can view their own payments
CREATE POLICY "writers_view_own_payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payment_schedules ps
      JOIN contracts c ON ps.contract_id = c.id
      WHERE ps.id = payments.schedule_id
      AND c.party_b_name = (
        SELECT name FROM users WHERE id = auth.uid()
      )
    )
  );
```

#### Legal Reviews
```sql
-- Legal team can view all reviews
CREATE POLICY "legal_view_reviews" ON legal_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('legal', 'stakeholder')
    )
  );

-- Legal team can update reviews
CREATE POLICY "legal_update_reviews" ON legal_reviews
  FOR UPDATE USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'legal'
    )
  );
```

### 9.2 Authentication & Authorization

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

**Session Management:**
- Session timeout: 30 minutes of inactivity
- Maximum 5 failed login attempts → temporary lockout (15 minutes)
- Secure session tokens (JWT)
- HttpOnly cookies

**API Security:**
- JWT token validation on every request
- Rate limiting: 100 requests/minute per user
- Input validation using Zod schemas
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding

---

## 10. SUCCESS METRICS & KPIs

### 10.1 Launch Success Metrics (Day 15)

**Functionality Checklist:**
- [ ] All 8 workflow stages operational
- [ ] All 7 user roles can log in and perform tasks
- [ ] Email notifications sent for key events
- [ ] Dashboard shows real-time data
- [ ] Drill-down works for payments & rejections
- [ ] File upload/download works reliably
- [ ] Mobile responsive (tested on 3 devices)

**Performance Targets:**
- [ ] Page load < 2 seconds
- [ ] Dashboard loads < 3 seconds
- [ ] Form submission < 1 second
- [ ] Supports 50 concurrent users
- [ ] Zero data loss during testing

**User Acceptance:**
- [ ] 5 users from each role test successfully
- [ ] 90% of test tasks completed without help
- [ ] Zero critical (P0) bugs
- [ ] Zero high (P1) bugs blocking workflows
- [ ] Positive feedback from stakeholders

### 10.2 Post-Launch KPIs (30 Days)

**Adoption:**
- 80% of target users actively using system
- 100% of new stories submitted via platform
- < 5% of users require support after onboarding

**Efficiency:**
- Average time to contract reduced from 45 to 25 days (45% improvement)
- Evaluation turnaround time < 5 days
- Payment processing time < 3 days
- Zero missed payment deadlines

**Quality:**
- Complete audit trail for 100% of stories
- 100% of rejections have detailed reasoning
- Stakeholder dashboard answers 95% of "status" questions without escalation

**Engagement:**
- Average session duration > 10 minutes
- Daily active users > 60% of total users
- Feature adoption rate > 75% for core features

### 10.3 Ongoing Metrics (Quarterly)

**Pipeline Metrics:**
- Submission volume (stories/month)
- Conversion rates at each stage
- Average time per stage
- Bottleneck identification

**Financial Metrics:**
- Total contract value
- Payment timeliness (% on-time)
- Budget utilization rate
- Revenue forecasting accuracy

**Quality Metrics:**
- Average evaluation scores
- Rejection rate by stage
- Resubmission success rate
- Stakeholder satisfaction score

---

## 11. RISK MANAGEMENT

### 11.1 Technical Risks

**Risk 1: 15-Day Timeline Too Aggressive**
- **Probability:** High
- **Impact:** High
- **Mitigation:**
  - Strict scope control (MVP only)
  - Daily standups to track progress
  - Pre-built components (shadcn/ui)
  - Parallel development (frontend + backend)
- **Fallback:**
  - Launch with Phase 1-2 features only
  - Add Phase 3 (dashboard) in Week 3

**Risk 2: Supabase RLS Complexity**
- **Probability:** Medium
- **Impact:** High
- **Mitigation:**
  - Test RLS policies early (Day 2)
  - Document patterns and examples
  - Use Supabase helpers for client-side
- **Fallback:**
  - Implement basic auth first
  - Add granular RLS post-launch

**Risk 3: File Upload at Scale**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Use Supabase Storage with CDN
  - Implement size limits (25MB per file)
  - Test with large files early
- **Fallback:**
  - Reduce file size limits to 10MB
  - Implement chunked upload

**Risk 4: Email Deliverability**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:**
  - Use reputable service (Resend/SendGrid)
  - Test thoroughly with real email addresses
  - Monitor bounce rates
- **Fallback:**
  - In-app notifications only
  - Add email later

**Risk 5: Dashboard Performance**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Use database indexes on frequently queried fields
  - Implement caching (React Query)
  - Paginate large datasets
- **Fallback:**
  - Simplified dashboard
  - Move complex analytics to async reports

### 11.2 User Adoption Risks

**Risk 6: Low User Adoption**
- **Probability:** Medium
- **Impact:** High
- **Mitigation:**
  - Simple, intuitive UI
  - In-app help and tooltips
  - Quick video tutorials (5 mins)
  - Support during rollout
- **Fallback:**
  - Gradual rollout (one department at a time)
  - One-on-one training sessions

**Risk 7: Resistance to Change**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:**
  - Executive sponsorship
  - Show clear benefits (time savings)
  - Address concerns proactively
- **Fallback:**
  - Run parallel systems temporarily
  - Incentivize early adopters

---

## 12. APPENDICES

### 12.1 Glossary

- **Story Idea:** Initial concept submitted for development
- **Call Report:** Document created after meeting with writer/producer
- **Evaluator:** Person who reviews and scores story ideas
- **One-Liner:** One-sentence summary of story for executive approval
- **Milestone:** Deliverable in contract (e.g., first draft, final script)
- **Scripting Phase:** 6-step process for script development
- **Workflow:** Automated sequence of steps from submission to completion
- **Archive:** Repository of rejected or completed stories
- **Stakeholder:** Person with visibility into all projects (executive, admin)
- **RLS:** Row Level Security - database-level access control
- **Drill-down:** Clicking to see more detailed information
- **Audit Trail:** Complete history of all actions taken

### 12.2 Open Questions (Needs Answers)

**Critical (Need Before Start):**
1. Do you have an existing Supabase project, or should I create one?
2. Email service preference: Resend (modern, $10/mo) or SendGrid (enterprise)?
3. Do you have a domain for the app? (e.g., portal.company.com)
4. User creation: Manual admin-created users, or allow registration with approval?
5. File storage: Supabase Storage (included) or AWS S3 (more control)?

**Nice to Know (Can Decide Later):**
6. Company branding: Logo, colors, official name for the portal?
7. Backup strategy: Daily automated backups sufficient?
8. Help desk integration needed? (Zendesk, Intercom, etc.)
9. Analytics preference: Google Analytics, Mixpanel, or basic internal?
10. Staging environment needed for testing before production?

### 12.3 Development Timeline (15 Days)

```
Week 1: Foundation & Core Workflow
├── Day 1-2: Setup & Infrastructure
│   ├── Next.js project init
│   ├── Supabase setup
│   ├── Database schema
│   ├── RLS policies
│   ├── shadcn/ui integration
│   └── Authentication
│
├── Day 3-4: Story Submission & Call Reports
│   ├── Story form
│   ├── File upload
│   ├── Story listing
│   ├── Call report form
│   └── Meeting scheduling
│
└── Day 5-7: Evaluation Workflow
    ├── Evaluator assignment
    ├── Evaluation form
    ├── Evaluation log
    ├── Decision logic
    └── Auto-routing

Week 2: Extended Workflow & Business Logic
├── Day 8-9: Approval & Negotiation
│   ├── One-liner generation
│   ├── Executive approval
│   ├── Negotiation form
│   └── Legal review checklist
│
├── Day 10-11: Contracts & Payments
│   ├── Contract management
│   ├── Signing workflow
│   ├── Payment schedule
│   ├── Payment processing
│   └── Scripting workflow
│
└── Day 12-13: Dashboard & Archive
    ├── Archive system
    ├── Stakeholder dashboard
    ├── Pipeline metrics
    ├── Drill-down capability
    └── Analytics

Week 3: Polish & Launch
├── Day 14: Notifications & Testing
│   ├── Email templates
│   ├── Notification system
│   ├── Comprehensive testing
│   └── Bug fixes
│
└── Day 15: Deployment & Go-Live
    ├── Production deployment
    ├── User training
    ├── Documentation
    └── Go-live support
```

### 12.4 Definition of Done

A feature is "done" when:
- [x] Code implemented and tested locally
- [x] TypeScript types defined
- [x] Zod validation schemas created
- [x] RLS policies protect data access
- [x] UI is responsive (mobile, tablet, desktop)
- [x] Loading states and error handling implemented
- [x] Accessibility basics met (keyboard nav, labels, contrast)
- [x] Email notifications sent (if applicable)
- [x] Audit log entries created
- [x] Tested by product owner
- [x] Deployed to production

---

## SIGN-OFF

This PRD defines the product scope for the 15-day MVP delivery across 3 phases. Any changes to scope, timeline, or priorities require approval from the product owner.

**Ready to Build?**

Please confirm:
1. ✅ PRD reviewed and approved
2. ✅ Phased approach accepted
3. ✅ Tech stack confirmed (Next.js + Supabase + shadcn/ui)
4. ✅ Critical questions answered (Section 12.2)
5. ✅ Team ready to start development

---

**END OF PRD**

*Version 1.0 | Last Updated: October 2025*

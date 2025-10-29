# Episodic Evaluation System - Remaining Tasks

## ✅ Completed
1. Database migration created (`20251018000005_create_episodic_evaluations.sql`)
2. TypeScript types added (`EpisodicEvaluation`, `EpisodicEvaluationWithDetails`, `EpisodicGrade`)

---

## 📋 Remaining Tasks

### 1. Database Setup
- [ ] Run migration `20251018000005_create_episodic_evaluations.sql` in Supabase Dashboard → SQL Editor
- [ ] Verify table created: `episodic_evaluations`
- [ ] Verify triggers are working (auto-calculation)
- [ ] Verify RLS policies are active

### 2. Validation Schemas
**File to create:** `lib/validations/episodic-evaluations.ts`

**Content needed:**
```typescript
import { z } from "zod";

// Validation for creating episodic evaluation
export const episodicEvaluationSchema = z.object({
  episode_id: z.string().uuid(),
  no_of_pages: z.number().int().positive().min(1),
  no_of_scenes: z.number().int().positive().min(1),
  events: z.array(z.string().min(1).max(500)).min(0).max(20),
  conflict_of_content_score: z.number().int().min(1).max(10),
  characterization_score: z.number().int().min(1).max(10),
  story_progression_score: z.number().int().min(1).max(10),
  freezes_score: z.number().int().min(1).max(10),
  whats_next_element_score: z.number().int().min(1).max(10),
});

export type EpisodicEvaluationFormData = z.infer<typeof episodicEvaluationSchema>;

// Helper functions
export function calculatePagesScore(pages: number): number {
  return pages >= 45 ? 5 : -5;
}

export function calculateScenesScore(scenes: number): number {
  return scenes >= 22 ? 5 : -5;
}

export function calculateGrade(score: number): "C" | "B" | "B+" | "A" | "A+" {
  if (score >= 9) return "A+";
  if (score >= 7) return "A";
  if (score >= 6) return "B+";
  if (score >= 5) return "B";
  return "C";
}

export function calculateOverallAverage(scores: {
  conflict: number;
  characterization: number;
  progression: number;
  freezes: number;
  whatsNext: number;
}): number {
  const sum = scores.conflict + scores.characterization + scores.progression +
               scores.freezes + scores.whatsNext;
  return Number((sum / 5).toFixed(2));
}
```

### 3. API Routes

#### A. Main API Route
**File to create:** `app/api/episodic-evaluations/route.ts`

**Functionality:**
- `POST /api/episodic-evaluations` - Create new episodic evaluation
  - Validate input with Zod schema
  - Check if evaluator already evaluated this episode (unique constraint)
  - Insert into database
  - Return created evaluation
- `GET /api/episodic-evaluations` - List evaluator's own evaluations
  - Filter by evaluator_id = current user
  - Support query params: episode_id, limit, offset
  - Include episode details in response

#### B. Single Evaluation Route
**File to create:** `app/api/episodic-evaluations/[id]/route.ts`

**Functionality:**
- `GET /api/episodic-evaluations/[id]` - Get single evaluation
  - Only if evaluator owns it
  - Include episode and evaluator details
- `DELETE /api/episodic-evaluations/[id]` - Delete evaluation (optional, before final lock)

#### C. Episode-Specific Route
**File to create:** `app/api/episodic-evaluations/episode/[episodeId]/route.ts`

**Functionality:**
- `GET /api/episodic-evaluations/episode/[episodeId]` - Get evaluator's evaluation for specific episode
  - Check if current evaluator has already evaluated this episode
  - Used to prevent duplicate evaluations and show existing evaluation

### 4. UI Components

#### A. Events List Component
**File to create:** `components/episodic-evaluations/events-list.tsx`

**Features:**
- Display list of events (Event 1, Event 2, etc.)
- "Add Event" button to add new event text field
- Remove button for each event
- Text input for each event (max 500 chars)
- Props: `events: string[]`, `onChange: (events: string[]) => void`, `disabled?: boolean`

#### B. Score Card Component
**File to create:** `components/episodic-evaluations/score-card.tsx`

**Features:**
- Label for score criterion (e.g., "Conflict of Content")
- Number input or slider (1-10)
- Real-time grade display badge (C/B/B+/A/A+)
- Props: `label: string`, `score: number`, `onChange: (score: number) => void`, `disabled?: boolean`

#### C. Auto-Calculated Score Component
**File to create:** `components/episodic-evaluations/auto-calculated-score.tsx`

**Features:**
- Display for pages or scenes score
- Green badge with "+5" if meets threshold
- Red badge with "-5" if below threshold
- Props: `type: "pages" | "scenes"`, `value: number`, `score: number`

#### D. Overall Assessment Component
**File to create:** `components/episodic-evaluations/overall-assessment.tsx`

**Features:**
- Display overall average (e.g., 7.8)
- Display overall grade with color coding
- Large, prominent display
- Props: `average: number`, `grade: string`

#### E. Main Evaluation Form
**File to create:** `components/episodic-evaluations/episodic-evaluation-form.tsx`

**Features:**
- Form with all sections
- Section 1: Episode Details (pages, scenes, auto-scores)
- Section 2: Events list
- Section 3: Evaluation scores (5 score cards)
- Section 4: Overall assessment
- Submit button
- Form validation
- Read-only mode when viewing submitted evaluation
- Props: `episode: Episode`, `existingEvaluation?: EpisodicEvaluation`, `onSubmit: (data) => void`, `disabled?: boolean`

### 5. Pages

#### A. Episodes to Evaluate List
**File to create:** `app/evaluator/episodic-evaluations/page.tsx`

**Features:**
- List all episodes available for evaluation
- Show episode number, title, project name
- Show status: "Not Evaluated" or "Evaluated" (check badge)
- "Evaluate" button (navigate to evaluation form)
- "View Evaluation" button if already evaluated
- Search/filter by call report or story
- Tabs: "To Evaluate" and "My Evaluations"

#### B. Evaluation Form Page
**File to create:** `app/evaluator/episodic-evaluations/[episodeId]/page.tsx`

**Features:**
- Fetch episode details
- Check if evaluator already evaluated (call API)
- If evaluated, show read-only view with submitted evaluation
- If not evaluated, show editable form
- Display episode info at top (episode #, title, project)
- Form submission handling
- Success toast and redirect to list
- Error handling

#### C. My Evaluations List
**File to create:** `app/evaluator/episodic-evaluations/my-evaluations/page.tsx`

**Features:**
- List all evaluations submitted by current evaluator
- Show episode info, submission date, overall grade
- Click to view full evaluation (read-only)
- Search/filter
- Export option (optional)

### 6. Navigation Updates

**File to update:** `app/evaluator/layout.tsx`

**Changes:**
Add new navigation item:
```typescript
{
  title: "Episodic Evaluations",
  href: "/evaluator/episodic-evaluations",
  icon: "clipboardCheck", // or appropriate icon
}
```

**File to update:** `components/layout/header.tsx`

**Changes:**
Add new icon to icon mapping (if using header for evaluator):
```typescript
import { ClipboardCheck } from "lucide-react";

// In icon mapping
clipboardCheck: ClipboardCheck,
```

### 7. Helper Functions/Utilities

**File to create:** `lib/episodic-evaluations/client.ts`

**Functions:**
- `getEpisodesForEvaluation()` - Fetch episodes to evaluate
- `getMyEpisodicEvaluations()` - Fetch evaluator's evaluations
- `getEpisodicEvaluationForEpisode(episodeId)` - Check if evaluated
- `createEpisodicEvaluation(data)` - Submit evaluation
- `deleteEpisodicEvaluation(id)` - Delete evaluation

**File to create:** `lib/episodic-evaluations/server.ts`

**Functions:**
Server-side versions of above functions

### 8. Testing Checklist

After implementation, test:
- [ ] Create episodic evaluation for Episode 1
  - [ ] Enter 50 pages (should show green +5)
  - [ ] Enter 40 pages (should show red -5)
  - [ ] Enter 25 scenes (should show green +5)
  - [ ] Enter 20 scenes (should show red -5)
  - [ ] Add 3 events
  - [ ] Enter all 5 scores (1-10)
  - [ ] Verify overall average calculation
  - [ ] Verify overall grade display
  - [ ] Submit evaluation
- [ ] Verify can't edit after submission
- [ ] Verify can't submit duplicate evaluation for same episode
- [ ] Verify evaluator can only see their own evaluations
- [ ] Verify grade calculation:
  - [ ] Score 3 → C
  - [ ] Score 5 → B
  - [ ] Score 6 → B+
  - [ ] Score 7 → A
  - [ ] Score 9 → A+
- [ ] Test "My Evaluations" list view
- [ ] Test read-only view of submitted evaluation

### 9. Optional Enhancements (Future)

- [ ] Allow content managers to view all episodic evaluations for a project
- [ ] Add comparison view (multiple evaluators' scores side-by-side)
- [ ] Export evaluations to PDF/Excel
- [ ] Add comments/notes field in evaluation
- [ ] Email notifications when evaluation submitted
- [ ] Dashboard widget showing evaluation statistics

---

## 📂 Complete File Structure

```
app/
├── api/
│   └── episodic-evaluations/
│       ├── route.ts                     ← CREATE
│       ├── [id]/
│       │   └── route.ts                 ← CREATE
│       └── episode/
│           └── [episodeId]/
│               └── route.ts             ← CREATE
└── evaluator/
    └── episodic-evaluations/
        ├── page.tsx                     ← CREATE
        ├── [episodeId]/
        │   └── page.tsx                 ← CREATE
        └── my-evaluations/
            └── page.tsx                 ← CREATE

components/
└── episodic-evaluations/
    ├── events-list.tsx                  ← CREATE
    ├── score-card.tsx                   ← CREATE
    ├── auto-calculated-score.tsx        ← CREATE
    ├── overall-assessment.tsx           ← CREATE
    └── episodic-evaluation-form.tsx     ← CREATE

lib/
├── validations/
│   └── episodic-evaluations.ts          ← CREATE
└── episodic-evaluations/
    ├── client.ts                        ← CREATE
    └── server.ts                        ← CREATE

supabase/migrations/
└── 20251018000005_create_episodic_evaluations.sql  ✅ CREATED

types/
└── index.ts                             ✅ UPDATED
```

---

## 🎯 Implementation Priority Order

1. **Validation schemas** (needed by API)
2. **API routes** (backend functionality)
3. **Basic components** (events-list, score-card, auto-calculated-score)
4. **Main form component** (episodic-evaluation-form)
5. **Pages** (list → form → my-evaluations)
6. **Navigation updates**
7. **Helper functions** (optional but recommended)
8. **Testing**

---

## 💡 Key Implementation Notes

### Auto-Calculation Logic
The database handles auto-calculation via triggers, but the frontend should also show real-time updates:
- Pages score: Client-side calculation for immediate visual feedback
- Scenes score: Client-side calculation for immediate visual feedback
- Overall average: Calculated on every score change
- Overall grade: Updated based on average

### Form Behavior
- **Before submission**: All fields editable, real-time calculations visible
- **After submission**: Entire form becomes read-only
- **Duplicate prevention**: Check if evaluation exists before showing form

### Grade Color Coding
```typescript
const gradeColors = {
  "A+": "bg-green-100 text-green-800 border-green-300",
  "A": "bg-green-50 text-green-700 border-green-200",
  "B+": "bg-blue-100 text-blue-800 border-blue-300",
  "B": "bg-blue-50 text-blue-700 border-blue-200",
  "C": "bg-red-100 text-red-800 border-red-300",
};
```

### Score Badge Colors
```typescript
// Pages/Scenes scores
if (score === 5) {
  return "bg-green-100 text-green-800"; // Green +5
} else {
  return "bg-red-100 text-red-800"; // Red -5
}
```

---

## ⚠️ Important Reminders

1. **Run the migration first** before building UI
2. **Test triggers** in database to ensure auto-calculation works
3. **Verify RLS policies** - evaluators should only see their own evaluations
4. **No updates after submission** - this is enforced at database level
5. **One evaluation per episode per evaluator** - unique constraint enforced
6. **Events are optional** - array can be empty
7. **All scores are required** - 1-10 scale mandatory

---

## 🚀 Quick Start Commands

```bash
# Run migration
# Go to Supabase Dashboard → SQL Editor → Run migration file

# Create validation file
touch lib/validations/episodic-evaluations.ts

# Create API routes
mkdir -p app/api/episodic-evaluations/[id]
mkdir -p app/api/episodic-evaluations/episode/[episodeId]

# Create components
mkdir -p components/episodic-evaluations

# Create pages
mkdir -p app/evaluator/episodic-evaluations/[episodeId]
mkdir -p app/evaluator/episodic-evaluations/my-evaluations

# Create helper functions
mkdir -p lib/episodic-evaluations
```

---

**Total Remaining Files to Create:** 16 files
**Total Files to Update:** 2 files
**Estimated Implementation Time:** 4-6 hours for complete system

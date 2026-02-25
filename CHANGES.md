# Dastaan Portal — Change Log

All significant changes, when they were made, what files were affected, and why.

---

## 2026-02-25 — Notification System Overhaul + Activity-Based Notifications

### Why
The notification system was broken and incomplete:
- Evaluation notifications silently failed because `lib/evaluations/client.ts` inserted directly into the `notifications` table using the browser Supabase client. The table has an RLS policy `INSERT WITH CHECK (false)` — only the service-role (admin) client can insert. Every insert was silently dropped.
- Multiple workflow events (episodic evaluations, revisions, story approval milestones, episode creation, meetings) sent zero notifications.
- Team heads had no visibility into their team's activity. Management had no reliable feed.

### Changes

#### Root Fix — Evaluation Notifications
| File | Change |
|---|---|
| `lib/evaluations/client.ts` | Removed ~115 lines of broken notification + audit log code. Replaced with fire-and-forget `fetch('/api/evaluations/notify', ...)` |
| `app/api/evaluations/notify/route.ts` | **New.** Server-side POST route — uses admin client to send notifications to team (management + content managers + creators) and separately to mandatory approvers + programmers ("story ready for approval") |

#### Missing Notification Events Added
| File | Event | Recipients |
|---|---|---|
| `app/api/episodic-evaluations/route.ts` | Episodic evaluation submitted | Management + content managers + content creators (anonymous — no evaluator name) |
| `app/api/call-reports/[id]/revisions/route.ts` | Call report revision uploaded | Management + content managers |
| `app/api/episodes/[id]/revisions/route.ts` | Episode revision uploaded | Management + content managers |
| `app/api/story-approvals/route.ts` | Story fully approved (threshold met) | All management + content managers + content creators |
| `app/api/story-approvals/route.ts` | Story rejected (mandatory approver rejects) | All management + content managers + content creators |
| `app/api/meetings/route.ts` | Meeting scheduled | Team members + explicit team head + all management (fixed: was using wrong client) |
| `app/api/episodes/route.ts` | Episode(s) logged | Team head of creator's team + all management + content managers |

#### Call Report Notifications (already working, no change)
`lib/meetings/server.ts` already used `createNotifications()` with admin client — call report creation correctly notified management + evaluators (which includes all team heads) + content team.

---

## 2026-02-25 — Approval Tracking Open to All Management

### Why
The Approval Tracking page and nav item were gated to Humera & Salman only. Other management members had no way to weigh in on stories. The user wanted all management members to vote, with all votes recorded for audit trail, but only Humera & Salman's votes counting toward the approval threshold.

### Changes
| File | Change |
|---|---|
| `app/management/layout.tsx` | Removed `isMandatoryApprover` gate — Approval Tracking nav item now visible to all management |
| `app/management/page.tsx` | Dashboard card now links all management to `/management/pending-evaluations`; renamed card to "Approval Tracking" |
| `app/api/story-approvals/route.ts` | **GET:** `canApprove` extended to all management role. **POST:** All management submit as `approver_type = "management"` (full audit trail). Threshold logic filters by `MANDATORY_APPROVER_EMAILS` so only Humera/Salman's votes advance or reject stories. Fixed pre-existing TypeScript error in `managementRejected` filter using `Set<string>` instead of `.includes()` on a const tuple. |
| `app/api/episodes/[id]/approval/route.ts` | Gated episode `approval_status` PATCH to mandatory approvers + admin + content_manager only; added email-based check |
| `app/management/evaluate/episode/[id]/page.tsx` | Episode `approval_status` sync only fires if current user is a mandatory approver |
| `supabase/migrations/20260225000004_revert_management_observer_approver_type.sql` | **New migration.** Rolled back a `management_observer` CHECK constraint expansion that was briefly applied to DB (reverted approach: all votes stored as `management`) |

---

## 2026-02-25 — Discussion Threads (Call Reports + Episodes)

### Why
There was no way for team members or management to leave feedback directly on a call report or episode. Content was reviewed and decisions were made with no traceable back-and-forth.

### Changes
| File | Change |
|---|---|
| `supabase/migrations/20260214000001_create_call_report_discussions.sql` | **New.** Creates `call_report_discussions` table with RLS |
| `supabase/migrations/20260225000001_revision_aware_approvals_episode_discussions.sql` | **New.** Creates `episode_discussions` table; adds `revision_id` FK to `story_approvals` and `episodic_evaluations` for revision-aware approval rounds |
| `app/api/call-reports/[id]/discussions/route.ts` | **New.** GET (list messages) + POST (send message) with rich notifications — mandatory approvers notified when non-management posts; all thread participants notified when management posts |
| `app/api/call-reports/[id]/discussions/[discussionId]/route.ts` | **New.** PATCH (edit) + DELETE for individual messages |
| `app/api/episodes/[id]/discussions/route.ts` | **New.** Same as above for episodes |
| `app/api/episodes/[id]/discussions/[discussionId]/route.ts` | **New.** PATCH + DELETE for episode messages |
| `components/call-reports/call-report-discussion.tsx` | **New.** `DiscussionThread` component — realtime polling every 5s, system message styling, auto-scroll to latest, used across all portals |
| `app/content-department/call-reports/[id]/page.tsx` | Added `DiscussionThread` |
| `app/evaluator/call-reports/[id]/page.tsx` | Added `DiscussionThread` |
| `app/gcm/call-reports/[id]/page.tsx` | Added `DiscussionThread` |
| `app/programmer/call-reports/[id]/page.tsx` | Added `DiscussionThread` |
| `app/evaluator/episodes/[episodeId]/page.tsx` | Added `DiscussionThread` |
| `app/programmer/episodes/[episodeId]/page.tsx` | Added `DiscussionThread` |

---

## 2026-02-25 — Episodic Evaluation Decision Field

### Why
The episodic evaluation form had no final decision — evaluators could score an episode but couldn't formally recommend approve / needs improvement / reject. Management needed this to make approval decisions.

### Changes
| File | Change |
|---|---|
| `supabase/migrations/20260225000002_episodic_eval_decision.sql` | **New.** Adds `decision` and `decision_notes` columns to `episodic_evaluations` table |
| `lib/validations/episodic-evaluations.ts` | Added `decision` and `decision_notes` to Zod schema |
| `components/episodic-evaluations/episodic-evaluation-form.tsx` | Added Final Decision section (approve / needs_improvement / reject radio + notes textarea) |
| `app/api/episodic-evaluations/route.ts` | POST inserts `decision` and `decision_notes` |
| `app/management/evaluate/episode/[id]/page.tsx` | Reads and displays decision; gates `approval_status` sync to mandatory approvers |
| `types/index.ts` | Added `decision` and `decision_notes` to `EpisodicEvaluation` type |

---

## 2026-02-25 — Episode Approvals List Redesign

### Why
The episode approvals list was a flat card list with no project grouping. With multiple episodes per drama, the list was unnavigable and didn't show the project context.

### Changes
| File | Change |
|---|---|
| `components/management/pending-episode-approvals-list.tsx` | **New.** Complete rewrite — outer card per project (drama title), collapsible episode sub-cards inside. Each sub-card shows status badges, Evaluate button, `ContentRevisions` panel, and `DiscussionThread` inline |
| `app/management/pending-evaluations/page.tsx` | Updated to use new grouped component; added Episodes tab |

---

## 2026-02-25 — Revision-Aware Approval Rounds

### Why
When a call report was sent back for revision and then re-evaluated, the old approval votes still counted. Approval should reset per revision so each round is clean.

### Changes
| File | Change |
|---|---|
| `supabase/migrations/20260225000001_revision_aware_approvals_episode_discussions.sql` | Adds `revision_id` FK to `story_approvals` and partial unique index `(call_report_id, user_id, revision_id)` so each user votes once per revision round |
| `app/api/story-approvals/route.ts` | GET and POST now detect current revision from `call_report_revisions` and scope approval queries to that revision. Returns `currentRevisionId` and `approvalHistory` (previous rounds grouped by revision) |
| `app/api/call-reports/[id]/revisions/route.ts` | POST auto-posts system message in discussion thread on revision upload |
| `app/api/episodes/[id]/revisions/route.ts` | Same for episode revisions |
| `components/approvals/story-approval-panel.tsx` | Shows current round approvals + collapsible history per revision |

---

## 2026-02-25 — Per-Revision Evaluations in Revisions Panel

### Why
Management and evaluators couldn't see which evaluations were tied to which revision of a call report. The revisions panel showed file uploads but no evaluation scores.

### Changes
| File | Change |
|---|---|
| `app/api/call-reports/[id]/revisions/route.ts` | GET now joins `evaluator_forms` by `revision_id` and returns `evaluations[]` + `evaluation_count` + `average_evaluation_score` per revision |
| `app/api/episodes/[id]/revisions/route.ts` | Same for episode revisions — joins `episodic_evaluations` |
| `components/evaluations/evaluation-card.tsx` | Expanded to show full read-only filled evaluation form on "View Details" |
| `components/evaluations/evaluation-searchable-list.tsx` | Added revision filter + evaluation score display |

---

## 2026-02-25 — Management Pending Evaluations + Episode Approval Queue

### Why
Management had no single view to see all pending evaluations (both call reports and episodes) awaiting their review.

### Changes
| File | Change |
|---|---|
| `app/api/management/approval-queue/route.ts` | Updated to return revision-aware data + evaluator evaluation counts |
| `app/api/management/episode-approval-queue/route.ts` | **New.** Returns episodes awaiting management review with evaluation summaries |
| `app/api/management/episode-review/route.ts` | **New.** PATCH to mark an episode as reviewed |
| `components/management/pending-evaluations-list.tsx` | Renamed "Pending Approvals" → "Approval Tracking"; shows current revision approval status |

---

## 2026-02-25 — Initial Assessment API

### Why
Evaluators needed a way to submit a brief initial assessment on a call report before the full evaluation.

### Changes
| File | Change |
|---|---|
| `app/api/initial-assessments/route.ts` | **New.** POST to create initial assessment, GET to list by call report |

---

## 2026-02-14 — Call Report Discussion Table (Migration)

### Why
Foundation migration for the discussion thread feature — created before the discussion API and UI were built.

### Changes
| File | Change |
|---|---|
| `supabase/migrations/20260214000001_create_call_report_discussions.sql` | Creates `call_report_discussions` table with columns: `id`, `call_report_id`, `user_id`, `message`, `revision_id`, `is_system_message`, `created_at`, `updated_at`. Includes RLS policies. |

---

## Previous Commits (pre-2026-02-25)

| Commit | Description |
|---|---|
| `bfb0918` | feat: show per-revision evaluations in revisions panel |
| `6efdf7d` | feat: add Evaluate button + Revisions to management pending approvals |
| `dad34c9` | feat: remove incoming evaluation requests from programmer cross-team shares |
| `ce3496b` | feat: show logged-by and team badge on call report cards |
| `e4ea951` | feat: view details on completed evaluations shows filled form read-only |

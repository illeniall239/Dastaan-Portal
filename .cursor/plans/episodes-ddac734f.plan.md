---
name: Evaluation Approval System Implementation
overview: ""
todos:
  - id: bfd29bfb-2e3a-400b-b0fd-488f61f79cac
    content: Create and run migration to add decision field to evaluator_forms
    status: pending
  - id: 364b9753-747e-480a-9cae-1c2f90951e16
    content: Create migration for evaluation_logs table and decision calculation functions
    status: pending
  - id: 8d8ae398-3abd-4fb9-8444-b61f9d5259f8
    content: Add decision radio buttons and validation to evaluation form component
    status: pending
  - id: 401abf62-f2b8-4c1a-a5f8-2656a5438029
    content: Update evaluation API and client functions to handle decision field
    status: pending
  - id: 2f834b7c-fe79-4f4b-9e07-034db0eda087
    content: Add evaluation decision status display to management dashboard
    status: pending
  - id: 4f2906a0-148e-48f5-bc62-10440d9d055f
    content: Create notification service for evaluation decisions
    status: pending
  - id: bcbbadd0-ba3c-4403-be17-219a32f4774b
    content: Test complete evaluation-to-negotiation workflow with all decision scenarios
    status: pending
  - id: 2657be7a-8afe-41a7-9e6b-816d38e041f9
    content: Verify negotiations only show approved stories
    status: pending
---

# Evaluation Approval System Implementation

## Overview

Implement the complete evaluation-to-negotiation workflow including:

- Evaluator decision field (Approve/Reject/Need More Info)
- Automatic decision logic with score thresholds and voting
- 3/5 evaluator minimum with 5-day reminder system (already partially implemented)
- Story status updates based on evaluation outcome
- Only approved stories show in negotiations

## Key Requirements

- **Decision Field**: Both explicit decision + score validation
- **No One-Liner Stage**: Skip directly from evaluation approval to negotiation-ready
- **Timing**: After 3/5 submit, remind other 2 daily for 5 days, then proceed
- **Voting**: Simple majority (>50% approve = approved)
- **Negotiations**: Only show approved stories

## Database Changes

### 1. Add decision field to evaluator_forms

**Migration**: `supabase/migrations/20251027000005_add_evaluator_decision_field.sql`

```sql
-- Add decision field to evaluator_forms
ALTER TABLE evaluator_forms
ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('approve', 'reject', 'need_info'));

-- Add decision justification for rejects/need_info
ALTER TABLE evaluator_forms
ADD COLUMN IF NOT EXISTS decision_notes TEXT;

-- Make decision required when submitted
ALTER TABLE evaluator_forms
ADD CONSTRAINT decision_required_when_submitted 
  CHECK (submitted_at IS NULL OR decision IS NOT NULL);

COMMENT ON COLUMN evaluator_forms.decision IS 'Evaluator decision: approve, reject, or need_info';
COMMENT ON COLUMN evaluator_forms.decision_notes IS 'Required justification for reject/need_info decisions';
```

### 2. Create evaluation_logs table for decision tracking

**Migration**: `supabase/migrations/20251027000006_create_evaluation_decision_system.sql`

```sql
-- Drop and recreate evaluation_logs with proper structure
DROP TABLE IF EXISTS evaluation_logs CASCADE;

CREATE TABLE evaluation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_report_id UUID REFERENCES call_reports(id) ON DELETE CASCADE,
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  
  -- Vote counts
  total_evaluators INTEGER NOT NULL,
  approve_count INTEGER DEFAULT 0,
  reject_count INTEGER DEFAULT 0,
  need_info_count INTEGER DEFAULT 0,
  
  -- Score data
  aggregate_average_score DECIMAL(3,2),
  highest_score DECIMAL(3,2),
  lowest_score DECIMAL(3,2),
  
  -- Final decision
  final_decision TEXT CHECK (final_decision IN ('approved', 'rejected', 'pending', 'need_more_info')),
  decision_logic_used TEXT,
  decision_reason TEXT,
  
  -- Timing
  decided_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_evaluation_logs_call_report ON evaluation_logs(call_report_id);
CREATE INDEX idx_evaluation_logs_story ON evaluation_logs(story_id);
CREATE INDEX idx_evaluation_logs_decision ON evaluation_logs(final_decision);
```

### 3. Create decision calculation function

**Same migration file** (`20251027000006_create_evaluation_decision_system.sql`):

```sql
CREATE OR REPLACE FUNCTION calculate_evaluation_decision(p_call_report_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_story_id UUID;
  v_total_evaluators INTEGER;
  v_approve_count INTEGER;
  v_reject_count INTEGER;
  v_need_info_count INTEGER;
  v_avg_score DECIMAL(3,2);
  v_final_decision TEXT;
  v_decision_reason TEXT;
BEGIN
  -- Get story ID
  SELECT story_id INTO v_story_id FROM call_reports WHERE id = p_call_report_id;
  
  -- Count votes by decision type
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE decision = 'approve'),
    COUNT(*) FILTER (WHERE decision = 'reject'),
    COUNT(*) FILTER (WHERE decision = 'need_info'),
    AVG(average_score)
  INTO
    v_total_evaluators,
    v_approve_count,
    v_reject_count,
    v_need_info_count,
    v_avg_score
  FROM evaluator_forms
  WHERE call_report_id = p_call_report_id
  AND submitted_at IS NOT NULL;

  -- Apply decision logic
  -- Rule 1: Any "need more info" = PENDING
  IF v_need_info_count > 0 THEN
    v_final_decision := 'need_more_info';
    v_decision_reason := format('%s evaluator(s) requested more information', v_need_info_count);
    
  -- Rule 2: Score < 5.0 = REJECTED (regardless of votes)
  ELSIF v_avg_score < 5.0 THEN
    v_final_decision := 'rejected';
    v_decision_reason := format('Average score %.2f below threshold of 5.0', v_avg_score);
    
  -- Rule 3: Score >= 7.0 AND majority approve = APPROVED
  ELSIF v_avg_score >= 7.0 AND v_approve_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'approved';
    v_decision_reason := format('Score %.2f >= 7.0 with %s/%s approvals', v_avg_score, v_approve_count, v_total_evaluators);
    
  -- Rule 4: Majority vote (score 5.0-6.9)
  ELSIF v_approve_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'approved';
    v_decision_reason := format('Majority approval: %s/%s votes (score: %.2f)', v_approve_count, v_total_evaluators, v_avg_score);
    
  ELSIF v_reject_count > (v_total_evaluators / 2.0) THEN
    v_final_decision := 'rejected';
    v_decision_reason := format('Majority rejection: %s/%s votes (score: %.2f)', v_reject_count, v_total_evaluators, v_avg_score);
    
  -- Rule 5: Split decision = PENDING
  ELSE
    v_final_decision := 'pending';
    v_decision_reason := format('Split decision: %s approve, %s reject (score: %.2f)', v_approve_count, v_reject_count, v_avg_score);
  END IF;

  -- Log the decision
  INSERT INTO evaluation_logs (
    call_report_id,
    story_id,
    total_evaluators,
    approve_count,
    reject_count,
    need_info_count,
    aggregate_average_score,
    final_decision,
    decision_reason,
    decision_logic_used
  ) VALUES (
    p_call_report_id,
    v_story_id,
    v_total_evaluators,
    v_approve_count,
    v_reject_count,
    v_need_info_count,
    v_avg_score,
    v_final_decision,
    v_decision_reason,
    'majority_vote_with_score_thresholds'
  );

  -- Update story status based on decision
  IF v_final_decision = 'approved' THEN
    UPDATE stories 
    SET status = 'approved', current_stage = 'ready_for_negotiation', updated_at = NOW()
    WHERE id = v_story_id;
    
  ELSIF v_final_decision = 'rejected' THEN
    UPDATE stories
    SET status = 'rejected', current_stage = 'archived_rejected_evaluation', updated_at = NOW()
    WHERE id = v_story_id;
    
  ELSIF v_final_decision IN ('pending', 'need_more_info') THEN
    UPDATE stories
    SET status = 'in_evaluation', current_stage = 'pending_evaluation', updated_at = NOW()
    WHERE id = v_story_id;
  END IF;

  -- Update call report evaluation status
  UPDATE call_reports
  SET evaluation_status = v_final_decision::evaluation_status,
      updated_at = NOW()
  WHERE id = p_call_report_id;

  RETURN v_final_decision;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. Update evaluation completion trigger

**Same migration** (`20251027000006_create_evaluation_decision_system.sql`):

```sql
-- Modify existing process_evaluation_completion to call decision logic
CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_internal_count INTEGER;
  v_call_report RECORD;
  v_decision TEXT;
BEGIN
  v_call_report_id := NEW.call_report_id;
  
  -- Get call report
  SELECT * INTO v_call_report FROM call_reports WHERE id = v_call_report_id;
  
  -- Count internal evaluators who have submitted
  SELECT COUNT(*) INTO v_internal_count
  FROM evaluator_forms ef
  JOIN users u ON u.id = ef.evaluator_id
  WHERE ef.call_report_id = v_call_report_id
  AND ef.submitted_at IS NOT NULL
  AND u.evaluator_type = 'internal';
  
  -- Mark assignment as completed
  UPDATE evaluator_assignments
  SET status = 'completed', completed_at = NOW()
  WHERE call_report_id = v_call_report_id AND evaluator_id = NEW.evaluator_id;
  
  -- Start 5-day countdown after 3/5 complete
  IF v_internal_count >= 3 AND NOT v_call_report.minimum_evaluations_reached THEN
    UPDATE call_reports
    SET minimum_evaluations_reached = TRUE,
        evaluations_deadline = NOW() + INTERVAL '5 days'
    WHERE id = v_call_report_id;
  END IF;
  
  -- Calculate decision if: all 5 complete OR deadline passed with 3+
  IF v_internal_count >= 5 OR 
     (v_internal_count >= 3 AND v_call_report.evaluations_deadline IS NOT NULL 
      AND NOW() > v_call_report.evaluations_deadline) THEN
    
    -- Calculate and apply decision
    v_decision := calculate_evaluation_decision(v_call_report_id);
    
    -- Send notifications based on decision
    -- (handled by separate notification function)
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_evaluation_completion ON evaluator_forms;
CREATE TRIGGER trigger_evaluation_completion
AFTER INSERT OR UPDATE OF submitted_at ON evaluator_forms
FOR EACH ROW
WHEN (NEW.submitted_at IS NOT NULL)
EXECUTE FUNCTION process_evaluation_completion();
```

## Frontend Changes

### 1. Update Evaluation Form Component

**File**: `components/evaluations/evaluation-form.tsx`

Add decision radio buttons after scores section:

```tsx
// After score fields, before comments
<Card>
  <CardHeader>
    <CardTitle>Final Decision *</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={decision} onValueChange={setDecision} required>
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="approve" id="approve" />
        <Label htmlFor="approve" className="font-normal cursor-pointer">
          <div className="font-semibold text-green-700">Approve</div>
          <p className="text-sm text-muted-foreground">Recommend this project for production</p>
        </Label>
      </div>
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="reject" id="reject" />
        <Label htmlFor="reject" className="font-normal cursor-pointer">
          <div className="font-semibold text-red-700">Reject</div>
          <p className="text-sm text-muted-foreground">Do not recommend this project</p>
        </Label>
      </div>
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="need_info" id="need_info" />
        <Label htmlFor="need_info" className="font-normal cursor-pointer">
          <div className="font-semibold text-amber-700">Need More Information</div>
          <p className="text-sm text-muted-foreground">Require additional details before deciding</p>
        </Label>
      </div>
    </RadioGroup>
    
    {(decision === 'reject' || decision === 'need_info') && (
      <div className="mt-4">
        <Label htmlFor="decision_notes">Justification *</Label>
        <Textarea
          id="decision_notes"
          value={decisionNotes}
          onChange={(e) => setDecisionNotes(e.target.value)}
          placeholder="Please explain your decision..."
          rows={3}
          required
        />
      </div>
    )}
  </CardContent>
</Card>
```

Validation before submit:

```tsx
const validateDecision = () => {
  if (!decision) {
    toast.error("Please select a decision (Approve/Reject/Need More Info)");
    return false;
  }
  
  // Validate score vs decision consistency
  if (decision === 'approve' && averageScore < 5.0) {
    toast.error("Cannot approve with average score below 5.0");
    return false;
  }
  
  if (decision === 'reject' && averageScore >= 7.0) {
    const confirmReject = confirm(
      `Score is ${averageScore.toFixed(1)}/10 but you selected Reject. Continue?`
    );
    if (!confirmReject) return false;
  }
  
  if ((decision === 'reject' || decision === 'need_info') && !decisionNotes?.trim()) {
    toast.error("Please provide justification for your decision");
    return false;
  }
  
  return true;
};
```

### 2. Update API to Accept Decision

**File**: `app/api/evaluations/route.ts` (needs to be created or updated)

Include `decision` and `decision_notes` in the insert:

```typescript
const { data, error } = await supabase
  .from("evaluator_forms")
  .insert({
    // ... existing fields
    decision: evaluationData.decision,
    decision_notes: evaluationData.decision_notes,
    submitted_at: new Date().toISOString(),
  })
```

### 3. Update Client Functions

**File**: `lib/evaluations/client.ts`

Add fields to interface and function:

```typescript
export interface CreateEvaluationInput {
  // ... existing fields
  decision: 'approve' | 'reject' | 'need_info';
  decision_notes?: string | null;
}
```

### 4. Display Evaluation Decision Status

**File**: `app/management/page.tsx` or new evaluation status component

Show aggregate decision for each call report:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Evaluation Status</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Completed:</span>
        <span>{completedEvaluations}/{totalEvaluators}</span>
      </div>
      <div className="flex justify-between">
        <span>Average Score:</span>
        <span className="font-bold">{averageScore.toFixed(2)}/10</span>
      </div>
      <div className="flex justify-between">
        <span>Approve:</span>
        <Badge variant="outline" className="bg-green-50">{approveCount}</Badge>
      </div>
      <div className="flex justify-between">
        <span>Reject:</span>
        <Badge variant="outline" className="bg-red-50">{rejectCount}</Badge>
      </div>
      <div className="flex justify-between">
        <span>Need Info:</span>
        <Badge variant="outline" className="bg-amber-50">{needInfoCount}</Badge>
      </div>
      {finalDecision && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50">
          <p className="font-semibold">Final Decision:</p>
          <Badge className={getFinalDecisionColor(finalDecision)}>
            {finalDecision.toUpperCase()}
          </Badge>
          <p className="text-sm text-muted-foreground mt-1">{decisionReason}</p>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

### 5. Create Notification Service for Decisions

**File**: `lib/evaluations/notifications.ts`

```typescript
export async function sendEvaluationDecisionNotifications(
  callReportId: string,
  finalDecision: string
) {
  const supabase = await createClient();
  
  // Get call report and story details
  const { data: callReport } = await supabase
    .from('call_reports')
    .select('*, stories!inner(*)')
    .eq('id', callReportId)
    .single();
    
  if (!callReport) return;
  
  // Get content managers and creators
  const { data: contentTeam } = await supabase
    .from('users')
    .select('id, name, email')
    .in('role', ['content_manager', 'content_creator'])
    .eq('status', 'active');
    
  if (finalDecision === 'approved') {
    // Notify content team: project approved, ready for negotiation
    await createNotifications(
      contentTeam.map(u => u.id),
      'success',
      `Project Approved: ${callReport.working_title}`,
      `The project has been approved by evaluators. You can now create a negotiation.`,
      'evaluation_approved',
      callReportId
    );
  } else if (finalDecision === 'rejected') {
    // Notify content team: project rejected
    await createNotifications(
      contentTeam.map(u => u.id),
      'error',
      `Project Rejected: ${callReport.working_title}`,
      `The project has been rejected by evaluators and moved to archive.`,
      'evaluation_rejected',
      callReportId
    );
  }
}
```

## Testing & Validation

### Test Cases

1. **Unanimous approval**: All 5 approve, score >= 7.0 → Status = "approved"
2. **Unanimous rejection**: All 5 reject, score < 5.0 → Status = "rejected"
3. **Majority approval**: 3 approve, 2 reject, score 6.5 → Status = "approved"
4. **Majority rejection**: 2 approve, 3 reject, score 5.5 → Status = "rejected"
5. **Low score override**: 3 approve, 2 reject, but score 4.8 → Status = "rejected"
6. **High score + majority**: 3 approve, 2 reject, score 7.5 → Status = "approved"
7. **Need more info**: 1 need_info → Status = "pending"
8. **3/5 complete**: After 3rd submission, verify deadline set and reminders start
9. **After deadline**: After 5 days with only 3 submissions → Decision calculated
10. **Negotiations filter**: Verify only approved stories appear in negotiation dropdown

### Manual Testing Steps

1. Create call report and assign 5 evaluators
2. Have 3 evaluators submit with "approve" decisions
3. Verify system sets 5-day deadline
4. Check reminder system sends daily notifications
5. After 5 days (or manually update deadline), verify decision calculated
6. Check story status updated to "approved"
7. Navigate to negotiations → verify story appears in dropdown
8. Create negotiation → verify it succeeds

## Files Summary

**New Migrations:**

- `supabase/migrations/20251027000005_add_evaluator_decision_field.sql`
- `supabase/migrations/20251027000006_create_evaluation_decision_system.sql`

**Modified Files:**

- `components/evaluations/evaluation-form.tsx` - Add decision UI
- `lib/evaluations/client.ts` - Add decision fields to interface
- `lib/evaluations/server.ts` - Add decision to create function
- `app/management/page.tsx` - Display decision status
- `lib/evaluations/notifications.ts` (new) - Send decision notifications

**Already Working:**

- Negotiations already filter by `status = 'approved'` (lines 34 in new pages)
- Reminder system partially implemented in migration `20251017000005`
- Evaluation completion tracking exists

## Implementation Order

1. Run migration 20251027000005 (add decision field)
2. Run migration 20251027000006 (decision logic system)
3. Update evaluation form UI component
4. Update client/server evaluation functions
5. Add decision status display to management dashboard
6. Create notification service
7. Test end-to-end workflow
8. Deploy and monitor
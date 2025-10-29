-- =====================================================
-- Auto-Evaluation Trigger
-- =====================================================
-- This migration creates a trigger that automatically:
-- 1. Calculates average score when all evaluators complete
-- 2. Updates call_report status based on score
-- 3. Archives rejected items (score < 5.0)

-- =====================================================
-- Function: Process Evaluation Completion
-- =====================================================

CREATE OR REPLACE FUNCTION process_evaluation_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_call_report_id UUID;
  v_total_evaluations INTEGER;
  v_internal_evaluations INTEGER;
  v_external_evaluations INTEGER;
  v_avg_score DECIMAL(3,2);
  v_call_report RECORD;
  v_new_status evaluation_status;
  v_evaluator_type evaluator_type;
BEGIN
  -- Get the call report ID from the evaluation
  v_call_report_id := NEW.call_report_id;

  -- Get evaluator type
  SELECT u.evaluator_type INTO v_evaluator_type
  FROM users u
  WHERE u.id = NEW.evaluator_id;

  -- Count total completed evaluations for this call report
  SELECT
    COUNT(*) FILTER (WHERE u.evaluator_type = 'internal'),
    COUNT(*) FILTER (WHERE u.evaluator_type = 'external'),
    COUNT(*),
    AVG(ef.average_score)
  INTO
    v_internal_evaluations,
    v_external_evaluations,
    v_total_evaluations,
    v_avg_score
  FROM evaluator_forms ef
  LEFT JOIN users u ON u.id = ef.evaluator_id
  WHERE ef.call_report_id = v_call_report_id
  AND ef.submitted_at IS NOT NULL;

  -- Update the call report with evaluation count and current average
  UPDATE call_reports
  SET
    completed_evaluations = v_total_evaluations,
    completed_internal_evaluations = v_internal_evaluations,
    completed_external_evaluations = v_external_evaluations,
    current_average_score = v_avg_score,
    average_score = v_avg_score,
    evaluation_status = CASE
      WHEN evaluation_status = 'pending' THEN 'in_progress'::evaluation_status
      ELSE evaluation_status
    END
  WHERE id = v_call_report_id;

  -- Update assignment status to completed
  UPDATE evaluator_assignments
  SET
    status = 'completed',
    completed_at = NOW()
  WHERE call_report_id = v_call_report_id
  AND evaluator_id = NEW.evaluator_id;

  -- Get the call report to check if we need to finalize
  SELECT * INTO v_call_report
  FROM call_reports
  WHERE id = v_call_report_id;

  -- Check if all 20 evaluators have completed (10 internal + 10 external)
  IF v_total_evaluations >= v_call_report.required_evaluators THEN
    -- Determine final status based on average score
    IF v_avg_score >= 7.0 THEN
      v_new_status := 'accepted'::evaluation_status;
    ELSIF v_avg_score >= 5.0 THEN
      v_new_status := 'needs_improvement'::evaluation_status;
    ELSE
      v_new_status := 'rejected'::evaluation_status;
    END IF;

    -- Update call report status
    UPDATE call_reports
    SET
      evaluation_status = v_new_status,
      updated_at = NOW()
    WHERE id = v_call_report_id;

    -- If rejected, archive the call report
    IF v_new_status = 'rejected'::evaluation_status THEN
      PERFORM archive_rejected_call_report(v_call_report_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Function: Archive Rejected Call Report
-- =====================================================

CREATE OR REPLACE FUNCTION archive_rejected_call_report(p_call_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_archive_id UUID;
  v_call_report RECORD;
BEGIN
  -- Get the call report data
  SELECT * INTO v_call_report
  FROM call_reports
  WHERE id = p_call_report_id;

  -- Insert into rejected_archive
  INSERT INTO rejected_archive (
    call_report_id,
    original_id,
    meeting_type,
    logged_by,
    category,
    writer_name,
    suggested_writer,
    contact_email,
    contact_phone,
    contact_address,
    contact_type,
    working_title,
    logline,
    usp,
    target_audience,
    meeting_date,
    meeting_attendees,
    meeting_notes,
    next_steps,
    status,
    average_score,
    total_evaluations,
    rejection_reason,
    created_by,
    original_created_at,
    archived_at
  )
  VALUES (
    v_call_report.call_report_id,
    v_call_report.id,
    v_call_report.meeting_type,
    v_call_report.logged_by,
    v_call_report.category,
    v_call_report.writer_name,
    v_call_report.suggested_writer,
    v_call_report.contact_email,
    v_call_report.contact_phone,
    v_call_report.contact_address,
    v_call_report.contact_type,
    v_call_report.working_title,
    v_call_report.logline,
    v_call_report.usp,
    v_call_report.target_audience,
    v_call_report.meeting_date,
    v_call_report.meeting_attendees,
    v_call_report.meeting_notes,
    v_call_report.next_steps,
    v_call_report.status,
    v_call_report.average_score,
    v_call_report.completed_evaluations,
    'Average score below 5.0 threshold',
    v_call_report.created_by,
    v_call_report.created_at,
    NOW()
  )
  RETURNING id INTO v_archive_id;

  -- Copy all evaluations to evaluations_snapshot
  INSERT INTO evaluations_snapshot (
    archive_id,
    form_id,
    original_evaluation_id,
    evaluator_id,
    evaluator_name,
    evaluator_email,
    premise_conflict_score,
    storyline_plot_score,
    episodic_progression_score,
    characters_score,
    dialogues_score,
    overall_assessment_score,
    average_score,
    comments,
    first_2_eps_required,
    submitted_at
  )
  SELECT
    v_archive_id,
    ef.form_id,
    ef.id,
    ef.evaluator_id,
    u.name,
    u.email,
    ef.premise_conflict_score,
    ef.storyline_plot_score,
    ef.episodic_progression_score,
    ef.characters_score,
    ef.dialogues_score,
    ef.overall_assessment_score,
    ef.average_score,
    ef.comments,
    ef.first_2_eps_required,
    ef.submitted_at
  FROM evaluator_forms ef
  LEFT JOIN users u ON u.id = ef.evaluator_id
  WHERE ef.call_report_id = p_call_report_id;

  -- Update the original call report to mark as archived
  UPDATE call_reports
  SET archived_at = NOW()
  WHERE id = p_call_report_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger: Auto-process evaluations
-- =====================================================

DROP TRIGGER IF EXISTS on_evaluation_submitted ON evaluator_forms;

CREATE TRIGGER on_evaluation_submitted
  AFTER INSERT OR UPDATE ON evaluator_forms
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION process_evaluation_completion();

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON FUNCTION process_evaluation_completion() IS
'Automatically calculates average score and updates call report status when evaluations are submitted. Triggers archival for rejected items.';

COMMENT ON FUNCTION archive_rejected_call_report(UUID) IS
'Archives a rejected call report and all its evaluations to the rejected_archive and evaluations_snapshot tables.';

COMMENT ON TRIGGER on_evaluation_submitted ON evaluator_forms IS
'Triggers automatic evaluation processing when an evaluation is submitted.';

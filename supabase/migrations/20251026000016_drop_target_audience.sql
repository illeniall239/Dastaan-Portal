-- Drop target_audience from call_reports and rejected_archive, and update functions to remove its usage

-- 1) Safely drop column from call_reports if exists
ALTER TABLE public.call_reports
  DROP COLUMN IF EXISTS target_audience;

-- 2) Remove target_audience from rejected_archive table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rejected_archive' AND column_name = 'target_audience'
  ) THEN
    EXECUTE 'ALTER TABLE public.rejected_archive DROP COLUMN target_audience';
  END IF;
END $$;

-- 3) Update archive function to stop referencing target_audience
CREATE OR REPLACE FUNCTION archive_rejected_call_report(p_call_report_id UUID)
RETURNS VOID AS $$
DECLARE
  v_archive_id UUID;
  v_call_report RECORD;
BEGIN
  SELECT * INTO v_call_report FROM call_reports WHERE id = p_call_report_id;

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

  UPDATE call_reports SET archived_at = NOW() WHERE id = p_call_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



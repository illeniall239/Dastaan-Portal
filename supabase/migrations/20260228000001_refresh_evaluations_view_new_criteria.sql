-- Recreate call_report_evaluations_with_type to pick up new evaluator_forms
-- columns added in 20260212000003:
--   conflict_of_content_score, characterization_score, story_progression_score,
--   whats_next_element_score, overall_oneliner_grade_score (+ comment columns)
--
-- PostgreSQL resolves SELECT * in views at creation time; columns added to the
-- base table afterwards are invisible to the view until it is dropped & recreated.
--
-- CREATE OR REPLACE VIEW is not used because it cannot reorder columns —
-- the new ef.* expansion shifts the appended evaluator_name/email columns,
-- causing: "cannot change name of view column". Must DROP first.
--
-- security_invoker = on is re-applied (same as 20260210000002) so the view
-- continues to respect RLS policies on the underlying tables.

DROP VIEW IF EXISTS call_report_evaluations_with_type;

CREATE VIEW call_report_evaluations_with_type AS
SELECT
  ef.*,
  u.name AS evaluator_name,
  u.email AS evaluator_email,
  u.role AS evaluator_role,
  CASE
    WHEN u.role = 'programmer' THEN 'programmer'::TEXT
    WHEN u.role IN ('admin', 'management', 'executive') THEN 'management'::TEXT
    ELSE 'evaluator'::TEXT
  END AS evaluation_type
FROM evaluator_forms ef
INNER JOIN users u ON ef.evaluator_id = u.id;

-- Re-apply security_invoker (lost on DROP; see 20260210000002_secure_unrestricted_views)
ALTER VIEW call_report_evaluations_with_type SET (security_invoker = on);

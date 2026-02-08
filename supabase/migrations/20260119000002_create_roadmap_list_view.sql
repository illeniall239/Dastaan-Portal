-- Create a comprehensive view for the roadmap list to optimize fetching
-- This encapsulates the "determineCurrentStage" logic in SQL

CREATE OR REPLACE VIEW roadmap_list_view AS
SELECT
  cr.id,
  cr.call_report_id,
  cr.working_title,
  cr.created_at,
  cr.updated_at,
  cr.story_id,
  cr.team_id,
  t.name AS team_name,
  t.team_type,
  
  -- Calculate status flags
  (SELECT COUNT(*) > 0 FROM evaluator_forms ef WHERE ef.call_report_id = cr.id AND ef.submitted_at IS NOT NULL) AS has_evaluations,
  (SELECT COUNT(*) >= 3 FROM evaluator_forms ef WHERE ef.call_report_id = cr.id AND ef.submitted_at IS NOT NULL) AS evaluations_complete,
  (SELECT COUNT(*) > 0 FROM detailed_one_liners dol WHERE dol.call_report_id = cr.id) AS has_one_liner,
  
  -- Story linked data flags
  (n.id IS NOT NULL) AS has_negotiation,
  (n.status = 'completed' OR n.status = 'accepted') AS negotiation_complete,
  (lr.id IS NOT NULL) AS has_legal_review,
  (lr.decision = 'approved') AS legal_approved,
  (c.id IS NOT NULL) AS has_contract,
  (c.party_a_signature_date IS NOT NULL AND c.party_b_signature_date IS NOT NULL) AS contract_signed,
  
  -- Payments summary
  (SELECT COUNT(*) FROM payments p
   JOIN payment_schedules ps ON p.schedule_id = ps.id
   JOIN contracts c ON ps.contract_id = c.id
   WHERE c.story_id = cr.story_id) > 0 AS has_payments,
  (
    (SELECT COUNT(*) FROM payments p
     JOIN payment_schedules ps ON p.schedule_id = ps.id
     JOIN contracts c ON ps.contract_id = c.id
     WHERE c.story_id = cr.story_id) > 0 AND
    NOT EXISTS (
      SELECT 1 FROM payments p
      JOIN payment_schedules ps ON p.schedule_id = ps.id
      JOIN contracts c ON ps.contract_id = c.id
      WHERE c.story_id = cr.story_id AND p.status != 'paid'
    )
  ) AS all_payments_paid,

  -- Determine Current Stage (Logic mirroring determineCurrentStage in utils.ts)
  CASE
    WHEN (
      (SELECT COUNT(*) FROM payments p
       JOIN payment_schedules ps ON p.schedule_id = ps.id
       JOIN contracts c ON ps.contract_id = c.id
       WHERE c.story_id = cr.story_id) > 0 AND
      NOT EXISTS (
        SELECT 1 FROM payments p
        JOIN payment_schedules ps ON p.schedule_id = ps.id
        JOIN contracts c ON ps.contract_id = c.id
        WHERE c.story_id = cr.story_id AND p.status != 'paid'
      )
    ) THEN 'completed'

    WHEN (SELECT COUNT(*) FROM payments p
          JOIN payment_schedules ps ON p.schedule_id = ps.id
          JOIN contracts c ON ps.contract_id = c.id
          WHERE c.story_id = cr.story_id) > 0 THEN 'payment'
    
    WHEN (c.party_a_signature_date IS NOT NULL AND c.party_b_signature_date IS NOT NULL) THEN 'payment'
    
    WHEN c.id IS NOT NULL THEN 'contract'
    
    WHEN lr.decision = 'approved' THEN 'contract'
    
    WHEN lr.id IS NOT NULL THEN 'legal_review'
    
    WHEN (n.status = 'completed' OR n.status = 'accepted') THEN 'legal_review'
    
    WHEN n.id IS NOT NULL THEN 'contract_terms'
    
    WHEN (SELECT COUNT(*) > 0 FROM detailed_one_liners dol WHERE dol.call_report_id = cr.id) THEN 'approval'
    
    WHEN (SELECT COUNT(*) >= 3 FROM evaluator_forms ef WHERE ef.call_report_id = cr.id AND ef.submitted_at IS NOT NULL) THEN 'approval'
    
    WHEN (SELECT COUNT(*) > 0 FROM evaluator_forms ef WHERE ef.call_report_id = cr.id AND ef.submitted_at IS NOT NULL) THEN 'evaluation'
    
    ELSE 'submission'
  END AS current_stage,
  
  -- Last Activity Calculation (simplified for view performance, can be refined)
  GREATEST(
    cr.updated_at,
    (SELECT MAX(submitted_at) FROM evaluator_forms ef WHERE ef.call_report_id = cr.id),
    (SELECT created_at FROM detailed_one_liners dol WHERE dol.call_report_id = cr.id),
    n.created_at,
    lr.decided_at,
    c.party_a_signature_date,
    c.party_b_signature_date,
    (SELECT MAX(p.payment_date) FROM payments p
     JOIN payment_schedules ps ON p.schedule_id = ps.id
     JOIN contracts c ON ps.contract_id = c.id
     WHERE c.story_id = cr.story_id)
  ) AS last_activity_at

FROM call_reports cr
LEFT JOIN teams t ON cr.team_id = t.id
LEFT JOIN negotiations n ON cr.story_id = n.story_id
LEFT JOIN legal_reviews lr ON cr.story_id = lr.story_id
LEFT JOIN contracts c ON cr.story_id = c.story_id;

-- Grant access
GRANT SELECT ON roadmap_list_view TO authenticated;
GRANT SELECT ON roadmap_list_view TO service_role;

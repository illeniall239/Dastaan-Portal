-- Delete all evaluations submitted by asad.abidi@geo.tv

-- One-liner evaluations
DELETE FROM evaluator_forms
WHERE evaluator_id = (
  SELECT id FROM auth.users WHERE email = 'asad.abidi@geo.tv'
);

-- Episodic evaluations
DELETE FROM episodic_evaluations
WHERE evaluator_id = (
  SELECT id FROM auth.users WHERE email = 'asad.abidi@geo.tv'
);

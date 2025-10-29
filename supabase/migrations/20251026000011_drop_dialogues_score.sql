-- Drop dialogues_score from evaluator_forms and update dependent triggers/views

ALTER TABLE evaluator_forms
  DROP COLUMN IF EXISTS dialogues_score;

-- If any triggers, computed columns or views reference dialogues_score,
-- they should be updated separately. Existing triggers that calculate
-- averages based on dialogues_score must be revised to exclude it.



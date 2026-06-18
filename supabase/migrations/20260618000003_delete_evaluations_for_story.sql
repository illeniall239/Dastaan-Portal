-- Delete all episodic evaluations for story 8e5c86c6-0c60-4a0e-aa63-a2982451b464
DELETE FROM episodic_evaluations
WHERE episode_id IN (
  SELECT id FROM episodes
  WHERE story_id = '8e5c86c6-0c60-4a0e-aa63-a2982451b464'
);

-- Assistant chat threads & memory (one row per user)
CREATE TABLE IF NOT EXISTS assistant_threads (
  user_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  memory   jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own thread"
  ON assistant_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own thread"
  ON assistant_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own thread"
  ON assistant_threads FOR UPDATE
  USING (auth.uid() = user_id);

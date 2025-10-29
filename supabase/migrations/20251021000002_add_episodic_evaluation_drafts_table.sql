-- Create table for episodic evaluation drafts
CREATE TABLE IF NOT EXISTS episodic_evaluation_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_draft_per_evaluator_per_episode UNIQUE(episode_id, evaluator_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_episodic_evaluation_drafts_episode_id ON episodic_evaluation_drafts(episode_id);
CREATE INDEX IF NOT EXISTS idx_episodic_evaluation_drafts_evaluator_id ON episodic_evaluation_drafts(evaluator_id);

-- Create trigger to automatically update the 'updated_at' column
-- Check if function exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $func$ LANGUAGE 'plpgsql';
    END IF;
END $$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_episodic_evaluation_drafts_updated_at ON episodic_evaluation_drafts;

CREATE TRIGGER update_episodic_evaluation_drafts_updated_at
    BEFORE UPDATE ON episodic_evaluation_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up row level security
ALTER TABLE episodic_evaluation_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (drop first if they exist)
-- Users can only access their own drafts
DROP POLICY IF EXISTS "Users can view own drafts" ON episodic_evaluation_drafts;
CREATE POLICY "Users can view own drafts" ON episodic_evaluation_drafts
    FOR SELECT USING (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can insert own drafts" ON episodic_evaluation_drafts;
CREATE POLICY "Users can insert own drafts" ON episodic_evaluation_drafts
    FOR INSERT WITH CHECK (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can update own drafts" ON episodic_evaluation_drafts;
CREATE POLICY "Users can update own drafts" ON episodic_evaluation_drafts
    FOR UPDATE USING (auth.uid() = evaluator_id);

DROP POLICY IF EXISTS "Users can delete own drafts" ON episodic_evaluation_drafts;
CREATE POLICY "Users can delete own drafts" ON episodic_evaluation_drafts
    FOR DELETE USING (auth.uid() = evaluator_id);
-- ==============================================================================
-- NEET-MDS Top-10 Planner — Supabase Database Schema
-- Architecture: PostgreSQL + Supabase Auth + Row Level Security (RLS)
-- Designed for NEET-MDS 2027 & INI-CET Aspirants • AIR 1-10 Workstation
-- Strict ASCII Quotes Only • Snapshot Deduping • Realtime Enabled
-- ==============================================================================

-- 1. Create table for user progress (Single-document local-first store)
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_device TEXT DEFAULT 'Unknown Device'
);

-- 2. Create table for rolling cloud snapshots (Keeps last 3 snapshots per user for one-tap rollback)
CREATE TABLE IF NOT EXISTS public.user_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  schema_version INT NOT NULL DEFAULT 1,
  device_name TEXT DEFAULT 'Unknown Device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on snapshots for fast retrieval by user ordered by timestamp
CREATE INDEX IF NOT EXISTS idx_snapshots_user_created 
  ON public.user_progress_snapshots(user_id, created_at DESC);

-- 3. Automatic Snapshot Rotation Trigger with Deduplication
-- Only creates a snapshot when data is meaningfully distinct from prior state
CREATE OR REPLACE FUNCTION public.handle_user_progress_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduplicate: Only archive snapshot if data has actually changed
  IF (TG_OP = 'INSERT') OR (OLD.data IS DISTINCT FROM NEW.data) THEN
    INSERT INTO public.user_progress_snapshots (user_id, data, schema_version, device_name, created_at)
    VALUES (NEW.user_id, NEW.data, NEW.schema_version, NEW.last_device, now());

    -- Keep only the latest 3 snapshots for this user, delete older ones
    DELETE FROM public.user_progress_snapshots
    WHERE id IN (
      SELECT id FROM public.user_progress_snapshots
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      OFFSET 3
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_user_progress_snapshot ON public.user_progress;
CREATE TRIGGER tr_user_progress_snapshot
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_progress_snapshot();

-- 4. Enable Row Level Security (RLS) - Mandatory
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_progress
DROP POLICY IF EXISTS "Users can select own progress" ON public.user_progress;
CREATE POLICY "Users can select own progress"
  ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress"
  ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress"
  ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON public.user_progress;
CREATE POLICY "Users can delete own progress"
  ON public.user_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for user_progress_snapshots
DROP POLICY IF EXISTS "Users can select own snapshots" ON public.user_progress_snapshots;
CREATE POLICY "Users can select own snapshots"
  ON public.user_progress_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own snapshots" ON public.user_progress_snapshots;
CREATE POLICY "Users can insert own snapshots"
  ON public.user_progress_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 7. Enable Realtime Replication for user_progress table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;

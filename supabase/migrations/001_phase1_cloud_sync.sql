-- ==============================================================================
-- NEET-MDS Top-10 Planner (MDS OS) - Phase 1 Cloud-First Schema
-- Per-Record Mutable Sync (HLC + 90-day Tombstones + seq) & Immutable Events
-- Strict ASCII Only - RLS Enforced on Every Private Table
-- ==============================================================================

-- 0. Monotonic sequence for delta sync cursors
CREATE SEQUENCE IF NOT EXISTS public.user_records_seq START 1;

-- 1. Mutable Per-Record Table (No single JSON blob)
-- Primary key: (user_id, collection, id)
CREATE TABLE IF NOT EXISTS public.user_records (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  hlc TEXT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT false,
  device_id TEXT NOT NULL,
  seq BIGINT NOT NULL DEFAULT nextval('public.user_records_seq'),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collection, id)
);

CREATE INDEX IF NOT EXISTS idx_user_records_seq
  ON public.user_records(user_id, seq);

CREATE INDEX IF NOT EXISTS idx_user_records_server_updated
  ON public.user_records(user_id, server_updated_at);

-- 2. Immutable Insert-Only Event Tables (No UPDATE or DELETE policies)
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_version INT NOT NULL DEFAULT 1,
  mode TEXT NOT NULL,
  selected_option INT,
  is_correct BOOLEAN,
  time_spent_ms INT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_user_created
  ON public.attempts(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_ms INT,
  subject TEXT,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created
  ON public.study_sessions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 4),
  state_before TEXT,
  stability_before REAL,
  difficulty_before REAL,
  due_before TIMESTAMPTZ,
  elapsed_days REAL,
  scheduled_days REAL,
  reviewed_at TIMESTAMPTZ NOT NULL,
  duration_ms INT,
  device_id TEXT NOT NULL,
  hlc TEXT NOT NULL,
  model_version TEXT,
  params_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_logs_user_card
  ON public.review_logs(user_id, card_id, reviewed_at);

-- 3. Server-Side Admin Rights Table (Never a client flag)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Rolling Cloud Snapshots Table (Last 3 per user, created only when content changes)
CREATE TABLE IF NOT EXISTS public.user_progress_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  schema_version INT NOT NULL DEFAULT 2,
  device_name TEXT DEFAULT 'Unknown Device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_user_created
  ON public.user_progress_snapshots(user_id, created_at DESC);

-- 5. Enable Row Level Security (RLS) on EVERY private table
ALTER TABLE public.user_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS for user_records (full own-row CRUD)
DROP POLICY IF EXISTS "user_records_select_own" ON public.user_records;
CREATE POLICY "user_records_select_own" ON public.user_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_records_insert_own" ON public.user_records;
CREATE POLICY "user_records_insert_own" ON public.user_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_records_update_own" ON public.user_records;
CREATE POLICY "user_records_update_own" ON public.user_records
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_records_delete_own" ON public.user_records;
CREATE POLICY "user_records_delete_own" ON public.user_records
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for immutable event tables: SELECT and INSERT ONLY (NO UPDATE OR DELETE)
DROP POLICY IF EXISTS "attempts_select_own" ON public.attempts;
CREATE POLICY "attempts_select_own" ON public.attempts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "attempts_insert_own" ON public.attempts;
CREATE POLICY "attempts_insert_own" ON public.attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "study_sessions_select_own" ON public.study_sessions;
CREATE POLICY "study_sessions_select_own" ON public.study_sessions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "study_sessions_insert_own" ON public.study_sessions;
CREATE POLICY "study_sessions_insert_own" ON public.study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "review_logs_select_own" ON public.review_logs;
CREATE POLICY "review_logs_select_own" ON public.review_logs
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "review_logs_insert_own" ON public.review_logs;
CREATE POLICY "review_logs_insert_own" ON public.review_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS for admin_users: users may only check their own row
DROP POLICY IF EXISTS "admin_users_select_own" ON public.admin_users;
CREATE POLICY "admin_users_select_own" ON public.admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for snapshots
DROP POLICY IF EXISTS "snapshots_select_own" ON public.user_progress_snapshots;
CREATE POLICY "snapshots_select_own" ON public.user_progress_snapshots
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "snapshots_insert_own" ON public.user_progress_snapshots;
CREATE POLICY "snapshots_insert_own" ON public.user_progress_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Server-side HLC Upsert Function (Higher HLC wins; rejects clocks > 5 min ahead)
CREATE OR REPLACE FUNCTION public.upsert_user_records(records JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  uid UUID := auth.uid();
  rec JSONB;
  v_col TEXT;
  v_id TEXT;
  v_data JSONB;
  v_hlc TEXT;
  v_deleted BOOLEAN;
  v_device_id TEXT;
  v_hlc_ms BIGINT;
  v_server_ms BIGINT := floor(extract(epoch from now()) * 1000)::BIGINT;
  v_existing RECORD;
  v_applied INT := 0;
  v_conflicts JSONB := '[]'::jsonb;
  v_rejected JSONB := '[]'::jsonb;
  v_new_seq BIGINT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF records IS NULL OR jsonb_typeof(records) <> 'array' THEN
    RAISE EXCEPTION 'records must be a JSON array';
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(records)
  LOOP
    v_col := rec->>'collection';
    v_id := rec->>'id';
    v_data := COALESCE(rec->'data', '{}'::jsonb);
    v_hlc := rec->>'hlc';
    v_deleted := COALESCE((rec->>'deleted')::BOOLEAN, false);
    v_device_id := COALESCE(rec->>'device_id', 'unknown');

    IF v_col IS NULL OR v_id IS NULL OR v_hlc IS NULL THEN
      v_rejected := v_rejected || jsonb_build_array(jsonb_build_object('collection', v_col, 'id', v_id, 'reason', 'missing_fields'));
      CONTINUE;
    END IF;

    -- Parse leading physical timestamp (15-digit zero-padded ms before ':')
    BEGIN
      v_hlc_ms := split_part(v_hlc, ':', 1)::BIGINT;
    EXCEPTION WHEN OTHERS THEN
      v_rejected := v_rejected || jsonb_build_array(jsonb_build_object('collection', v_col, 'id', v_id, 'reason', 'invalid_hlc'));
      CONTINUE;
    END;

    -- Reject clocks more than 5 minutes (300000 ms) ahead of server time
    IF v_hlc_ms > (v_server_ms + 300000) THEN
      v_rejected := v_rejected || jsonb_build_array(jsonb_build_object('collection', v_col, 'id', v_id, 'hlc', v_hlc, 'reason', 'clock_more_than_5_minutes_ahead'));
      CONTINUE;
    END IF;

    SELECT * INTO v_existing
    FROM public.user_records
    WHERE user_id = uid AND collection = v_col AND id = v_id
    FOR UPDATE;

    IF NOT FOUND THEN
      v_new_seq := nextval('public.user_records_seq');
      INSERT INTO public.user_records (user_id, collection, id, data, hlc, deleted, device_id, seq, server_updated_at)
      VALUES (uid, v_col, v_id, v_data, v_hlc, v_deleted, v_device_id, v_new_seq, now());
      v_applied := v_applied + 1;
    ELSIF v_hlc > v_existing.hlc THEN
      -- Incoming HLC is higher: record conflict if both live and content differs
      IF (NOT v_existing.deleted) AND (NOT v_deleted) AND (v_existing.data IS DISTINCT FROM v_data) AND (v_existing.device_id <> v_device_id) THEN
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'collection', v_col,
          'id', v_id,
          'winner', 'incoming',
          'winning_hlc', v_hlc,
          'losing_hlc', v_existing.hlc,
          'losing_data', v_existing.data,
          'losing_device', v_existing.device_id
        ));
      END IF;

      v_new_seq := nextval('public.user_records_seq');
      UPDATE public.user_records
      SET data = v_data,
          hlc = v_hlc,
          deleted = v_deleted,
          device_id = v_device_id,
          seq = v_new_seq,
          server_updated_at = now()
      WHERE user_id = uid AND collection = v_col AND id = v_id;
      v_applied := v_applied + 1;
    ELSIF v_hlc < v_existing.hlc THEN
      -- Existing server HLC wins: return losing incoming version as conflict if different
      IF (NOT v_existing.deleted) AND (NOT v_deleted) AND (v_existing.data IS DISTINCT FROM v_data) THEN
        v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
          'collection', v_col,
          'id', v_id,
          'winner', 'server',
          'winning_hlc', v_existing.hlc,
          'losing_hlc', v_hlc,
          'losing_data', v_data,
          'losing_device', v_device_id
        ));
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'applied', v_applied,
    'conflicts', v_conflicts,
    'rejected', v_rejected,
    'server_time', now()
  );
END;
$$;

-- 7. Deduplicated Snapshot Creation Function (Last 3 snapshots per user)
CREATE OR REPLACE FUNCTION public.create_snapshot_if_changed(p_device_name TEXT DEFAULT 'Unknown Device')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID := auth.uid();
  v_agg JSONB;
  v_hash TEXT;
  v_last_hash TEXT;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('collection', collection, 'id', id, 'data', data, 'hlc', hlc, 'deleted', deleted)
      ORDER BY collection, id
    ),
    '[]'::jsonb
  ) INTO v_agg
  FROM public.user_records
  WHERE user_id = uid;

  v_hash := md5(v_agg::text);

  SELECT content_hash INTO v_last_hash
  FROM public.user_progress_snapshots
  WHERE user_id = uid
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_hash IS DISTINCT FROM v_hash THEN
    INSERT INTO public.user_progress_snapshots (user_id, data, content_hash, schema_version, device_name)
    VALUES (uid, v_agg, v_hash, 2, p_device_name);

    DELETE FROM public.user_progress_snapshots
    WHERE id IN (
      SELECT id FROM public.user_progress_snapshots
      WHERE user_id = uid
      ORDER BY created_at DESC
      OFFSET 3
    );
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 8. Keep-Alive RPC to prevent 7-day inactivity pausing on Supabase Free Plan
CREATE OR REPLACE FUNCTION public.keep_alive()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT now();
$$;

-- 9. Enable Realtime Replication on user_records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_records;
  END IF;
END;
$$;

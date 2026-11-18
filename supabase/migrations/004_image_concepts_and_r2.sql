-- Part 7: Concept-first Visual Intelligence schema & Rule R2 / R11 DB enforcement

CREATE TABLE IF NOT EXISTS public.concepts (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases TEXT[] NOT NULL DEFAULT '{}',
  parent_id TEXT REFERENCES public.concepts(id),
  reviewed_key_features TEXT NOT NULL DEFAULT '',
  citation TEXT NOT NULL DEFAULT '',
  reviewed_differentials TEXT[] NOT NULL DEFAULT '{}',
  exam_weight NUMERIC NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('seed', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS concepts_select_all ON public.concepts;
CREATE POLICY concepts_select_all ON public.concepts
  FOR SELECT
  USING (status IN ('seed', 'active') OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS concepts_admin_write ON public.concepts;
CREATE POLICY concepts_admin_write ON public.concepts
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

ALTER TABLE public.image_library
  ADD COLUMN IF NOT EXISTS concept_id TEXT REFERENCES public.concepts(id),
  ADD COLUMN IF NOT EXISTS non_commercial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_assisted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pmcid TEXT,
  ADD COLUMN IF NOT EXISTS doi TEXT;

CREATE TABLE IF NOT EXISTS public.image_ingest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_tier TEXT NOT NULL,
  concept_id TEXT NOT NULL REFERENCES public.concepts(id),
  fetched_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_reasons JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.image_ingest_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ingest_logs_admin_all ON public.image_ingest_logs;
CREATE POLICY ingest_logs_admin_all ON public.image_ingest_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

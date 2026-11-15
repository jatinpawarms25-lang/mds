-- Phase 5: Versioned Academic Content Packs & Question Bank (Data Domain B)
-- Rule R6: Every exam fact carries source, confidence (official | secondary | estimate), and verified_at.
-- Rule R9: Content updates never overwrite user_records, mocks, attempts, or review_logs.

CREATE TABLE IF NOT EXISTS public.content_packs (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'published')),
  payload JSONB NOT NULL,
  source TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('official', 'secondary', 'estimate')),
  verified_at DATE NOT NULL,
  published_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_bank (
  id TEXT PRIMARY KEY,
  pack_version TEXT REFERENCES public.content_packs(version) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  part TEXT NOT NULL CHECK (part IN ('A', 'B')),
  stem TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_idx INT NOT NULL CHECK (correct_idx >= 0 AND correct_idx <= 3),
  explanation TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('official', 'secondary', 'estimate')),
  verified_at DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'published')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.content_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_packs_select_published ON public.content_packs;
CREATE POLICY content_packs_select_published ON public.content_packs
  FOR SELECT
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS content_packs_admin_write ON public.content_packs;
CREATE POLICY content_packs_admin_write ON public.content_packs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

DROP POLICY IF EXISTS question_bank_select_published ON public.question_bank;
CREATE POLICY question_bank_select_published ON public.question_bank
  FOR SELECT
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS question_bank_admin_write ON public.question_bank;
CREATE POLICY question_bank_admin_write ON public.question_bank
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

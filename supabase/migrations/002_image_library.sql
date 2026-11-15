-- Phase 4: Real Image Library (Data Domain C) with DB-enforced Rule R1 & R2 CHECK constraints

CREATE TABLE IF NOT EXISTS public.image_library (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  subject TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('radiograph', 'histology', 'clinical photo', 'diagram', 'instrument')),
  ai_generated BOOLEAN NOT NULL DEFAULT false CHECK (ai_generated = false),
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'published', 'rejected')),
  licence TEXT,
  author TEXT,
  credit_line TEXT,
  source_page_url TEXT,
  citation TEXT,
  image_url TEXT,
  is_placeholder BOOLEAN NOT NULL DEFAULT false,
  key_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  look_alikes TEXT,
  occlusion_masks JSONB NOT NULL DEFAULT '[]'::jsonb,
  date_verified DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT published_requires_attribution CHECK (
    status <> 'published' OR (
      coalesce(length(trim(licence)), 0) > 0 AND
      coalesce(length(trim(author)), 0) > 0 AND
      coalesce(length(trim(credit_line)), 0) > 0 AND
      coalesce(length(trim(source_page_url)), 0) > 0 AND
      coalesce(length(trim(citation)), 0) > 0 AND
      ai_generated = false
    )
  )
);

ALTER TABLE public.image_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS image_library_select_published ON public.image_library;
CREATE POLICY image_library_select_published ON public.image_library
  FOR SELECT
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid())
  );

DROP POLICY IF EXISTS image_library_admin_write ON public.image_library;
CREATE POLICY image_library_admin_write ON public.image_library
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid()));

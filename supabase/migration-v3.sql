-- ============================================
-- MIGRATION V3 — Sexual Health opt-in, Section content,
--               Blog with moderation, App config
-- ============================================

-- 1. Add wants_salud_sexual to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS wants_salud_sexual boolean NOT NULL DEFAULT false;

-- 2. Extend submodules with rich section content fields
ALTER TABLE public.submodules
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS content_type text CHECK (content_type IN ('text', 'video', 'html', 'mixed')),
  ADD COLUMN IF NOT EXISTS content jsonb;

-- 3. Relax patient_components priority_order constraint to allow >4
-- (Previously only allowed 1-4; now we store only priorities 1-3 + sexual health is handled separately)
ALTER TABLE public.patient_components
  DROP CONSTRAINT IF EXISTS patient_components_priority_order_check;

ALTER TABLE public.patient_components
  ADD CONSTRAINT patient_components_priority_order_check
    CHECK (priority_order BETWEEN 1 AND 3);

-- 4. Blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  moderator_response text,
  responded_by uuid REFERENCES public.users(id),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON public.blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_patient ON public.blog_posts(patient_id);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Patients can insert their own posts
CREATE POLICY "Patients can insert own blog posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Patients can view only approved posts (+ their own)
CREATE POLICY "Patients can view approved posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'approved' OR auth.uid() = patient_id);

-- Admins can view all posts
CREATE POLICY "Admins can view all blog posts"
  ON public.blog_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can manage all posts (approve, reject, respond)
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. App configuration table (key-value store)
CREATE TABLE IF NOT EXISTS public.app_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read config
CREATE POLICY "Authenticated can read app config"
  ON public.app_config FOR SELECT
  USING (auth.role() = 'authenticated');

-- Admins can manage config
CREATE POLICY "Admins can manage app config"
  ON public.app_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at on app_config
CREATE TRIGGER on_app_config_updated
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Seed default app config
INSERT INTO public.app_config (key, value)
  VALUES ('en_vivo_caimed_url', '')
  ON CONFLICT (key) DO NOTHING;

-- ============================================
-- DONE — Run this in Supabase SQL Editor
-- ============================================

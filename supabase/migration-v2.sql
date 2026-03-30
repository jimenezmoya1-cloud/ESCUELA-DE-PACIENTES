-- ============================================
-- MIGRATION V2 — Personalized Routes, Submodules, Monday Unlocks, PDFs
-- ============================================

-- 1. Patient Component Selection (priority components for personalized route)
CREATE TABLE IF NOT EXISTS public.patient_components (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  priority_order integer NOT NULL CHECK (priority_order BETWEEN 1 AND 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, priority_order),
  UNIQUE(patient_id, component_name)
);

ALTER TABLE public.patient_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own components"
  ON public.patient_components FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert own components"
  ON public.patient_components FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can delete own components"
  ON public.patient_components FOR DELETE
  USING (auth.uid() = patient_id);

CREATE POLICY "Admins can view all components"
  ON public.patient_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Submodules within each module
CREATE TABLE IF NOT EXISTS public.submodules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submodules_module ON public.submodules(module_id);

ALTER TABLE public.submodules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view submodules"
  ON public.submodules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage submodules"
  ON public.submodules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger for updated_at on submodules
CREATE TRIGGER on_submodule_updated
  BEFORE UPDATE ON public.submodules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Submodule completions (track patient progress within modules)
CREATE TABLE IF NOT EXISTS public.submodule_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  submodule_id uuid NOT NULL REFERENCES public.submodules(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, submodule_id)
);

CREATE INDEX idx_submodule_completions_user ON public.submodule_completions(user_id);

ALTER TABLE public.submodule_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own submodule completions"
  ON public.submodule_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submodule completions"
  ON public.submodule_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submodule completions"
  ON public.submodule_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Patient Module Unlocks (Monday-based progressive unlock tracking)
CREATE TABLE IF NOT EXISTS public.patient_module_unlocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, module_id)
);

CREATE INDEX idx_patient_module_unlocks_patient ON public.patient_module_unlocks(patient_id);

ALTER TABLE public.patient_module_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks"
  ON public.patient_module_unlocks FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert own unlocks"
  ON public.patient_module_unlocks FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Admins can view all unlocks"
  ON public.patient_module_unlocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all unlocks"
  ON public.patient_module_unlocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Module PDFs (file attachments via Supabase Storage)
CREATE TABLE IF NOT EXISTS public.module_pdfs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  submodule_id uuid REFERENCES public.submodules(id) ON DELETE CASCADE,
  filename text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_module_pdfs_module ON public.module_pdfs(module_id);

ALTER TABLE public.module_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view module pdfs"
  ON public.module_pdfs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage module pdfs"
  ON public.module_pdfs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Add component_key to modules for mapping to components
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS component_key text;

-- Update existing modules with component keys
UPDATE public.modules SET component_key = 'empowerment' WHERE "order" = 1;
UPDATE public.modules SET component_key = 'actividad_fisica' WHERE "order" = 2;
UPDATE public.modules SET component_key = 'alimentacion' WHERE "order" = 3;
UPDATE public.modules SET component_key = 'salud_sexual' WHERE "order" = 4;
UPDATE public.modules SET component_key = 'peso' WHERE "order" = 5;
UPDATE public.modules SET component_key = 'presion_arterial' WHERE "order" = 6;
UPDATE public.modules SET component_key = 'glucosa' WHERE "order" = 7;
UPDATE public.modules SET component_key = 'colesterol' WHERE "order" = 8;
UPDATE public.modules SET component_key = 'nicotina' WHERE "order" = 9;
UPDATE public.modules SET component_key = 'salud_mental' WHERE "order" = 10;
UPDATE public.modules SET component_key = 'sueno' WHERE "order" = 11;
UPDATE public.modules SET component_key = 'red_de_apoyo' WHERE "order" = 12;
UPDATE public.modules SET component_key = 'adherencia' WHERE "order" = 13;
UPDATE public.modules SET component_key = 'empowerment_cierre' WHERE "order" = 14;

-- 7. Add has_selected_components flag to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_selected_components boolean NOT NULL DEFAULT false;

-- 8. Create storage bucket for module PDFs (run in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('module-pdfs', 'module-pdfs', true);

-- 9. Add sort_order to modules (alias for existing "order" column — we'll use "order" directly)
-- The existing "order" column already serves this purpose

-- Done! Run this migration in Supabase SQL Editor.

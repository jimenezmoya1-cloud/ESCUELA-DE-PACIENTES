-- ============================================
-- MIGRATION V7 — Rol clínico, columnas profesionales, auditoría
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Ampliar el check de role para aceptar 'clinico'
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('patient', 'admin', 'clinico'));

-- 2. Columnas profesionales en users (nullable; solo se usan para staff)
alter table public.users add column if not exists profession text
  check (profession is null or profession in ('medico', 'enfermero', 'otro'));
alter table public.users add column if not exists specialty text;
alter table public.users add column if not exists medical_registration text;
alter table public.users add column if not exists professional_id_card text;
alter table public.users add column if not exists is_active boolean not null default true;

-- 3. Helper: usuario es staff clínico (admin o clinico)
create or replace function public.is_clinical_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'clinico')
      and is_active = true
  );
$$;

-- 4. Auditoría en patient_assessments
-- Hacer created_by nullable para soportar auto-diligenciado futuro
alter table public.patient_assessments alter column created_by drop not null;

-- Agregar last_modified_by + last_modified_at
alter table public.patient_assessments add column if not exists last_modified_by uuid
  references public.users(id);
alter table public.patient_assessments add column if not exists last_modified_at timestamptz;

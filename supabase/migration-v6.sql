-- ============================================
-- MIGRATION V6 — HISTORIA CLÍNICA CAIMED CARDIOPREVENTIVA
-- Tablas: patient_clinical_profile, patient_assessments
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Tabla de perfil clínico (1 fila por paciente, mutable)
create table if not exists public.patient_clinical_profile (
  user_id uuid primary key references public.users(id) on delete cascade,
  primer_nombre text,
  segundo_nombre text,
  primer_apellido text,
  segundo_apellido text,
  tipo_documento text,
  documento text,
  fecha_nacimiento date,
  sexo text,
  genero text,
  telefono text,
  correo text,
  regimen_afiliacion text,
  aseguradora text,
  prepagada text,
  plan_complementario text,
  pais_nacimiento text default 'Colombia',
  pais_residencia text default 'Colombia',
  departamento_residencia text,
  municipio_residencia text,
  direccion_residencia text,
  contacto_emergencia_nombre text,
  contacto_emergencia_parentesco text,
  contacto_emergencia_telefono text,
  updated_at timestamptz default now()
);

-- 2. Tabla de evaluaciones (append-only)
create table if not exists public.patient_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_by uuid not null references public.users(id),
  created_at timestamptz default now(),
  components jsonb not null,
  is_sca boolean default false,
  is_dm2 boolean default false,
  is_pluripatologico boolean default false,
  is_poca_expectativa boolean default false,
  score_global int not null,
  meta_score int not null,
  nivel text not null,
  alertas_criticas jsonb default '[]'::jsonb,
  alertas_orientadoras jsonb default '[]'::jsonb,
  raw_questionnaire jsonb,
  notes text
);

create index if not exists idx_patient_assessments_user_created
  on public.patient_assessments (user_id, created_at desc);

-- 3. RLS — patient_clinical_profile
alter table public.patient_clinical_profile enable row level security;

create policy "Profile readable by owner or admin"
  on public.patient_clinical_profile for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Profile writable by admin only"
  on public.patient_clinical_profile for insert
  with check (public.is_admin());

create policy "Profile updatable by admin only"
  on public.patient_clinical_profile for update
  using (public.is_admin());

-- 4. RLS — patient_assessments (append-only: no update, no delete)
alter table public.patient_assessments enable row level security;

create policy "Assessments readable by owner or admin"
  on public.patient_assessments for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Assessments writable by admin only"
  on public.patient_assessments for insert
  with check (public.is_admin());

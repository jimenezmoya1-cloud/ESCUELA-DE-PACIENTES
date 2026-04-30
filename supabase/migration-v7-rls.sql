-- ============================================
-- MIGRATION V7-RLS — Permitir clinico en tablas clínicas
-- Ejecutar en SQL Editor de Supabase DESPUÉS de migration-v7.sql
-- ============================================

-- patient_clinical_profile: agregar políticas para clinico
drop policy if exists "Profile readable by owner or admin" on public.patient_clinical_profile;
drop policy if exists "Profile writable by admin only" on public.patient_clinical_profile;
drop policy if exists "Profile updatable by admin only" on public.patient_clinical_profile;

create policy "Profile readable by owner or staff"
  on public.patient_clinical_profile for select
  using (auth.uid() = user_id or public.is_clinical_staff());

create policy "Profile writable by staff"
  on public.patient_clinical_profile for insert
  with check (public.is_clinical_staff());

create policy "Profile updatable by staff"
  on public.patient_clinical_profile for update
  using (public.is_clinical_staff());

-- patient_assessments: agregar políticas para clinico
drop policy if exists "Assessments readable by owner or admin" on public.patient_assessments;
drop policy if exists "Assessments writable by admin only" on public.patient_assessments;

create policy "Assessments readable by owner or staff"
  on public.patient_assessments for select
  using (auth.uid() = user_id or public.is_clinical_staff());

create policy "Assessments writable by staff"
  on public.patient_assessments for insert
  with check (public.is_clinical_staff());

-- Permitir UPDATE en assessments (para last_modified_by/at)
create policy "Assessments updatable by staff"
  on public.patient_assessments for update
  using (public.is_clinical_staff());

-- users: permitir a admin gestionar staff (insert/update con role staff)
-- (las políticas actuales ya están en fix-rls.sql; solo necesitamos verificar
--  que admin pueda insertar con role='clinico' — lo que ya cubre la política
--  "Admins can update all users" si existe; si no, agregar:)
drop policy if exists "Admins can update all users" on public.users;

create policy "Admins can update all users"
  on public.users for update
  using (public.is_admin());

-- Política ya existente que permite insert de cualquier user; suficiente
-- para invitaciones porque la invitación crea el row vía service-role.

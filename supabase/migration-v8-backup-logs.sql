-- ============================================
-- MIGRATION V8 — Tabla de auditoría de backups del Excel clínico
-- Ejecutar en SQL Editor de Supabase
-- ============================================

create table if not exists public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  triggered_at timestamptz not null default now(),
  triggered_by text not null check (triggered_by in ('cron', 'manual')),
  status text not null check (status in ('ok', 'error')),
  file_url text,
  file_id text,
  rows_exported integer,
  error_message text,
  duration_ms integer
);

create index if not exists idx_backup_logs_triggered_at
  on public.backup_logs (triggered_at desc);

-- RLS — solo staff clínico (admin + clinico) puede ver el historial.
-- Solo el service-role escribe (los endpoints corren con admin client al loguear).
alter table public.backup_logs enable row level security;

create policy "Backup logs readable by staff"
  on public.backup_logs for select
  using (public.is_clinical_staff());

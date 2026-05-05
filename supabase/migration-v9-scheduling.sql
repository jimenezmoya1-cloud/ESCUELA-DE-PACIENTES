-- ============================================
-- v9 — SCHEDULING & PAYMENTS
-- Agendamiento de evaluaciones de salud
-- ============================================

-- 1. Horario base recurrente del clínico
create table if not exists public.clinician_schedules (
  id uuid default gen_random_uuid() primary key,
  clinician_id uuid not null references public.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0=domingo, 1=lunes, ..., 6=sábado
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinician_schedules_time_order check (end_time > start_time)
);
create index if not exists idx_clinician_schedules_clinician
  on public.clinician_schedules(clinician_id) where is_active;

-- 2. Bloqueos puntuales del clínico
create table if not exists public.schedule_blocks (
  id uuid default gen_random_uuid() primary key,
  clinician_id uuid not null references public.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint schedule_blocks_time_order check (end_at > start_at)
);
create index if not exists idx_schedule_blocks_clinician_range
  on public.schedule_blocks(clinician_id, start_at, end_at);

-- 3. Pagos (Wompi y manuales)
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.users(id) on delete cascade,
  plan text not null check (plan in ('single', 'pack3')),
  amount_cop bigint not null check (amount_cop > 0),       -- centavos: 8000000 = $80.000 COP
  source text not null check (source in ('wompi', 'manual_offline')),
  status text not null check (status in ('pending', 'approved', 'declined', 'voided', 'error')),
  -- Wompi only
  wompi_reference text unique,
  wompi_transaction_id text,
  raw_payload jsonb,
  -- Manual only
  created_by_admin_id uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists idx_payments_patient on public.payments(patient_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_created on public.payments(created_at desc);

-- 4. Créditos del paciente
create table if not exists public.evaluation_credits (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('wompi', 'manual_offline')),
  payment_id uuid references public.payments(id) on delete set null,
  amount integer not null check (amount > 0),               -- 1 o 3
  remaining integer not null check (remaining >= 0),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_evaluation_credits_patient on public.evaluation_credits(patient_id);
create index if not exists idx_evaluation_credits_active
  on public.evaluation_credits(patient_id, purchased_at) where remaining > 0;

-- 5. Citas reservadas
create table if not exists public.appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.users(id) on delete cascade,
  clinician_id uuid not null references public.users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,                              -- starts_at + 30 min
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  credit_id uuid references public.evaluation_credits(id),
  cancelled_by uuid references public.users(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  credit_returned boolean not null default false,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (ends_at > starts_at)
);
-- Anti doble-booking: solo una cita activa por (clinician_id, starts_at)
create unique index if not exists uniq_appointment_clinician_slot
  on public.appointments(clinician_id, starts_at) where status = 'scheduled';
create index if not exists idx_appointments_patient on public.appointments(patient_id);
create index if not exists idx_appointments_clinician_range
  on public.appointments(clinician_id, starts_at);

-- 6. Auditoría de acciones administrativas
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid not null references public.users(id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_target on public.audit_log(target_type, target_id);
create index if not exists idx_audit_log_actor on public.audit_log(actor_id, created_at desc);

-- 7. Log de emails enviados (diagnóstico, no para reintento)
create table if not exists public.email_log (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.users(id),
  recipient_email text not null,
  template text not null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  resend_id text,
  sent_at timestamptz not null default now()
);
create index if not exists idx_email_log_recipient on public.email_log(recipient_id, sent_at desc);

-- 8. Mensajes de sistema (extender messages existente)
alter table public.messages
  add column if not exists is_system boolean not null default false,
  add column if not exists message_kind text;

-- Permitir from_user_id NULL para mensajes de sistema
alter table public.messages alter column from_user_id drop not null;

-- Constraint: si is_system=false, from_user_id es obligatorio
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_from_user_required_for_human'
  ) then
    alter table public.messages
      add constraint messages_from_user_required_for_human
      check (is_system = true or from_user_id is not null);
  end if;
end $$;

-- 9. Trigger updated_at en clinician_schedules y appointments (reutiliza handle_updated_at existente)
drop trigger if exists on_clinician_schedules_updated on public.clinician_schedules;
create trigger on_clinician_schedules_updated
  before update on public.clinician_schedules
  for each row execute function public.handle_updated_at();

drop trigger if exists on_appointments_updated on public.appointments;
create trigger on_appointments_updated
  before update on public.appointments
  for each row execute function public.handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.clinician_schedules enable row level security;
alter table public.schedule_blocks      enable row level security;
alter table public.payments             enable row level security;
alter table public.evaluation_credits   enable row level security;
alter table public.appointments         enable row level security;
alter table public.audit_log            enable row level security;
alter table public.email_log            enable row level security;

-- ----------------------------------------
-- clinician_schedules
-- ----------------------------------------
create policy "clinico self-manage schedules" on public.clinician_schedules
  for all
  using ( clinician_id = auth.uid() )
  with check ( clinician_id = auth.uid() );

create policy "admin all schedules" on public.clinician_schedules
  for all
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ----------------------------------------
-- schedule_blocks (mismo patrón)
-- ----------------------------------------
create policy "clinico self-manage blocks" on public.schedule_blocks
  for all
  using ( clinician_id = auth.uid() )
  with check ( clinician_id = auth.uid() );

create policy "admin all blocks" on public.schedule_blocks
  for all
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ----------------------------------------
-- payments
-- ----------------------------------------
-- Paciente lee SUS pagos (sin raw_payload — se filtra a nivel app, no SQL).
create policy "patient read own payments" on public.payments
  for select
  using ( patient_id = auth.uid() );

create policy "admin all payments" on public.payments
  for all
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ----------------------------------------
-- evaluation_credits
-- ----------------------------------------
create policy "patient read own credits" on public.evaluation_credits
  for select
  using ( patient_id = auth.uid() );

create policy "admin all credits" on public.evaluation_credits
  for all
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ----------------------------------------
-- appointments
-- ----------------------------------------
create policy "patient read own appointments" on public.appointments
  for select
  using ( patient_id = auth.uid() );

create policy "clinico read own appointments" on public.appointments
  for select
  using ( clinician_id = auth.uid() );

create policy "admin all appointments" on public.appointments
  for all
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') )
  with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ----------------------------------------
-- audit_log y email_log: solo admin
-- ----------------------------------------
create policy "admin read audit log" on public.audit_log
  for select
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

create policy "admin insert audit log" on public.audit_log
  for insert
  with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

create policy "admin read email log" on public.email_log
  for select
  using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ============================================
-- FUNCIÓN ROUND-ROBIN
-- ============================================
-- Dado un slot de inicio (timestamptz UTC), devuelve el clinician_id
-- con menos citas futuras programadas, entre los que tienen ese slot disponible.
-- Devuelve NULL si nadie está disponible.

create or replace function public.pick_least_loaded_clinician(slot_start timestamptz)
returns uuid
language sql stable
as $$
  with available as (
    select u.id as clinician_id
    from public.users u
    where u.role = 'clinico'
      and u.is_active = true
      and exists (
        select 1 from public.clinician_schedules cs
        where cs.clinician_id = u.id
          and cs.is_active
          and cs.weekday = extract(dow from (slot_start at time zone 'America/Bogota'))::int
          and cs.start_time <= (slot_start at time zone 'America/Bogota')::time
          and cs.end_time   >= ((slot_start + interval '30 minutes') at time zone 'America/Bogota')::time
      )
      and not exists (
        select 1 from public.schedule_blocks sb
        where sb.clinician_id = u.id
          and sb.start_at <= slot_start
          and sb.end_at   >  slot_start
      )
      and not exists (
        select 1 from public.appointments a
        where a.clinician_id = u.id
          and a.status = 'scheduled'
          and a.starts_at = slot_start
      )
  ),
  load_count as (
    select av.clinician_id,
           (select count(*) from public.appointments a
            where a.clinician_id = av.clinician_id
              and a.status = 'scheduled'
              and a.starts_at >= now()) as pending_count
    from available av
  )
  select clinician_id
  from load_count
  order by pending_count asc, clinician_id asc
  limit 1;
$$;

-- ============================================
-- SEED APP_CONFIG
-- ============================================
insert into public.app_config (key, value) values
  ('teams_meeting_url', ''),
  ('price_single_cop', '8000000'),       -- $80.000 COP en centavos
  ('price_pack3_cop', '16800000'),       -- $168.000 COP en centavos
  ('wompi_environment', 'sandbox'),
  ('wompi_public_key', '')
on conflict (key) do nothing;

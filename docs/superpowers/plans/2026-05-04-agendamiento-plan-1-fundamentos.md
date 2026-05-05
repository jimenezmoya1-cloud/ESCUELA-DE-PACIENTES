# Agendamiento — Plan 1: Fundamentos + Pagos manuales

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear el schema completo del sistema de agendamiento + página de configuración admin + flujo de pago manual offline (admin registra pagos y otorga créditos), sin tocar UI del paciente todavía.

**Architecture:** Una sola migración SQL crea todas las tablas del feature (incluso las que se usan en planes posteriores) para no necesitar más migraciones. Admin recibe `/admin/configuracion` (link Teams, precios) y `/admin/citas` con tab "Pagos" funcional. Server actions atómicos crean pagos manuales y créditos. Nada visible al paciente en este plan.

**Tech Stack:** Next.js 16 + Supabase (Postgres + RLS) + Tailwind 4 + framer-motion. Sin librerías nuevas en este plan.

**Spec:** [docs/superpowers/specs/2026-05-04-agendamiento-evaluaciones-design.md](../specs/2026-05-04-agendamiento-evaluaciones-design.md)

**Verificación:** Este proyecto no tiene framework de tests instalado. Cada tarea cierra con **pasos manuales de verificación** explícitos (SQL, click-through). El framework de tests se introduce en el Plan 2 cuando aparece la lógica testeable de cómputo de slots.

**Convenciones del proyecto a respetar (importante leer antes):**
- Antes de tocar Next.js, leer `node_modules/next/dist/docs/` — esta versión tiene breaking changes vs. lo que conoces.
- Server actions siguen patrón de `src/app/(admin)/admin/personal/actions.ts`: `"use server"`, validación con `getCurrentProfile()` + `isAdmin()`, retornan `{ ok: true } | { ok: false, error: string }`.
- Cliente Supabase admin (bypass RLS) viene de `@/lib/supabase/admin`. Cliente con sesión viene de `@/lib/supabase/server`.
- En user-facing copy NUNCA decir "historia clínica" ni "HC" — siempre "evaluación de salud".
- Money en COP se almacena en **centavos** (bigint): $80.000 COP = `8000000` centavos.
- Todas las fechas se guardan en `timestamptz` (UTC); UI siempre muestra en `America/Bogota`.

---

## File Structure

**Crear:**
- `supabase/migration-v9-scheduling.sql` — migración con todas las tablas, indices, RLS, función round-robin.
- `src/lib/payments/types.ts` — tipos compartidos `Plan`, `PaymentSource`, `PaymentStatus`, `Payment`, `EvaluationCredit`.
- `src/lib/payments/config.ts` — helper para leer/escribir keys de `app_config` relacionadas a pagos y agendamiento.
- `src/lib/payments/credits.ts` — `getRemainingCreditsForPatient()`, `consumeCredit()`, `returnCredit()`.
- `src/app/(admin)/admin/configuracion/page.tsx` — server component, lee config, renderiza form.
- `src/app/(admin)/admin/configuracion/actions.ts` — server actions `updateAppConfig`.
- `src/components/admin/ConfiguracionForm.tsx` — client component con campos editables.
- `src/app/(admin)/admin/citas/layout.tsx` — layout con tabs.
- `src/app/(admin)/admin/citas/page.tsx` — redirect a `/admin/citas/pagos`.
- `src/app/(admin)/admin/citas/calendario/page.tsx` — placeholder ("Disponible en Plan 3").
- `src/app/(admin)/admin/citas/tabla/page.tsx` — placeholder ("Disponible en Plan 3").
- `src/app/(admin)/admin/citas/pagos/page.tsx` — server component lista de pagos + créditos.
- `src/app/(admin)/admin/citas/pagos/actions.ts` — server actions `registerManualPayment`, `adjustCredit`.
- `src/components/admin/PagosTable.tsx` — tabla de pagos con filtros básicos (client).
- `src/components/admin/RegistrarPagoManualModal.tsx` — modal con form para registrar pago manual.
- `src/components/admin/AjustarCreditosModal.tsx` — modal para sumar/restar créditos manualmente.
- `src/components/admin/PatientAutocomplete.tsx` — combobox que busca pacientes por nombre/email (reutilizable).

**Modificar:**
- `src/components/admin/AdminShell.tsx` — agregar entradas de nav para "Citas" y "Configuración".

---

## Task 1 — Migración SQL: tablas + indices

**Files:**
- Create: `supabase/migration-v9-scheduling.sql`

- [ ] **Step 1: Crear el archivo de migración con todas las tablas + indices**

```sql
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
  created_at timestamptz not null default now(),
  constraint evaluation_credits_remaining_lte_amount check (remaining <= amount)
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
    select 1 from pg_constraint
    where conname = 'messages_from_user_required_for_human'
      and conrelid = 'public.messages'::regclass
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
```

- [ ] **Step 2: Verificar sintaxis localmente**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && cat supabase/migration-v9-scheduling.sql | head -20`
Expected: muestra las primeras 20 líneas sin errores de archivo.

- [ ] **Step 3: NO commitear todavía** — acumulamos las secciones SQL antes del primer commit.

---

## Task 2 — Migración SQL: RLS policies

**Files:**
- Modify: `supabase/migration-v9-scheduling.sql` (append)

- [ ] **Step 1: Agregar al final del archivo todas las RLS policies**

```sql
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
```

- [ ] **Step 2: NO commitear todavía**

---

## Task 3 — Migración SQL: función round-robin + seed app_config

**Files:**
- Modify: `supabase/migration-v9-scheduling.sql` (append)

- [ ] **Step 1: Agregar función pick_least_loaded_clinician y seed de app_config**

```sql
-- ============================================
-- FUNCIÓN ROUND-ROBIN
-- ============================================
-- Dado un slot de inicio (timestamptz UTC), devuelve el clinician_id
-- con menos citas futuras programadas, entre los que tienen ese slot disponible.
-- Devuelve NULL si nadie está disponible.

create or replace function public.pick_least_loaded_clinician(slot_start timestamptz)
returns uuid
language sql stable security definer set search_path = public
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
          and sb.start_at <  (slot_start + interval '30 minutes')
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
```

- [ ] **Step 2: Commitear la migración completa**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add supabase/migration-v9-scheduling.sql
git commit -m "feat(scheduling): add v9 migration — tables, RLS, round-robin, seed"
```

---

## Task 4 — Aplicar migración en Supabase y verificar

**Files:** ninguno

- [ ] **Step 1: Conectar al SQL Editor de Supabase del proyecto y ejecutar el contenido de `supabase/migration-v9-scheduling.sql`**

(Esto se hace en la web de Supabase: Dashboard → SQL Editor → New query → pegar contenido → Run.)

Expected: ejecuta sin errores. Algunas líneas pueden decir "NOTICE" pero no "ERROR".

- [ ] **Step 2: Verificar tablas creadas**

Ejecutar en SQL Editor:
```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('clinician_schedules', 'schedule_blocks', 'payments', 'evaluation_credits', 'appointments', 'audit_log', 'email_log')
order by table_name;
```
Expected: 7 filas, una por cada tabla.

- [ ] **Step 3: Verificar índice único anti-doble-booking**

```sql
select indexname from pg_indexes
where tablename = 'appointments' and indexname = 'uniq_appointment_clinician_slot';
```
Expected: 1 fila.

- [ ] **Step 4: Verificar función round-robin**

```sql
select pick_least_loaded_clinician(now() + interval '7 days');
```
Expected: NULL (todavía no hay clínicos con horarios configurados, eso es Plan 2).

- [ ] **Step 5: Verificar seeds de app_config**

```sql
select key, value from app_config
where key in ('teams_meeting_url', 'price_single_cop', 'price_pack3_cop', 'wompi_environment', 'wompi_public_key')
order by key;
```
Expected: 5 filas.

- [ ] **Step 6: Verificar RLS habilitada**

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('clinician_schedules', 'schedule_blocks', 'payments', 'evaluation_credits', 'appointments', 'audit_log', 'email_log')
order by tablename;
```
Expected: 7 filas, todas con `rowsecurity = true`.

- [ ] **Step 7: Si algo falla, NO seguir adelante** — corregir la migración y re-aplicar (las definiciones usan `if not exists` así que es idempotente para la mayoría de cosas; las RLS policies sí necesitan `drop policy if exists` + recreate manualmente si fallaron a la primera).

---

## Task 5 — Tipos compartidos de pagos

**Files:**
- Create: `src/lib/payments/types.ts`

- [ ] **Step 1: Crear el archivo con tipos**

```typescript
export type Plan = "single" | "pack3"
export type PaymentSource = "wompi" | "manual_offline"
export type PaymentStatus = "pending" | "approved" | "declined" | "voided" | "error"

export interface Payment {
  id: string
  patient_id: string
  plan: Plan
  amount_cop: number          // en centavos
  source: PaymentSource
  status: PaymentStatus
  wompi_reference: string | null
  wompi_transaction_id: string | null
  created_by_admin_id: string | null
  notes: string | null
  created_at: string          // ISO
  approved_at: string | null
}

export interface EvaluationCredit {
  id: string
  patient_id: string
  source: PaymentSource
  payment_id: string | null
  amount: number              // 1 o 3
  remaining: number
  purchased_at: string
  expires_at: string | null
  notes: string | null
  created_at: string
}

export const PLAN_LABEL: Record<Plan, string> = {
  single: "1 evaluación",
  pack3: "3 evaluaciones",
}

export const PLAN_AMOUNT_OF_CREDITS: Record<Plan, number> = {
  single: 1,
  pack3: 3,
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  declined: "Rechazado",
  voided: "Anulado",
  error: "Error",
}

export const SOURCE_LABEL: Record<PaymentSource, string> = {
  wompi: "Wompi",
  manual_offline: "Manual",
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/lib/payments/types.ts
git commit -m "feat(scheduling): add payment domain types"
```

---

## Task 6 — Helper de configuración

**Files:**
- Create: `src/lib/payments/config.ts`

- [ ] **Step 1: Crear helper que lee/escribe app_config**

```typescript
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface SchedulingConfig {
  teamsMeetingUrl: string
  priceSingleCop: number
  pricePack3Cop: number
  wompiEnvironment: "sandbox" | "production"
  wompiPublicKey: string
}

const DEFAULTS: SchedulingConfig = {
  teamsMeetingUrl: "",
  priceSingleCop: 8000000,
  pricePack3Cop: 16800000,
  wompiEnvironment: "sandbox",
  wompiPublicKey: "",
}

/** Lee la config completa. Usa el cliente de sesión (RLS aplica — solo authenticated puede leer). */
export async function getSchedulingConfig(): Promise<SchedulingConfig> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", [
      "teams_meeting_url",
      "price_single_cop",
      "price_pack3_cop",
      "wompi_environment",
      "wompi_public_key",
    ])

  const map = new Map<string, string>((data ?? []).map((r) => [r.key, r.value]))
  return {
    teamsMeetingUrl: map.get("teams_meeting_url") ?? DEFAULTS.teamsMeetingUrl,
    priceSingleCop: parseInt(map.get("price_single_cop") ?? String(DEFAULTS.priceSingleCop), 10),
    pricePack3Cop: parseInt(map.get("price_pack3_cop") ?? String(DEFAULTS.pricePack3Cop), 10),
    wompiEnvironment: (map.get("wompi_environment") as SchedulingConfig["wompiEnvironment"]) ?? DEFAULTS.wompiEnvironment,
    wompiPublicKey: map.get("wompi_public_key") ?? DEFAULTS.wompiPublicKey,
  }
}

/** Actualiza una key. Usa admin client (bypass RLS) — el caller debe haber validado que es admin. */
export async function setConfigValue(key: string, value: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("app_config")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) throw new Error(`No se pudo actualizar ${key}: ${error.message}`)
}

export function copToCents(cop: number): number {
  return Math.round(cop * 100)
}

export function centsToCop(cents: number): number {
  return cents / 100
}

export function formatCop(cents: number): string {
  const cop = centsToCop(cents)
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cop)
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/lib/payments/config.ts
git commit -m "feat(scheduling): add scheduling config helper"
```

---

## Task 7 — Helper de créditos

**Files:**
- Create: `src/lib/payments/credits.ts`

- [ ] **Step 1: Crear helper que consulta y manipula créditos**

```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import type { EvaluationCredit, Plan, PaymentSource } from "./types"
import { PLAN_AMOUNT_OF_CREDITS } from "./types"

/** Total de créditos restantes del paciente (suma de remaining en filas activas). */
export async function getRemainingCreditsForPatient(patientId: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("evaluation_credits")
    .select("remaining")
    .eq("patient_id", patientId)
    .gt("remaining", 0)

  if (error) throw new Error(`No se pudieron leer créditos: ${error.message}`)
  return (data ?? []).reduce((sum, row) => sum + row.remaining, 0)
}

/** Lista todos los créditos del paciente (incluye agotados, ordenados por más reciente). */
export async function listCreditsForPatient(patientId: string): Promise<EvaluationCredit[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("evaluation_credits")
    .select("*")
    .eq("patient_id", patientId)
    .order("purchased_at", { ascending: false })

  if (error) throw new Error(`No se pudieron leer créditos: ${error.message}`)
  return (data ?? []) as EvaluationCredit[]
}

/**
 * Crea una fila de evaluation_credits a partir de un pago aprobado.
 * El caller debe haber validado el pago. Retorna el id del crédito creado.
 */
export async function createCreditFromPayment(args: {
  patientId: string
  paymentId: string
  plan: Plan
  source: PaymentSource
  notes?: string | null
}): Promise<string> {
  const admin = createAdminClient()
  const amount = PLAN_AMOUNT_OF_CREDITS[args.plan]
  const { data, error } = await admin
    .from("evaluation_credits")
    .insert({
      patient_id: args.patientId,
      payment_id: args.paymentId,
      source: args.source,
      amount,
      remaining: amount,
      notes: args.notes ?? null,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(`No se pudo crear el crédito: ${error?.message ?? "sin datos"}`)
  return data.id
}

/**
 * Consume 1 crédito del paciente (FIFO — el más antiguo con remaining > 0).
 * Retorna { creditId, remaining } después del consumo. Lanza error si no hay créditos.
 * NOTA: este helper se usa al crear una cita. En Plan 2 se llama desde la server action de booking.
 */
export async function consumeOneCredit(patientId: string): Promise<{ creditId: string; remaining: number }> {
  const admin = createAdminClient()
  // Buscar el crédito FIFO con remaining > 0
  const { data: candidate, error: selErr } = await admin
    .from("evaluation_credits")
    .select("id, remaining")
    .eq("patient_id", patientId)
    .gt("remaining", 0)
    .order("purchased_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selErr) throw new Error(`Error leyendo créditos: ${selErr.message}`)
  if (!candidate) throw new Error("Sin créditos disponibles")

  const newRemaining = candidate.remaining - 1
  const { error: updErr } = await admin
    .from("evaluation_credits")
    .update({ remaining: newRemaining })
    .eq("id", candidate.id)
    .eq("remaining", candidate.remaining)            // optimistic concurrency
  if (updErr) throw new Error(`Error consumiendo crédito: ${updErr.message}`)
  return { creditId: candidate.id, remaining: newRemaining }
}

/** Devuelve 1 crédito a un crédito específico. Usado al cancelar una cita con reembolso de crédito. */
export async function returnOneCredit(creditId: string): Promise<void> {
  const admin = createAdminClient()
  // Incrementar remaining en 1, sin pasar amount
  const { data: row, error: selErr } = await admin
    .from("evaluation_credits")
    .select("amount, remaining")
    .eq("id", creditId)
    .single()

  if (selErr || !row) throw new Error(`Crédito no encontrado: ${selErr?.message ?? creditId}`)
  if (row.remaining >= row.amount) {
    throw new Error("El crédito ya está al máximo")
  }
  const { error: updErr } = await admin
    .from("evaluation_credits")
    .update({ remaining: row.remaining + 1 })
    .eq("id", creditId)
  if (updErr) throw new Error(`Error devolviendo crédito: ${updErr.message}`)
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/lib/payments/credits.ts
git commit -m "feat(scheduling): add credits helpers (read, consume FIFO, return)"
```

---

## Task 8 — Modificar AdminShell para agregar nav

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Agregar nuevos iconos al inicio del archivo (después de los iconos existentes)**

Buscar la línea con `const stethoscopeIcon = (` y agregar **después de su cierre** (`)`) los siguientes iconos:

```tsx
const calendarIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const settingsIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
```

- [ ] **Step 2: Modificar el array `navGroups`** para agregar dos entradas:

Agregar a "Gestión administrativa" la entrada de Citas (visible para admin), y agregar una nueva sección "Sistema" para Configuración:

Buscar el grupo:
```tsx
{
  label: "Gestión administrativa",
  visibleTo: ["admin"],
  items: [
    { href: "/admin/convenios", label: "Convenios", icon: conveniosIcon },
    { href: "/admin/codigos", label: "Códigos de acceso", icon: codesIcon },
    { href: "/admin/personal", label: "Personal", icon: personalIcon },
  ],
},
```

Reemplazar por:
```tsx
{
  label: "Gestión administrativa",
  visibleTo: ["admin"],
  items: [
    { href: "/admin/convenios", label: "Convenios", icon: conveniosIcon },
    { href: "/admin/codigos", label: "Códigos de acceso", icon: codesIcon },
    { href: "/admin/personal", label: "Personal", icon: personalIcon },
    { href: "/admin/citas", label: "Citas", icon: calendarIcon },
  ],
},
{
  label: "Sistema",
  visibleTo: ["admin"],
  items: [
    { href: "/admin/configuracion", label: "Configuración", icon: settingsIcon },
  ],
},
```

- [ ] **Step 3: Verificar visualmente con dev server**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev
```

Abrir `http://localhost:3000/admin` (login con cuenta admin). Esperado: en el sidebar aparecen "Citas" y "Configuración" como nuevos items. Click en cada uno → 404 (no hay páginas todavía, normal).

- [ ] **Step 4: Detener dev server (Ctrl-C) y commitear**

```bash
git add src/components/admin/AdminShell.tsx
git commit -m "feat(scheduling): add Citas and Configuración to admin nav"
```

---

## Task 9 — Página /admin/configuracion (server component)

**Files:**
- Create: `src/app/(admin)/admin/configuracion/page.tsx`

- [ ] **Step 1: Crear el server component que carga config y la pasa al form**

```tsx
import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { getSchedulingConfig } from "@/lib/payments/config"
import ConfiguracionForm from "@/components/admin/ConfiguracionForm"

export const dynamic = "force-dynamic"

export default async function ConfiguracionPage() {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const config = await getSchedulingConfig()

  return (
    <div className="space-y-8 p-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Configuración</h1>
        <p className="text-sm text-tertiary">
          Ajustes globales del sistema de agendamiento. Los cambios afectan a todos los pacientes.
        </p>
      </header>

      <ConfiguracionForm initial={config} />
    </div>
  )
}
```

- [ ] **Step 2: Crear el archivo aunque dependa de un componente que aún no existe** — el siguiente task lo crea.

- [ ] **Step 3: NO commitear todavía** — esperamos al form para que compile.

---

## Task 10 — Server actions de configuración

**Files:**
- Create: `src/app/(admin)/admin/configuracion/actions.ts`

- [ ] **Step 1: Crear server actions para guardar config**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { setConfigValue, copToCents } from "@/lib/payments/config"

type Result = { ok: true } | { ok: false; error: string }

export async function updateSchedulingConfig(input: {
  teamsMeetingUrl: string
  priceSingleCop: number          // input es en pesos enteros (ej. 80000), no centavos
  pricePack3Cop: number
  wompiEnvironment: "sandbox" | "production"
  wompiPublicKey: string
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  // Validaciones
  const url = input.teamsMeetingUrl.trim()
  if (url && !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "El link de Teams debe empezar con http:// o https://" }
  }
  if (input.priceSingleCop < 1000 || input.pricePack3Cop < 1000) {
    return { ok: false, error: "Precios deben ser al menos $1.000 COP" }
  }
  if (input.priceSingleCop > 100_000_000 || input.pricePack3Cop > 100_000_000) {
    return { ok: false, error: "Precios irrazonablemente altos" }
  }
  if (input.wompiEnvironment !== "sandbox" && input.wompiEnvironment !== "production") {
    return { ok: false, error: "Wompi environment inválido" }
  }

  try {
    await setConfigValue("teams_meeting_url", url)
    await setConfigValue("price_single_cop", String(copToCents(input.priceSingleCop)))
    await setConfigValue("price_pack3_cop", String(copToCents(input.pricePack3Cop)))
    await setConfigValue("wompi_environment", input.wompiEnvironment)
    await setConfigValue("wompi_public_key", input.wompiPublicKey.trim())
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error guardando configuración" }
  }

  revalidatePath("/admin/configuracion")
  return { ok: true }
}
```

- [ ] **Step 2: Commitear configuracion server-side completo**

```bash
git add src/app/\(admin\)/admin/configuracion/page.tsx src/app/\(admin\)/admin/configuracion/actions.ts
git commit -m "feat(scheduling): add /admin/configuracion server-side"
```

---

## Task 11 — Form client component de configuración

**Files:**
- Create: `src/components/admin/ConfiguracionForm.tsx`

- [ ] **Step 1: Crear form con campos editables**

```tsx
"use client"

import { useState, useTransition } from "react"
import type { SchedulingConfig } from "@/lib/payments/config"
import { centsToCop } from "@/lib/payments/config"
import { updateSchedulingConfig } from "@/app/(admin)/admin/configuracion/actions"

export default function ConfiguracionForm({ initial }: { initial: SchedulingConfig }) {
  const [teamsUrl, setTeamsUrl] = useState(initial.teamsMeetingUrl)
  const [priceSingle, setPriceSingle] = useState<string>(String(centsToCop(initial.priceSingleCop)))
  const [pricePack3, setPricePack3] = useState<string>(String(centsToCop(initial.pricePack3Cop)))
  const [wompiEnv, setWompiEnv] = useState<SchedulingConfig["wompiEnvironment"]>(initial.wompiEnvironment)
  const [wompiKey, setWompiKey] = useState(initial.wompiPublicKey)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const res = await updateSchedulingConfig({
        teamsMeetingUrl: teamsUrl,
        priceSingleCop: Number(priceSingle) || 0,
        pricePack3Cop: Number(pricePack3) || 0,
        wompiEnvironment: wompiEnv,
        wompiPublicKey: wompiKey,
      })
      if (res.ok) {
        setFeedback({ kind: "ok", msg: "Configuración guardada" })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-tertiary/10 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-neutral">Microsoft Teams</h2>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Link de la reunión</span>
          <input
            type="url"
            value={teamsUrl}
            onChange={(e) => setTeamsUrl(e.target.value)}
            placeholder="https://teams.microsoft.com/l/meetup-join/..."
            className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <span className="mt-1 block text-xs text-tertiary">
            Este link se reutiliza para todas las evaluaciones. Se desbloquea al paciente 24h antes de su cita.
          </span>
        </label>
      </section>

      <section className="rounded-xl border border-tertiary/10 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-neutral">Precios (COP)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral">1 evaluación</span>
            <div className="mt-1 flex rounded-lg border border-tertiary/20 focus-within:border-primary">
              <span className="flex items-center px-3 text-sm text-tertiary">$</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={priceSingle}
                onChange={(e) => setPriceSingle(e.target.value)}
                className="block w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral">Paquete de 3 evaluaciones</span>
            <div className="mt-1 flex rounded-lg border border-tertiary/20 focus-within:border-primary">
              <span className="flex items-center px-3 text-sm text-tertiary">$</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={pricePack3}
                onChange={(e) => setPricePack3(e.target.value)}
                className="block w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-tertiary/10 bg-white p-6 space-y-4 opacity-70">
        <h2 className="text-lg font-medium text-neutral">Wompi (se activa en Plan 6)</h2>
        <p className="text-xs text-tertiary">
          Estos campos se llenan cuando tengas las credenciales de Wompi. Por ahora se pueden dejar vacíos.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral">Environment</span>
            <select
              value={wompiEnv}
              onChange={(e) => setWompiEnv(e.target.value as SchedulingConfig["wompiEnvironment"])}
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="sandbox">sandbox</option>
              <option value="production">production</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-neutral">Public key</span>
            <input
              type="text"
              value={wompiKey}
              onChange={(e) => setWompiKey(e.target.value)}
              placeholder="pub_prod_..."
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
        {feedback && (
          <span className={`text-sm ${feedback.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verificar manualmente**

```bash
npm run dev
```

Login admin → `/admin/configuracion`. Esperado:
- Página carga sin errores.
- Tres secciones: Microsoft Teams / Precios / Wompi.
- Cargar valor de prueba en link Teams (ej. `https://teams.microsoft.com/test`), cambiar precio single a 75000.
- Click "Guardar cambios" → ver mensaje "Configuración guardada".
- Recargar página → valores persisten.

Verificar en SQL Editor de Supabase:
```sql
select key, value from app_config where key in ('teams_meeting_url','price_single_cop') order by key;
```
Expected: `teams_meeting_url = 'https://teams.microsoft.com/test'`, `price_single_cop = '7500000'`.

- [ ] **Step 3: Restaurar valores**

En la UI, regresar `price_single_cop` a 80000 y guardar.

- [ ] **Step 4: Detener dev server y commitear**

```bash
git add src/components/admin/ConfiguracionForm.tsx
git commit -m "feat(scheduling): add ConfiguracionForm client component"
```

---

## Task 12 — Layout de /admin/citas con tabs

**Files:**
- Create: `src/app/(admin)/admin/citas/layout.tsx`
- Create: `src/app/(admin)/admin/citas/page.tsx`

- [ ] **Step 1: Crear layout con navegación de tabs**

```tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"

export default async function CitasLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const tabs = [
    { href: "/admin/citas/calendario", label: "Calendario" },
    { href: "/admin/citas/tabla", label: "Tabla de citas" },
    { href: "/admin/citas/pagos", label: "Pagos y créditos" },
  ]

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Citas</h1>
        <p className="text-sm text-tertiary">
          Calendario maestro, tabla de citas y gestión de pagos y créditos.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-tertiary/10">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-t-lg px-4 py-2 text-sm font-medium text-tertiary hover:text-neutral data-[active=true]:border-b-2 data-[active=true]:border-primary data-[active=true]:text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  )
}
```

> **Nota:** el `data-[active=true]` es estático aquí — Plan 1 no necesita resaltar el tab activo (es un nice-to-have). En Plan 3 cuando se itere sobre la UI se puede agregar `usePathname()` en un componente cliente para resaltar.

- [ ] **Step 2: Crear page.tsx que redirige a la tab por defecto**

```tsx
import { redirect } from "next/navigation"

export default function CitasIndex() {
  redirect("/admin/citas/pagos")
}
```

> Plan 1 enfoca en pagos; redirigimos directo allá. En Plan 3 cambiamos default a `/admin/citas/calendario`.

- [ ] **Step 3: Commitear**

```bash
git add "src/app/(admin)/admin/citas/layout.tsx" "src/app/(admin)/admin/citas/page.tsx"
git commit -m "feat(scheduling): add /admin/citas layout with tabs"
```

---

## Task 13 — Páginas placeholder de Calendario y Tabla

**Files:**
- Create: `src/app/(admin)/admin/citas/calendario/page.tsx`
- Create: `src/app/(admin)/admin/citas/tabla/page.tsx`

- [ ] **Step 1: Crear placeholder de Calendario**

```tsx
export const dynamic = "force-dynamic"

export default function CitasCalendarioPage() {
  return (
    <div className="rounded-xl border border-dashed border-tertiary/30 p-12 text-center">
      <h2 className="text-lg font-medium text-neutral">Calendario de citas</h2>
      <p className="mt-2 text-sm text-tertiary">
        Esta vista se construye en el Plan 3. Por ahora puedes gestionar pagos y créditos en la pestaña anterior.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Crear placeholder de Tabla**

```tsx
export const dynamic = "force-dynamic"

export default function CitasTablaPage() {
  return (
    <div className="rounded-xl border border-dashed border-tertiary/30 p-12 text-center">
      <h2 className="text-lg font-medium text-neutral">Tabla de citas</h2>
      <p className="mt-2 text-sm text-tertiary">
        Esta vista se construye en el Plan 3.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commitear**

```bash
git add "src/app/(admin)/admin/citas/calendario/page.tsx" "src/app/(admin)/admin/citas/tabla/page.tsx"
git commit -m "feat(scheduling): add placeholder pages for calendario and tabla tabs"
```

---

## Task 14 — Server actions para pagos manuales

**Files:**
- Create: `src/app/(admin)/admin/citas/pagos/actions.ts`

- [ ] **Step 1: Crear actions: registerManualPayment, adjustCredit, listPayments**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { copToCents } from "@/lib/payments/config"
import { createCreditFromPayment } from "@/lib/payments/credits"
import type { Plan, Payment } from "@/lib/payments/types"

type Result = { ok: true } | { ok: false; error: string }

export async function registerManualPayment(input: {
  patientId: string
  plan: Plan
  amountCop: number          // pesos enteros, ej. 80000
  notes: string
}): Promise<Result & { paymentId?: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.patientId) return { ok: false, error: "Paciente requerido" }
  if (input.plan !== "single" && input.plan !== "pack3") {
    return { ok: false, error: "Plan inválido" }
  }
  if (!Number.isFinite(input.amountCop) || input.amountCop < 1000) {
    return { ok: false, error: "Monto inválido" }
  }
  if (!input.notes.trim()) {
    return { ok: false, error: "Nota obligatoria (ej: número de transferencia, banco)" }
  }

  const admin = createAdminClient()

  // 1. Validar que el paciente existe y es paciente
  const { data: patient, error: pErr } = await admin
    .from("users")
    .select("id, role")
    .eq("id", input.patientId)
    .single()
  if (pErr || !patient) return { ok: false, error: "Paciente no encontrado" }
  if (patient.role !== "patient") return { ok: false, error: "El usuario no es un paciente" }

  // 2. Crear payment row
  const nowIso = new Date().toISOString()
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      patient_id: input.patientId,
      plan: input.plan,
      amount_cop: copToCents(input.amountCop),
      source: "manual_offline",
      status: "approved",
      created_by_admin_id: profile!.id,
      notes: input.notes.trim(),
      approved_at: nowIso,
    })
    .select("id")
    .single()

  if (payErr || !payment) {
    return { ok: false, error: `No se pudo crear el pago: ${payErr?.message ?? "sin datos"}` }
  }

  // 3. Crear el crédito asociado
  let creditId: string
  try {
    creditId = await createCreditFromPayment({
      patientId: input.patientId,
      paymentId: payment.id,
      plan: input.plan,
      source: "manual_offline",
      notes: input.notes.trim(),
    })
  } catch (e) {
    // Rollback: borrar el payment
    await admin.from("payments").delete().eq("id", payment.id)
    return { ok: false, error: e instanceof Error ? e.message : "Error creando crédito" }
  }

  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "manual_payment",
    target_type: "payment",
    target_id: payment.id,
    metadata: { credit_id: creditId, plan: input.plan, patient_id: input.patientId },
  })

  revalidatePath("/admin/citas/pagos")
  return { ok: true, paymentId: payment.id }
}

export async function adjustCredit(input: {
  patientId: string
  delta: number          // ej. +1, -1
  reason: string
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.reason.trim()) return { ok: false, error: "Razón obligatoria" }
  if (!Number.isFinite(input.delta) || input.delta === 0) {
    return { ok: false, error: "Delta inválido" }
  }
  if (Math.abs(input.delta) > 10) {
    return { ok: false, error: "Delta fuera de rango razonable (máx ±10)" }
  }

  const admin = createAdminClient()

  if (input.delta > 0) {
    // Sumar: crear un crédito sintético amount=delta
    const { error } = await admin.from("evaluation_credits").insert({
      patient_id: input.patientId,
      source: "manual_offline",
      payment_id: null,
      amount: input.delta,
      remaining: input.delta,
      notes: `Ajuste manual: ${input.reason.trim()}`,
    })
    if (error) return { ok: false, error: error.message }
  } else {
    // Restar: descontar de remaining (FIFO)
    let toRemove = -input.delta
    while (toRemove > 0) {
      const { data: row, error: selErr } = await admin
        .from("evaluation_credits")
        .select("id, remaining")
        .eq("patient_id", input.patientId)
        .gt("remaining", 0)
        .order("purchased_at", { ascending: true })
        .limit(1)
        .maybeSingle()
      if (selErr) return { ok: false, error: selErr.message }
      if (!row) return { ok: false, error: "El paciente no tiene suficientes créditos para restar" }

      const take = Math.min(row.remaining, toRemove)
      const { error: updErr } = await admin
        .from("evaluation_credits")
        .update({ remaining: row.remaining - take })
        .eq("id", row.id)
      if (updErr) return { ok: false, error: updErr.message }
      toRemove -= take
    }
  }

  // Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "adjust_credit",
    target_type: "user",
    target_id: input.patientId,
    metadata: { delta: input.delta, reason: input.reason.trim() },
  })

  revalidatePath("/admin/citas/pagos")
  return { ok: true }
}

/** Lista pagos paginados, ordenados por fecha desc. */
export async function listPayments(input: {
  limit?: number
  offset?: number
  search?: string          // nombre o email del paciente
  status?: string
  source?: string
}): Promise<{ ok: true; payments: (Payment & { patient_name: string; patient_email: string })[]; total: number } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const limit = input.limit ?? 50
  const offset = input.offset ?? 0
  const admin = createAdminClient()

  // Join por columna (más estable que depender del nombre auto-generado del FK)
  let query = admin
    .from("payments")
    .select("*, users!patient_id(name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (input.status) query = query.eq("status", input.status)
  if (input.source) query = query.eq("source", input.source)

  const { data, error, count } = await query
  if (error) return { ok: false, error: error.message }

  // Normalizar shape: aplanar nombre/email del join
  const payments = (data ?? []).map((row: any) => {
    const u = row.users
    return {
      ...row,
      users: undefined,
      patient_name: u?.name ?? "(sin nombre)",
      patient_email: u?.email ?? "",
    } as Payment & { patient_name: string; patient_email: string }
  })

  // Filtro por search en memoria (simplificado para Plan 1; en Plan 3 se hace con ilike sobre el join)
  const filtered = input.search
    ? payments.filter(
        (p) =>
          p.patient_name.toLowerCase().includes(input.search!.toLowerCase()) ||
          p.patient_email.toLowerCase().includes(input.search!.toLowerCase()),
      )
    : payments

  return { ok: true, payments: filtered, total: count ?? 0 }
}
```

- [ ] **Step 2: Verificar tipo de Payment vs select** — el select de `listPayments` retorna `*` que incluye todas las columnas que definí en `Payment`. Verifica los nombres en `src/lib/payments/types.ts` matchean: `id`, `patient_id`, `plan`, `amount_cop`, `source`, `status`, `wompi_reference`, `wompi_transaction_id`, `created_by_admin_id`, `notes`, `created_at`, `approved_at`. ✓

- [ ] **Step 3: Commitear**

```bash
git add "src/app/(admin)/admin/citas/pagos/actions.ts"
git commit -m "feat(scheduling): add manual payment server actions"
```

---

## Task 15 — Componente PatientAutocomplete

**Files:**
- Create: `src/components/admin/PatientAutocomplete.tsx`

- [ ] **Step 1: Crear combobox que busca pacientes (server-side via fetch)**

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export interface PatientLite {
  id: string
  name: string
  email: string
}

export default function PatientAutocomplete({
  value,
  onChange,
}: {
  value: PatientLite | null
  onChange: (patient: PatientLite | null) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PatientLite[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "patient")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)
      setResults((data ?? []) as PatientLite[])
    }, 250)
  }, [query, supabase])

  if (value) {
    return (
      <div className="rounded-lg border border-tertiary/20 px-3 py-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral">{value.name}</div>
          <div className="text-xs text-tertiary">{value.email}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setQuery("")
          }}
          className="text-xs text-tertiary hover:text-neutral"
        >
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar paciente por nombre o correo..."
        className="block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-tertiary/20 bg-white shadow-lg">
          {results.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onChange(p)
                setQuery("")
                setOpen(false)
              }}
              className="cursor-pointer px-3 py-2 hover:bg-background"
            >
              <div className="text-sm font-medium text-neutral">{p.name}</div>
              <div className="text-xs text-tertiary">{p.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/components/admin/PatientAutocomplete.tsx
git commit -m "feat(scheduling): add PatientAutocomplete combobox"
```

---

## Task 16 — Modal de registrar pago manual

**Files:**
- Create: `src/components/admin/RegistrarPagoManualModal.tsx`

- [ ] **Step 1: Crear modal**

```tsx
"use client"

import { useState, useTransition } from "react"
import { registerManualPayment } from "@/app/(admin)/admin/citas/pagos/actions"
import PatientAutocomplete, { type PatientLite } from "./PatientAutocomplete"
import type { Plan } from "@/lib/payments/types"

interface Props {
  open: boolean
  onClose: () => void
  defaultPriceSingle: number     // pesos enteros, ej. 80000
  defaultPricePack3: number      // pesos enteros, ej. 168000
  onSuccess: () => void
}

export default function RegistrarPagoManualModal({
  open,
  onClose,
  defaultPriceSingle,
  defaultPricePack3,
  onSuccess,
}: Props) {
  const [patient, setPatient] = useState<PatientLite | null>(null)
  const [plan, setPlan] = useState<Plan>("single")
  const [amount, setAmount] = useState<string>(String(defaultPriceSingle))
  const [notes, setNotes] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handlePlanChange(newPlan: Plan) {
    setPlan(newPlan)
    setAmount(String(newPlan === "single" ? defaultPriceSingle : defaultPricePack3))
  }

  function reset() {
    setPatient(null)
    setPlan("single")
    setAmount(String(defaultPriceSingle))
    setNotes("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!patient) {
      setError("Selecciona un paciente")
      return
    }
    startTransition(async () => {
      const res = await registerManualPayment({
        patientId: patient.id,
        plan,
        amountCop: Number(amount) || 0,
        notes,
      })
      if (res.ok) {
        reset()
        onSuccess()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Registrar pago manual</h2>
        <p className="mb-6 text-sm text-tertiary">
          Para pagos por transferencia, consignación o cualquier vía fuera de la pasarela. Otorga créditos al paciente inmediatamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Paciente</label>
            <div className="mt-1">
              <PatientAutocomplete value={patient} onChange={setPatient} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Plan</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePlanChange("single")}
                className={`rounded-lg border px-3 py-2 text-left ${
                  plan === "single" ? "border-primary bg-primary/5" : "border-tertiary/20"
                }`}
              >
                <div className="text-sm font-medium text-neutral">1 evaluación</div>
                <div className="text-xs text-tertiary">${defaultPriceSingle.toLocaleString("es-CO")}</div>
              </button>
              <button
                type="button"
                onClick={() => handlePlanChange("pack3")}
                className={`rounded-lg border px-3 py-2 text-left ${
                  plan === "pack3" ? "border-primary bg-primary/5" : "border-tertiary/20"
                }`}
              >
                <div className="text-sm font-medium text-neutral">3 evaluaciones</div>
                <div className="text-xs text-tertiary">${defaultPricePack3.toLocaleString("es-CO")}</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Monto cobrado (COP)</label>
            <div className="mt-1 flex rounded-lg border border-tertiary/20">
              <span className="flex items-center px-3 text-sm text-tertiary">$</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-tertiary">
              Pre-llenado con el precio del plan. Editable si cobraste un monto distinto.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Nota / referencia</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Transferencia Bancolombia, ref 123456 — 12/05/2026"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/components/admin/RegistrarPagoManualModal.tsx
git commit -m "feat(scheduling): add RegistrarPagoManualModal"
```

---

## Task 17 — Modal de ajustar créditos

**Files:**
- Create: `src/components/admin/AjustarCreditosModal.tsx`

- [ ] **Step 1: Crear modal**

```tsx
"use client"

import { useState, useTransition } from "react"
import { adjustCredit } from "@/app/(admin)/admin/citas/pagos/actions"
import PatientAutocomplete, { type PatientLite } from "./PatientAutocomplete"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AjustarCreditosModal({ open, onClose, onSuccess }: Props) {
  const [patient, setPatient] = useState<PatientLite | null>(null)
  const [delta, setDelta] = useState<string>("1")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setPatient(null)
    setDelta("1")
    setReason("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!patient) {
      setError("Selecciona un paciente")
      return
    }
    const deltaNum = parseInt(delta, 10)
    if (!Number.isFinite(deltaNum) || deltaNum === 0) {
      setError("Delta debe ser distinto de 0")
      return
    }
    startTransition(async () => {
      const res = await adjustCredit({ patientId: patient.id, delta: deltaNum, reason })
      if (res.ok) {
        reset()
        onSuccess()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Ajustar créditos</h2>
        <p className="mb-6 text-sm text-tertiary">
          Suma o resta créditos manualmente. Razón obligatoria, queda en la auditoría.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Paciente</label>
            <div className="mt-1">
              <PatientAutocomplete value={patient} onChange={setPatient} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Delta</label>
            <input
              type="number"
              min={-10}
              max={10}
              step={1}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-tertiary">
              Positivo para sumar, negativo para restar. Rango: ±10.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? "Aplicando..." : "Aplicar ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/components/admin/AjustarCreditosModal.tsx
git commit -m "feat(scheduling): add AjustarCreditosModal"
```

---

## Task 18 — Tabla de pagos (client component)

**Files:**
- Create: `src/components/admin/PagosTable.tsx`

- [ ] **Step 1: Crear tabla con filtros y refresh**

```tsx
"use client"

import { useState, useEffect, useTransition } from "react"
import { listPayments } from "@/app/(admin)/admin/citas/pagos/actions"
import { formatCop } from "@/lib/payments/config"
import { PLAN_LABEL, STATUS_LABEL, SOURCE_LABEL } from "@/lib/payments/types"
import type { Payment } from "@/lib/payments/types"
import RegistrarPagoManualModal from "./RegistrarPagoManualModal"
import AjustarCreditosModal from "./AjustarCreditosModal"

type PaymentRow = Payment & { patient_name: string; patient_email: string }

interface Props {
  defaultPriceSingle: number     // pesos enteros
  defaultPricePack3: number
}

export default function PagosTable({ defaultPriceSingle, defaultPricePack3 }: Props) {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)

  const refresh = () => {
    startTransition(async () => {
      const res = await listPayments({ search, status: statusFilter, source: sourceFilter })
      if (res.ok) setRows(res.payments)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sourceFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="Buscar paciente..."
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="approved">Aprobado</option>
            <option value="pending">Pendiente</option>
            <option value="declined">Rechazado</option>
            <option value="voided">Anulado</option>
            <option value="error">Error</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todas las fuentes</option>
            <option value="manual_offline">Manual</option>
            <option value="wompi">Wompi</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreditModal(true)}
            className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-neutral hover:bg-background"
          >
            Ajustar créditos
          </button>
          <button
            onClick={() => setShowPagoModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Registrar pago manual
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tertiary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Paciente</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Monto</th>
              <th className="px-4 py-3 text-left font-medium">Fuente</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {pending && rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-tertiary">Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-tertiary">Sin pagos registrados todavía.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-tertiary/10">
                  <td className="px-4 py-3 text-neutral whitespace-nowrap">
                    {new Date(p.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral">{p.patient_name}</div>
                    <div className="text-xs text-tertiary">{p.patient_email}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral">{PLAN_LABEL[p.plan]}</td>
                  <td className="px-4 py-3 text-neutral">{formatCop(p.amount_cop)}</td>
                  <td className="px-4 py-3 text-neutral">{SOURCE_LABEL[p.source]}</td>
                  <td className="px-4 py-3 text-neutral">{STATUS_LABEL[p.status]}</td>
                  <td className="px-4 py-3 text-tertiary text-xs max-w-xs truncate" title={p.notes ?? ""}>{p.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RegistrarPagoManualModal
        open={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        defaultPriceSingle={defaultPriceSingle}
        defaultPricePack3={defaultPricePack3}
        onSuccess={refresh}
      />
      <AjustarCreditosModal
        open={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onSuccess={refresh}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commitear**

```bash
git add src/components/admin/PagosTable.tsx
git commit -m "feat(scheduling): add PagosTable with filters and modals"
```

---

## Task 19 — Página /admin/citas/pagos

**Files:**
- Create: `src/app/(admin)/admin/citas/pagos/page.tsx`

- [ ] **Step 1: Crear server component que carga config y pinta tabla**

```tsx
import { getSchedulingConfig, centsToCop } from "@/lib/payments/config"
import PagosTable from "@/components/admin/PagosTable"

export const dynamic = "force-dynamic"

export default async function PagosPage() {
  const config = await getSchedulingConfig()

  return (
    <PagosTable
      defaultPriceSingle={centsToCop(config.priceSingleCop)}
      defaultPricePack3={centsToCop(config.pricePack3Cop)}
    />
  )
}
```

- [ ] **Step 2: Commitear**

```bash
git add "src/app/(admin)/admin/citas/pagos/page.tsx"
git commit -m "feat(scheduling): add /admin/citas/pagos page"
```

---

## Task 20 — Verificación end-to-end manual

**Files:** ninguno

- [ ] **Step 1: Levantar dev server**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev
```

- [ ] **Step 2: Login como admin**

Navegar a `http://localhost:3000/login`, iniciar sesión con cuenta admin.

- [ ] **Step 3: Verificar nav**

Sidebar debe mostrar (entre otros):
- Citas (icono calendario)
- Configuración (icono ajustes)

- [ ] **Step 4: Verificar Configuración**

Click "Configuración" → cargar página. Verificar que muestra los precios actuales ($80.000 y $168.000) y el link Teams (vacío inicialmente).

- [ ] **Step 5: Verificar redirect de /admin/citas**

Click "Citas" → URL debería redirigir a `/admin/citas/pagos`. Tabs visibles: Calendario / Tabla de citas / Pagos y créditos. Activo: Pagos y créditos.

- [ ] **Step 6: Probar registrar pago manual**

Click "+ Registrar pago manual":
- Modal aparece.
- Buscar un paciente existente (típicamente alguno con role='patient'). Si no existe ninguno, crear uno desde `/admin/codigos` o `/admin/pacientes`.
- Seleccionar plan "1 evaluación". El monto debe pre-llenarse con `80000`.
- Cambiar plan a "3 evaluaciones". Monto cambia a `168000`.
- Volver a "1 evaluación". Monto vuelve a `80000`.
- Llenar nota: "Test transferencia Bancolombia".
- Click "Registrar pago".
- Modal se cierra. Tabla refresh y muestra una nueva fila con paciente seleccionado, plan single, monto $80.000, fuente Manual, estado Aprobado.

- [ ] **Step 7: Verificar en SQL Editor que el crédito se creó**

```sql
select ec.id, ec.amount, ec.remaining, ec.source, p.plan, u.name
from public.evaluation_credits ec
join public.payments p on ec.payment_id = p.id
join public.users u on ec.patient_id = u.id
order by ec.created_at desc
limit 5;
```

Expected: 1 fila con `amount=1, remaining=1, source='manual_offline'` para el paciente seleccionado.

- [ ] **Step 8: Verificar audit_log**

```sql
select action, target_type, metadata, created_at from public.audit_log order by created_at desc limit 5;
```

Expected: fila con `action='manual_payment'`, `target_type='payment'`.

- [ ] **Step 9: Probar ajuste de créditos**

Click "Ajustar créditos":
- Buscar el mismo paciente.
- Delta: `+2`.
- Razón: "Cortesía por incidente plataforma".
- Click "Aplicar ajuste". Modal cierra sin error.

Verificar:
```sql
select sum(remaining) as total_remaining
from public.evaluation_credits where patient_id = '<uuid del paciente>';
```

Expected: `total_remaining = 3` (1 del pago + 2 del ajuste).

- [ ] **Step 10: Probar ajuste negativo**

Volver a abrir "Ajustar créditos":
- Mismo paciente, delta: `-1`, razón: "Reverso ajuste anterior".
- Aplicar.

Verificar `total_remaining = 2`.

- [ ] **Step 11: Probar validaciones**

- Intentar registrar pago manual sin paciente seleccionado → error "Selecciona un paciente".
- Intentar registrar pago manual sin nota → error "Nota obligatoria".
- Intentar ajuste de créditos con delta=0 → error.
- Intentar ajuste con delta negativo más grande que créditos disponibles → error "no tiene suficientes créditos para restar".

- [ ] **Step 12: Probar configuración**

- En `/admin/configuracion`, cambiar precio single a `75000`, guardar.
- Volver a `/admin/citas/pagos`, abrir modal "Registrar pago manual" → al seleccionar plan single, monto pre-llenado debe ser `75000`.
- Restaurar precio a `80000` y guardar.

- [ ] **Step 13: Probar permisos (RLS)**

Logout. Login como **clínico** (no admin). Verificar:
- Sidebar NO muestra "Citas" ni "Configuración" (ambas son `visibleTo: ["admin"]`).
- Acceder directo a `/admin/configuracion` → redirige a `/admin`.
- Acceder directo a `/admin/citas/pagos` → redirige a `/admin` (por el guard del layout).

Logout. Login como **paciente**. Verificar:
- No tiene acceso a la sección admin (ya estaba protegido por `(admin)` route group).

- [ ] **Step 14: Detener dev server (Ctrl-C)**

- [ ] **Step 15: Commit final del plan**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git status
git log --oneline -20    # ver commits del plan
```

Expected: ~14 commits del Plan 1 visibles.

No hay archivos sin commitear (excepto los `??` previos no relacionados al plan).

---

## Self-Review (post-execución)

Antes de mergear o avanzar al Plan 2, leer la spec ([spec link](../specs/2026-05-04-agendamiento-evaluaciones-design.md)) sección por sección y verificar:

- [ ] Sección "Modelo de datos" — todas las tablas creadas, RLS habilitada, función round-robin presente.
- [ ] Sección "Reglas de negocio" — el helper `consumeOneCredit` implementa FIFO ✓, `returnOneCredit` no excede `amount` ✓, `manual_offline` source soportado ✓.
- [ ] Sección "Permisos" — RLS por rol implementada según matriz del spec.
- [ ] Sección "Auditoría" — `audit_log` se llena en pagos manuales y ajustes de créditos.
- [ ] Sección "Configuración admin" — link Teams + precios editables ✓. Wompi keys aparecen pero no se usan.

Si algo falta, agregarlo como tarea adicional antes de cerrar el Plan 1.

---

## Resumen de lo que entrega Plan 1

✅ Schema completo del feature (todas las tablas listas para Planes 2-6).
✅ Función round-robin en SQL (lista para Plan 2).
✅ RLS por rol estricta.
✅ Página `/admin/configuracion` funcional (link Teams + precios + placeholders Wompi).
✅ Sección `/admin/citas` con tabs estructurados, tab "Pagos y créditos" 100% funcional.
✅ Admin puede registrar pagos manuales offline.
✅ Admin puede ajustar créditos manualmente con razón + auditoría.
✅ Búsqueda de pacientes vía autocomplete.
✅ Audit log de acciones críticas.

❌ Sin UI de paciente todavía (Plan 2).
❌ Sin disponibilidad de clínico ni cómputo de slots (Plan 2).
❌ Sin notificaciones (Plan 4).
❌ Sin Wompi (Plan 6).

# Agendamiento — Plan 3: Vistas de calendario (admin + clínico)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los placeholders de Plan 1 con vistas reales de calendario: para el admin (`/admin/citas/calendario` con bloques de citas + drawer con acciones, `/admin/citas/tabla` filtrable con export CSV), y para el clínico (`/admin/clinico/agenda` con 3 modos: semana / mes / lista + métricas).

**Architecture:** Reutilizamos `computeAvailableSlots()` y los helpers de scheduling del Plan 2. Agregamos un nuevo módulo `lib/scheduling/admin.ts` con queries y mutaciones admin (cancel, complete, no_show, reschedule). Las vistas son custom con Tailwind grids — sin librería externa de calendario. CSV con un helper puro testeable.

**Tech Stack:** Next.js 16 + Supabase + Tailwind 4 + framer-motion + date-fns/date-fns-tz + Vitest. **Sin nuevas deps.**

**Spec:** [`docs/superpowers/specs/2026-05-04-agendamiento-evaluaciones-design.md`](../specs/2026-05-04-agendamiento-evaluaciones-design.md)
**Plan anterior:** [Plan 2 — Disponibilidad y agendamiento](./2026-05-05-agendamiento-plan-2-disponibilidad-y-agendamiento.md)

**Estado al iniciar Plan 3 (asumido):**
- Plan 2 mergeado a `main` ✓
- Tablas y RLS ya existen, datos de prueba ya creados (al menos 1 paciente con cita scheduled, créditos, etc.)
- Vitest + 18 tests pasando ✓
- `/admin/citas/calendario` y `/admin/citas/tabla` actualmente muestran placeholders ("Disponible en Plan 3") — Plan 3 los reemplaza.
- `getActiveAppointment`, `listPastAppointments`, `bookAppointment` existen ✓
- `consumeOneCredit`, `returnOneCredit` existen ✓
- `pick_least_loaded_clinician(slot)` SQL function existe ✓

**Convenciones a respetar (de Planes 1-2):**
- Server actions: `"use server"` + `getCurrentProfile()` + `isAdmin()`/`isClinico()`, retornan `{ ok: true } | { ok: false; error }`.
- Money en centavos en DB.
- Fechas en `timestamptz` UTC; UI muestra en `America/Bogota`.
- En user-facing copy: "evaluación de salud", nunca "historia clínica".
- **Admin SÍ ve clinician_id y nombre del clínico.** La regla blind solo aplica al UI del paciente.

**Verificación:** Tests unit para CSV helper. Manual e2e final.

---

## File Structure

**Crear:**

Backend:
- `src/lib/scheduling/admin.ts` — queries y mutaciones del admin (`listAppointments`, `getAppointmentDetail`, `cancelAppointment`, `markCompleted`, `markNoShow`, `rescheduleAppointment`).
- `src/lib/scheduling/csv.ts` — helper puro `appointmentsToCsv(rows)` para export.
- `src/lib/scheduling/__tests__/csv.test.ts` — unit tests.

Admin UI — Calendario tab:
- `src/app/(admin)/admin/citas/calendario/page.tsx` — server component, carga citas con filtros aplicados.
- `src/app/(admin)/admin/citas/calendario/actions.ts` — server actions admin: cancel, complete, no_show, reschedule.
- `src/components/admin/CitasFilters.tsx` — barra de filtros (clínico, estado, rango). Cliente.
- `src/components/admin/CitasCalendarView.tsx` — toggle Semana/Mes + grids. Cliente.
- `src/components/admin/CitaDrawerAdmin.tsx` — drawer lateral con detalle + botones de acción. Cliente.
- `src/components/admin/CancelAppointmentModal.tsx` — modal con razón + checkbox "devolver crédito".
- `src/components/admin/RescheduleAppointmentModal.tsx` — modal con datetime-local input.
- `src/components/admin/MarkNoShowModal.tsx` — modal con checkbox "devolver crédito".

Admin UI — Tabla tab:
- `src/app/(admin)/admin/citas/tabla/page.tsx` — server.
- `src/components/admin/CitasTable.tsx` — cliente, paginada, búsqueda, export CSV.

Clínico UI:
- `src/app/(admin)/admin/clinico/agenda/page.tsx` — server.
- `src/components/admin/AgendaClinicoShell.tsx` — wrapper con toggle + métricas.
- `src/components/admin/AgendaMetrics.tsx` — header con counts + próxima cita.
- `src/components/admin/AgendaWeekView.tsx` — grid Lun-Dom × horas.
- `src/components/admin/AgendaMonthView.tsx` — grid mensual con count por día.
- `src/components/admin/AgendaListView.tsx` — lista cronológica.
- `src/components/admin/CitaDrawerClinico.tsx` — drawer lateral del clínico (read-only, muestra paciente).

**Modificar:**
- `src/app/(admin)/admin/citas/page.tsx` — cambiar redirect de `/pagos` a `/calendario` (default tab nueva).
- `src/app/(admin)/admin/citas/calendario/page.tsx` — actualmente es placeholder; lo reemplazamos.
- `src/app/(admin)/admin/citas/tabla/page.tsx` — actualmente es placeholder; lo reemplazamos.
- `src/components/admin/AdminShell.tsx` — agregar "Mi agenda" en grupo "Clínico" (debajo de "Mi disponibilidad").

---

## Task 1 — Módulo de queries admin

**Files:**
- Create: `src/lib/scheduling/admin.ts`

- [ ] **Step 1: Crear el módulo con queries y tipos**

```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import type { Appointment, AppointmentStatus } from "./types"

/** Una cita enriquecida con datos de paciente y clínico para vistas admin. */
export interface AppointmentWithJoin extends Appointment {
  patient_name: string
  patient_email: string
  clinician_name: string
}

export interface ListAppointmentsFilters {
  clinicianId?: string | null
  status?: AppointmentStatus | null
  startDate?: string                    // ISO UTC, lower bound (inclusive)
  endDate?: string                      // ISO UTC, upper bound (inclusive)
  searchPatient?: string                // matches name or email
  limit?: number
  offset?: number
}

/** Query principal del admin. Devuelve filas con joins. */
export async function listAppointments(
  filters: ListAppointmentsFilters = {},
): Promise<{ rows: AppointmentWithJoin[]; total: number }> {
  const admin = createAdminClient()
  const limit = filters.limit ?? 100
  const offset = filters.offset ?? 0

  let query = admin
    .from("appointments")
    .select(
      "*, patient:users!patient_id(name, email), clinician:users!clinician_id(name)",
      { count: "exact" },
    )
    .order("starts_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (filters.clinicianId) query = query.eq("clinician_id", filters.clinicianId)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.startDate) query = query.gte("starts_at", filters.startDate)
  if (filters.endDate) query = query.lte("starts_at", filters.endDate)

  const { data, error, count } = await query
  if (error) throw new Error(`Error listando citas: ${error.message}`)

  let rows: AppointmentWithJoin[] = (data ?? []).map((row: any) => ({
    ...row,
    patient_name: row.patient?.name ?? "(sin nombre)",
    patient_email: row.patient?.email ?? "",
    clinician_name: row.clinician?.name ?? "(sin clínico)",
    patient: undefined,
    clinician: undefined,
  }))

  // Filtro de búsqueda en memoria (suficiente para Plan 3; Plan 5 puede mover a SQL si crece)
  if (filters.searchPatient) {
    const q = filters.searchPatient.toLowerCase()
    rows = rows.filter(
      (r) => r.patient_name.toLowerCase().includes(q) || r.patient_email.toLowerCase().includes(q),
    )
  }

  return { rows, total: filters.searchPatient ? rows.length : (count ?? 0) }
}

/** Trae una cita con todo el join, para el drawer de detalle. */
export async function getAppointmentDetail(appointmentId: string): Promise<AppointmentWithJoin | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("appointments")
    .select(
      "*, patient:users!patient_id(name, email), clinician:users!clinician_id(name)",
    )
    .eq("id", appointmentId)
    .maybeSingle()
  if (error) throw new Error(`Error leyendo cita: ${error.message}`)
  if (!data) return null
  const row = data as any
  return {
    ...row,
    patient_name: row.patient?.name ?? "(sin nombre)",
    patient_email: row.patient?.email ?? "",
    clinician_name: row.clinician?.name ?? "(sin clínico)",
    patient: undefined,
    clinician: undefined,
  }
}

/** Lista las citas asignadas al clínico autenticado, en un rango. */
export async function listAppointmentsForClinician(
  clinicianId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<AppointmentWithJoin[]> {
  const result = await listAppointments({
    clinicianId,
    startDate: rangeStart,
    endDate: rangeEnd,
    limit: 500,
  })
  return result.rows
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/scheduling/admin.ts
git commit -m "feat(scheduling): add admin queries module with joined appointment rows"
```

---

## Task 2 — CSV helper + tests

**Files:**
- Create: `src/lib/scheduling/csv.ts`
- Create: `src/lib/scheduling/__tests__/csv.test.ts`

- [ ] **Step 1: Crear el helper**

```typescript
import { formatHumanDateTimeBogota } from "./format"
import type { AppointmentWithJoin } from "./admin"

/**
 * Convierte filas de citas a un string CSV. Maneja escape de comas y comillas.
 * Pure function — no I/O.
 */
export function appointmentsToCsv(rows: AppointmentWithJoin[]): string {
  const headers = [
    "Fecha y hora",
    "Paciente",
    "Email",
    "Clínico",
    "Estado",
    "Crédito devuelto",
    "Razón cancelación",
  ]

  const lines = [headers.map(csvCell).join(",")]
  for (const r of rows) {
    lines.push(
      [
        formatHumanDateTimeBogota(r.starts_at),
        r.patient_name,
        r.patient_email,
        r.clinician_name,
        r.status,
        r.credit_returned ? "sí" : "no",
        r.cancellation_reason ?? "",
      ]
        .map(csvCell)
        .join(","),
    )
  }
  return lines.join("\n")
}

/** Escapa comillas y envuelve en comillas si la celda contiene `,`, `"` o newline. */
function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "")
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
```

- [ ] **Step 2: Crear tests**

```typescript
import { describe, it, expect } from "vitest"
import { appointmentsToCsv } from "../csv"
import type { AppointmentWithJoin } from "../admin"

const baseRow: AppointmentWithJoin = {
  id: "1",
  patient_id: "p1",
  clinician_id: "c1",
  starts_at: "2026-05-11T13:00:00.000Z",        // 8:00 AM Bogota
  ends_at: "2026-05-11T13:30:00.000Z",
  status: "scheduled",
  credit_id: "cr1",
  cancelled_by: null,
  cancelled_at: null,
  cancellation_reason: null,
  credit_returned: false,
  reminder_24h_sent_at: null,
  reminder_1h_sent_at: null,
  created_at: "2026-05-01T12:00:00.000Z",
  updated_at: "2026-05-01T12:00:00.000Z",
  patient_name: "María Pérez",
  patient_email: "maria@example.com",
  clinician_name: "Dra. López",
}

describe("appointmentsToCsv", () => {
  it("renders a header row plus one data row", () => {
    const csv = appointmentsToCsv([baseRow])
    const lines = csv.split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain("Paciente")
  })

  it("escapes commas in cell values", () => {
    const row: AppointmentWithJoin = {
      ...baseRow,
      patient_name: "Pérez, María",
    }
    const csv = appointmentsToCsv([row])
    expect(csv).toContain('"Pérez, María"')
  })

  it("escapes double quotes by doubling them", () => {
    const row: AppointmentWithJoin = {
      ...baseRow,
      cancellation_reason: 'Paciente dijo "no puedo"',
    }
    const csv = appointmentsToCsv([row])
    expect(csv).toContain('"Paciente dijo ""no puedo"""')
  })

  it("renders empty cell for null values", () => {
    const csv = appointmentsToCsv([baseRow])
    // cancellation_reason is null in baseRow → emits ""
    const dataLine = csv.split("\n")[1]
    expect(dataLine.endsWith(",")).toBe(true)
  })

  it("includes 'sí'/'no' for credit_returned", () => {
    const csv1 = appointmentsToCsv([{ ...baseRow, credit_returned: true }])
    const csv2 = appointmentsToCsv([{ ...baseRow, credit_returned: false }])
    expect(csv1.split("\n")[1]).toContain(",sí,")
    expect(csv2.split("\n")[1]).toContain(",no,")
  })
})
```

- [ ] **Step 3: Run tests, expect green**

```bash
npm test
```

Expected: 23 tests passing (18 previos + 5 nuevos).

- [ ] **Step 4: Commit**

```bash
git add src/lib/scheduling/csv.ts src/lib/scheduling/__tests__/csv.test.ts
git commit -m "feat(scheduling): add CSV export helper for appointments with tests"
```

---

## Task 3 — Server actions admin (cancel / complete / no_show / reschedule)

**Files:**
- Create: `src/app/(admin)/admin/citas/calendario/actions.ts`

- [ ] **Step 1: Crear las actions**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { parseISO, addMinutes } from "date-fns"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { returnOneCredit } from "@/lib/payments/credits"
import { SLOT_DURATION_MIN } from "@/lib/scheduling/constants"

type Result = { ok: true } | { ok: false; error: string }

export async function cancelAppointmentAction(input: {
  appointmentId: string
  reason: string
  returnCredit: boolean
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }
  if (!input.reason.trim()) return { ok: false, error: "Razón obligatoria" }

  const admin = createAdminClient()

  // 1. Cargar la cita actual para validar
  const { data: existing, error: readErr } = await admin
    .from("appointments")
    .select("id, status, credit_id")
    .eq("id", input.appointmentId)
    .single()
  if (readErr || !existing) return { ok: false, error: "Cita no encontrada" }
  if (existing.status !== "scheduled") {
    return { ok: false, error: `La cita está en estado '${existing.status}', no se puede cancelar` }
  }

  // 2. Update status
  const nowIso = new Date().toISOString()
  const { error: updErr } = await admin
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: profile!.id,
      cancelled_at: nowIso,
      cancellation_reason: input.reason.trim(),
      credit_returned: input.returnCredit,
    })
    .eq("id", input.appointmentId)
  if (updErr) return { ok: false, error: `Error cancelando cita: ${updErr.message}` }

  // 3. Devolver crédito si aplica
  if (input.returnCredit && existing.credit_id) {
    try {
      await returnOneCredit(existing.credit_id)
    } catch (e) {
      // Compensar: revertir cancelación
      await admin
        .from("appointments")
        .update({
          status: "scheduled",
          cancelled_by: null,
          cancelled_at: null,
          cancellation_reason: null,
          credit_returned: false,
        })
        .eq("id", input.appointmentId)
      return { ok: false, error: e instanceof Error ? e.message : "Error devolviendo crédito" }
    }
  }

  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_cancel_appointment",
    target_type: "appointment",
    target_id: input.appointmentId,
    metadata: {
      reason: input.reason.trim(),
      credit_returned: input.returnCredit,
      credit_id: existing.credit_id,
    },
  })

  revalidatePath("/admin/citas")
  return { ok: true }
}

export async function markCompletedAction(appointmentId: string): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const admin = createAdminClient()
  const { data: existing, error: readErr } = await admin
    .from("appointments")
    .select("status")
    .eq("id", appointmentId)
    .single()
  if (readErr || !existing) return { ok: false, error: "Cita no encontrada" }
  if (existing.status !== "scheduled") {
    return { ok: false, error: `La cita está en estado '${existing.status}'` }
  }

  const { error: updErr } = await admin
    .from("appointments")
    .update({ status: "completed" })
    .eq("id", appointmentId)
  if (updErr) return { ok: false, error: updErr.message }

  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_mark_completed",
    target_type: "appointment",
    target_id: appointmentId,
    metadata: {},
  })

  revalidatePath("/admin/citas")
  return { ok: true }
}

export async function markNoShowAction(input: {
  appointmentId: string
  returnCredit: boolean
  note: string
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const admin = createAdminClient()
  const { data: existing, error: readErr } = await admin
    .from("appointments")
    .select("status, credit_id")
    .eq("id", input.appointmentId)
    .single()
  if (readErr || !existing) return { ok: false, error: "Cita no encontrada" }
  if (existing.status !== "scheduled") {
    return { ok: false, error: `La cita está en estado '${existing.status}'` }
  }

  const { error: updErr } = await admin
    .from("appointments")
    .update({
      status: "no_show",
      cancellation_reason: input.note.trim() || null,
      credit_returned: input.returnCredit,
    })
    .eq("id", input.appointmentId)
  if (updErr) return { ok: false, error: updErr.message }

  if (input.returnCredit && existing.credit_id) {
    try {
      await returnOneCredit(existing.credit_id)
    } catch (e) {
      // Compensar: revertir
      await admin
        .from("appointments")
        .update({ status: "scheduled", credit_returned: false, cancellation_reason: null })
        .eq("id", input.appointmentId)
      return { ok: false, error: e instanceof Error ? e.message : "Error devolviendo crédito" }
    }
  }

  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_mark_no_show",
    target_type: "appointment",
    target_id: input.appointmentId,
    metadata: { credit_returned: input.returnCredit, note: input.note.trim() },
  })

  revalidatePath("/admin/citas")
  return { ok: true }
}

export async function rescheduleAppointmentAction(input: {
  appointmentId: string
  newStartsAtIso: string
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (parseISO(input.newStartsAtIso).getTime() < Date.now()) {
    return { ok: false, error: "El nuevo horario no puede estar en el pasado" }
  }

  const admin = createAdminClient()
  const { data: existing, error: readErr } = await admin
    .from("appointments")
    .select("status, clinician_id")
    .eq("id", input.appointmentId)
    .single()
  if (readErr || !existing) return { ok: false, error: "Cita no encontrada" }
  if (existing.status !== "scheduled") {
    return { ok: false, error: `La cita está en estado '${existing.status}'` }
  }

  const newEndsAt = addMinutes(parseISO(input.newStartsAtIso), SLOT_DURATION_MIN).toISOString()
  const { error: updErr } = await admin
    .from("appointments")
    .update({
      starts_at: input.newStartsAtIso,
      ends_at: newEndsAt,
      reminder_24h_sent_at: null,            // resetear recordatorios
      reminder_1h_sent_at: null,
    })
    .eq("id", input.appointmentId)

  if (updErr) {
    // Probablemente UNIQUE constraint (otro paciente ya tiene ese slot con ese clínico)
    return {
      ok: false,
      error:
        "Ese horario ya está tomado por otra cita del mismo clínico. Elige otro o reasigna primero.",
    }
  }

  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_reschedule_appointment",
    target_type: "appointment",
    target_id: input.appointmentId,
    metadata: { new_starts_at: input.newStartsAtIso, clinician_id: existing.clinician_id },
  })

  revalidatePath("/admin/citas")
  return { ok: true }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/citas/calendario/actions.ts"
git commit -m "feat(scheduling): add admin actions cancel/complete/no_show/reschedule"
```

---

## Task 4 — Componente CitasFilters

**Files:**
- Create: `src/components/admin/CitasFilters.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"

interface ClinicianOption {
  id: string
  name: string
}

interface Props {
  clinicians: ClinicianOption[]
}

export default function CitasFilters({ clinicians }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-tertiary/10 bg-white p-4">
      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Clínico</span>
        <select
          value={params.get("clinico") ?? ""}
          onChange={(e) => update("clinico", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {clinicians.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Estado</span>
        <select
          value={params.get("estado") ?? ""}
          onChange={(e) => update("estado", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="scheduled">Programada</option>
          <option value="completed">Completada</option>
          <option value="cancelled">Cancelada</option>
          <option value="no_show">No asistió</option>
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Desde</span>
        <input
          type="date"
          value={params.get("desde") ?? ""}
          onChange={(e) => update("desde", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Hasta</span>
        <input
          type="date"
          value={params.get("hasta") ?? ""}
          onChange={(e) => update("hasta", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        />
      </label>

      {(params.toString() && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname))}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-xs font-medium text-tertiary hover:bg-background"
        >
          Limpiar filtros
        </button>
      ))}

      {pending && <span className="text-xs text-tertiary">Aplicando...</span>}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/admin/CitasFilters.tsx
git commit -m "feat(scheduling): add CitasFilters bar with URL-driven state"
```

---

## Task 5 — Vista de calendario (semana + mes)

**Files:**
- Create: `src/components/admin/CitasCalendarView.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client"

import { useState, useMemo } from "react"
import { addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format as fnsFormat, parseISO, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { BOGOTA_TZ } from "@/lib/scheduling/constants"
import { formatTimeBogota, utcIsoToBogotaDateKey } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_BG: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "bg-primary/10 border-primary/30 text-primary",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-tertiary/10 border-tertiary/30 text-tertiary line-through",
  no_show: "bg-amber-100 border-amber-300 text-amber-800",
}

interface Props {
  appointments: AppointmentWithJoin[]
  onSelectAppointment: (apt: AppointmentWithJoin) => void
}

type Mode = "week" | "month"

export default function CitasCalendarView({ appointments, onSelectAppointment }: Props) {
  const [mode, setMode] = useState<Mode>("week")
  const [cursor, setCursor] = useState(() => new Date())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-tertiary/20 p-1">
          <button
            type="button"
            onClick={() => setMode("week")}
            className={`px-3 py-1 text-xs font-medium rounded ${mode === "week" ? "bg-primary text-white" : "text-tertiary hover:bg-background"}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setMode("month")}
            className={`px-3 py-1 text-xs font-medium rounded ${mode === "month" ? "bg-primary text-white" : "text-tertiary hover:bg-background"}`}
          >
            Mes
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => mode === "week" ? addWeeks(c, -1) : addMonths(c, -1))}
            className="rounded-lg px-3 py-1 text-sm hover:bg-background"
          >
            ←
          </button>
          <span className="text-sm font-medium text-neutral capitalize min-w-[180px] text-center">
            {mode === "week"
              ? `${fnsFormat(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })} – ${fnsFormat(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}`
              : fnsFormat(cursor, "MMMM yyyy", { locale: es })}
          </span>
          <button
            type="button"
            onClick={() => setCursor((c) => mode === "week" ? addWeeks(c, 1) : addMonths(c, 1))}
            className="rounded-lg px-3 py-1 text-sm hover:bg-background"
          >
            →
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs hover:bg-background"
          >
            Hoy
          </button>
        </div>
      </div>

      {mode === "week" ? (
        <WeekGrid cursor={cursor} appointments={appointments} onSelect={onSelectAppointment} />
      ) : (
        <MonthGrid cursor={cursor} appointments={appointments} onSelect={onSelectAppointment} />
      )}
    </div>
  )
}

function WeekGrid({ cursor, appointments, onSelect }: { cursor: Date; appointments: AppointmentWithJoin[]; onSelect: (a: AppointmentWithJoin) => void }) {
  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [cursor])

  // Apt's grouped per day (Bogota date key)
  const aptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithJoin[]>()
    for (const a of appointments) {
      const key = utcIsoToBogotaDateKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    for (const list of map.values()) {
      list.sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    }
    return map
  }, [appointments])

  return (
    <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background">
        {days.map((d) => (
          <div key={d.toISOString()} className="px-2 py-2 text-center">
            <div className="text-xs uppercase text-tertiary">{fnsFormat(d, "EEE", { locale: es })}</div>
            <div className="text-sm font-medium text-neutral">{fnsFormat(d, "d MMM", { locale: es })}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 min-h-[400px]">
        {days.map((d) => {
          const key = utcIsoToBogotaDateKey(d.toISOString())
          const list = aptsByDay.get(key) ?? []
          return (
            <div key={d.toISOString()} className="border-r border-tertiary/10 last:border-r-0 p-2 space-y-1">
              {list.length === 0 ? (
                <div className="text-xs text-tertiary/40 italic">Sin citas</div>
              ) : (
                list.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    className={`block w-full text-left rounded-md border px-2 py-1 text-xs ${STATUS_BG[a.status]} hover:opacity-80`}
                  >
                    <div className="font-medium">{formatTimeBogota(a.starts_at)}</div>
                    <div className="truncate">{a.patient_name}</div>
                    <div className="truncate text-[10px] opacity-70">{a.clinician_name}</div>
                  </button>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthGrid({ cursor, appointments, onSelect }: { cursor: Date; appointments: AppointmentWithJoin[]; onSelect: (a: AppointmentWithJoin) => void }) {
  const days = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    return eachDayOfInterval({ start, end })
  }, [cursor])

  const aptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithJoin[]>()
    for (const a of appointments) {
      const key = utcIsoToBogotaDateKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [appointments])

  // Padding inicial: cuántos días desde el lunes hasta el día 1
  const firstDayOfWeek = (toZonedTime(days[0], BOGOTA_TZ).getDay() + 6) % 7

  return (
    <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background text-xs font-medium text-tertiary">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[100px]">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} className="border-r border-b border-tertiary/10" />
        ))}
        {days.map((d) => {
          const key = utcIsoToBogotaDateKey(d.toISOString())
          const list = aptsByDay.get(key) ?? []
          const today = isSameDay(d, new Date())
          return (
            <div key={d.toISOString()} className="border-r border-b border-tertiary/10 p-1 overflow-hidden">
              <div className={`text-xs font-medium ${today ? "text-primary" : "text-neutral"}`}>
                {fnsFormat(d, "d")}
              </div>
              <div className="space-y-0.5 mt-1">
                {list.slice(0, 2).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    className={`block w-full text-left truncate rounded px-1 py-0.5 text-[10px] ${STATUS_BG[a.status]}`}
                  >
                    {formatTimeBogota(a.starts_at)} {a.patient_name}
                  </button>
                ))}
                {list.length > 2 && (
                  <div className="text-[10px] text-tertiary">+{list.length - 2} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/admin/CitasCalendarView.tsx
git commit -m "feat(scheduling): add admin CitasCalendarView with week/month grids"
```

---

## Task 6 — Modales de cancelación / no-show / reschedule

**Files:**
- Create: `src/components/admin/CancelAppointmentModal.tsx`
- Create: `src/components/admin/MarkNoShowModal.tsx`
- Create: `src/components/admin/RescheduleAppointmentModal.tsx`

- [ ] **Step 1: Crear `CancelAppointmentModal.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { cancelAppointmentAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { differenceInHours, parseISO } from "date-fns"

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  startsAt: string                  // ISO UTC
  onSuccess: () => void
}

export default function CancelAppointmentModal({ open, onClose, appointmentId, startsAt, onSuccess }: Props) {
  const hoursUntil = differenceInHours(parseISO(startsAt), new Date())
  const [reason, setReason] = useState("")
  const [returnCredit, setReturnCredit] = useState(hoursUntil >= 24)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setReason("")
    setReturnCredit(hoursUntil >= 24)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!reason.trim()) {
      setError("Razón obligatoria")
      return
    }
    startTransition(async () => {
      const res = await cancelAppointmentAction({
        appointmentId,
        reason: reason.trim(),
        returnCredit,
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
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Cancelar evaluación</h2>
        <p className="mb-4 text-sm text-tertiary">
          {hoursUntil >= 24
            ? `Faltan ${hoursUntil} horas (≥24h). Sugerimos devolver el crédito.`
            : `Faltan menos de 24h (${hoursUntil}h). Por defecto NO se devuelve el crédito.`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Ej: paciente solicitó reagendar, indisponibilidad del clínico"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={returnCredit}
              onChange={(e) => setReturnCredit(e.target.checked)}
            />
            <span>Devolver el crédito al paciente</span>
          </label>

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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Cancelando..." : "Confirmar cancelación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `MarkNoShowModal.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { markNoShowAction } from "@/app/(admin)/admin/citas/calendario/actions"

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  onSuccess: () => void
}

export default function MarkNoShowModal({ open, onClose, appointmentId, onSuccess }: Props) {
  const [returnCredit, setReturnCredit] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await markNoShowAction({ appointmentId, returnCredit, note })
      if (res.ok) {
        onSuccess()
        onClose()
        setNote("")
        setReturnCredit(false)
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Marcar como no-show</h2>
        <p className="mb-4 text-sm text-tertiary">
          El paciente no se presentó. Por defecto NO se devuelve el crédito.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Nota (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ej: paciente avisó tarde, intentamos contactar sin éxito"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={returnCredit}
              onChange={(e) => setReturnCredit(e.target.checked)}
            />
            <span>Devolver el crédito al paciente</span>
          </label>

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
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Confirmar no-show"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear `RescheduleAppointmentModal.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { rescheduleAppointmentAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { bogotaToUtcIso } from "@/lib/scheduling/format"

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  onSuccess: () => void
}

export default function RescheduleAppointmentModal({ open, onClose, appointmentId, onSuccess }: Props) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("08:00")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDate("")
    setTime("08:00")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) {
      setError("Selecciona una fecha")
      return
    }
    const newStartsAtIso = bogotaToUtcIso(date, time)
    startTransition(async () => {
      const res = await rescheduleAppointmentAction({ appointmentId, newStartsAtIso })
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
        <h2 className="text-lg font-semibold text-neutral mb-1">Reagendar evaluación</h2>
        <p className="mb-4 text-sm text-tertiary">
          Mueve la cita al nuevo horario. El clínico asignado se mantiene. Los recordatorios se reenvían.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
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
              {pending ? "Reagendando..." : "Confirmar reagendamiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/admin/CancelAppointmentModal.tsx \
        src/components/admin/MarkNoShowModal.tsx \
        src/components/admin/RescheduleAppointmentModal.tsx
git commit -m "feat(scheduling): add admin modals for cancel/no-show/reschedule"
```

---

## Task 7 — Drawer del admin con detalle + acciones

**Files:**
- Create: `src/components/admin/CitaDrawerAdmin.tsx`

- [ ] **Step 1: Crear el drawer**

```tsx
"use client"

import { useState, useTransition } from "react"
import { markCompletedAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import CancelAppointmentModal from "./CancelAppointmentModal"
import MarkNoShowModal from "./MarkNoShowModal"
import RescheduleAppointmentModal from "./RescheduleAppointmentModal"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

interface Props {
  appointment: AppointmentWithJoin | null
  onClose: () => void
  onChanged: () => void
}

export default function CitaDrawerAdmin({ appointment, onClose, onChanged }: Props) {
  const [showCancel, setShowCancel] = useState(false)
  const [showNoShow, setShowNoShow] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!appointment) return null

  function handleComplete() {
    setError(null)
    startTransition(async () => {
      const res = await markCompletedAction(appointment!.id)
      if (res.ok) {
        onChanged()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  const isActionable = appointment.status === "scheduled"

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="border-b border-tertiary/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral">Detalle de la cita</h2>
          <button type="button" onClick={onClose} className="text-tertiary hover:text-neutral">✕</button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-tertiary">Cuándo</div>
            <div className="text-base font-medium text-neutral capitalize">
              {formatHumanDateTimeBogota(appointment.starts_at)}
            </div>
            <div className="inline-block rounded-full bg-tertiary/10 px-3 py-1 text-xs font-medium">
              {STATUS_LABEL[appointment.status]}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-tertiary">Paciente</div>
            <div className="text-base font-medium text-neutral">{appointment.patient_name}</div>
            <div className="text-sm text-tertiary">{appointment.patient_email}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-tertiary">Clínico asignado</div>
            <div className="text-base font-medium text-neutral">{appointment.clinician_name}</div>
          </div>

          {appointment.cancellation_reason && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-tertiary">Razón de cancelación / nota</div>
              <div className="text-sm text-neutral">{appointment.cancellation_reason}</div>
              {appointment.credit_returned && (
                <div className="text-xs text-green-700">✓ Crédito devuelto al paciente</div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {isActionable && (
            <div className="border-t border-tertiary/10 pt-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-tertiary">Acciones</div>
              <button
                type="button"
                onClick={handleComplete}
                disabled={pending}
                className="block w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Marcar como completada
              </button>
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                className="block w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Reagendar
              </button>
              <button
                type="button"
                onClick={() => setShowNoShow(true)}
                className="block w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Marcar no-show
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                className="block w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Cancelar cita
              </button>
            </div>
          )}
        </div>
      </aside>

      <CancelAppointmentModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        appointmentId={appointment.id}
        startsAt={appointment.starts_at}
        onSuccess={onChanged}
      />
      <MarkNoShowModal
        open={showNoShow}
        onClose={() => setShowNoShow(false)}
        appointmentId={appointment.id}
        onSuccess={onChanged}
      />
      <RescheduleAppointmentModal
        open={showReschedule}
        onClose={() => setShowReschedule(false)}
        appointmentId={appointment.id}
        onSuccess={onChanged}
      />
    </>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/admin/CitaDrawerAdmin.tsx
git commit -m "feat(scheduling): add CitaDrawerAdmin with detail and actions"
```

---

## Task 8 — Página `/admin/citas/calendario` (server)

**Files:**
- Modify: `src/app/(admin)/admin/citas/calendario/page.tsx` (existe como placeholder; reemplazar)

- [ ] **Step 1: Reemplazar el placeholder**

```tsx
import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { listAppointments } from "@/lib/scheduling/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import CitasFilters from "@/components/admin/CitasFilters"
import CitasCalendarPageClient from "@/components/admin/CitasCalendarPageClient"

export const dynamic = "force-dynamic"

interface SearchParams {
  clinico?: string
  estado?: string
  desde?: string         // YYYY-MM-DD
  hasta?: string
}

function bogotaDateToUtcIso(ymd: string, endOfDay: boolean): string {
  // Construye la representación local Bogota y la convierte a UTC ISO
  const [y, m, d] = ymd.split("-").map(Number)
  // Bogota = UTC-5; 00:00 Bogota = 05:00 UTC
  const utcDate = endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23 + 5, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d, 0 + 5, 0, 0, 0))
  return utcDate.toISOString()
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const sp = await searchParams

  const filters = {
    clinicianId: sp.clinico || null,
    status: (sp.estado as any) || null,
    startDate: sp.desde ? bogotaDateToUtcIso(sp.desde, false) : undefined,
    endDate: sp.hasta ? bogotaDateToUtcIso(sp.hasta, true) : undefined,
    limit: 500,
  }

  const [{ rows }, cliniciansResult] = await Promise.all([
    listAppointments(filters),
    createAdminClient()
      .from("users")
      .select("id, name")
      .eq("role", "clinico")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  const clinicians = (cliniciansResult.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-4">
      <CitasFilters clinicians={clinicians} />
      <CitasCalendarPageClient appointments={rows} />
    </div>
  )
}
```

- [ ] **Step 2: Crear `CitasCalendarPageClient.tsx`** (cliente que combina calendar + drawer)

`src/components/admin/CitasCalendarPageClient.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import CitasCalendarView from "./CitasCalendarView"
import CitaDrawerAdmin from "./CitaDrawerAdmin"

export default function CitasCalendarPageClient({ appointments }: { appointments: AppointmentWithJoin[] }) {
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)
  const router = useRouter()

  function handleChanged() {
    router.refresh()
  }

  return (
    <>
      <CitasCalendarView appointments={appointments} onSelectAppointment={setSelected} />
      <CitaDrawerAdmin
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
    </>
  )
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/citas/calendario/page.tsx" \
        src/components/admin/CitasCalendarPageClient.tsx
git commit -m "feat(scheduling): wire /admin/citas/calendario with real calendar + drawer"
```

---

## Task 9 — Tabla de citas con filtros y CSV export

**Files:**
- Modify: `src/app/(admin)/admin/citas/tabla/page.tsx` (placeholder → real)
- Create: `src/components/admin/CitasTable.tsx`

- [ ] **Step 1: Reemplazar `tabla/page.tsx`**

```tsx
import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { listAppointments } from "@/lib/scheduling/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import CitasFilters from "@/components/admin/CitasFilters"
import CitasTable from "@/components/admin/CitasTable"

export const dynamic = "force-dynamic"

interface SearchParams {
  clinico?: string
  estado?: string
  desde?: string
  hasta?: string
  buscar?: string
}

function bogotaDateToUtcIso(ymd: string, endOfDay: boolean): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const utcDate = endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23 + 5, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d, 0 + 5, 0, 0, 0))
  return utcDate.toISOString()
}

export default async function TablaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const sp = await searchParams

  const { rows } = await listAppointments({
    clinicianId: sp.clinico || null,
    status: (sp.estado as any) || null,
    startDate: sp.desde ? bogotaDateToUtcIso(sp.desde, false) : undefined,
    endDate: sp.hasta ? bogotaDateToUtcIso(sp.hasta, true) : undefined,
    searchPatient: sp.buscar,
    limit: 500,
  })

  const cliniciansResult = await createAdminClient()
    .from("users")
    .select("id, name")
    .eq("role", "clinico")
    .eq("is_active", true)
    .order("name", { ascending: true })
  const clinicians = (cliniciansResult.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-4">
      <CitasFilters clinicians={clinicians} />
      <CitasTable rows={rows} />
    </div>
  )
}
```

- [ ] **Step 2: Crear `CitasTable.tsx`**

```tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import { appointmentsToCsv } from "@/lib/scheduling/csv"
import CitaDrawerAdmin from "./CitaDrawerAdmin"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

export default function CitasTable({ rows }: { rows: AppointmentWithJoin[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)
  const [search, setSearch] = useState(params.get("buscar") ?? "")

  function applySearch() {
    const next = new URLSearchParams(params.toString())
    if (search) next.set("buscar", search)
    else next.delete("buscar")
    router.push(`${pathname}?${next.toString()}`)
  }

  function downloadCsv() {
    const csv = appointmentsToCsv(rows)
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `citas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm w-72"
          />
          <button
            type="button"
            onClick={applySearch}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Buscar
          </button>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm font-medium text-neutral hover:bg-background disabled:opacity-50"
        >
          ⬇ Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tertiary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha y hora</th>
              <th className="px-4 py-3 text-left font-medium">Paciente</th>
              <th className="px-4 py-3 text-left font-medium">Clínico</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Crédito</th>
              <th className="px-4 py-3 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-tertiary">Sin citas que coincidan.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-tertiary/10 hover:bg-background/50">
                  <td className="px-4 py-3 text-neutral capitalize whitespace-nowrap">
                    {formatHumanDateTimeBogota(r.starts_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral">{r.patient_name}</div>
                    <div className="text-xs text-tertiary">{r.patient_email}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral">{r.clinician_name}</td>
                  <td className="px-4 py-3 text-neutral">{STATUS_LABEL[r.status]}</td>
                  <td className="px-4 py-3 text-tertiary text-xs">
                    {r.credit_returned ? "Devuelto" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CitaDrawerAdmin
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/citas/tabla/page.tsx" src/components/admin/CitasTable.tsx
git commit -m "feat(scheduling): wire /admin/citas/tabla with filters, search, and CSV export"
```

---

## Task 10 — Cambiar redirect default de /admin/citas a /calendario

**Files:**
- Modify: `src/app/(admin)/admin/citas/page.tsx`

- [ ] **Step 1: Cambiar el redirect**

Buscar:

```tsx
import { redirect } from "next/navigation"

export default function CitasIndex() {
  redirect("/admin/citas/pagos")
}
```

Reemplazar por:

```tsx
import { redirect } from "next/navigation"

export default function CitasIndex() {
  redirect("/admin/citas/calendario")
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(admin)/admin/citas/page.tsx"
git commit -m "feat(scheduling): switch /admin/citas default tab to /calendario"
```

---

## Task 11 — Vista del clínico: queries + página

**Files:**
- Create: `src/app/(admin)/admin/clinico/agenda/page.tsx`

- [ ] **Step 1: Crear el server component**

```tsx
import { redirect } from "next/navigation"
import { addDays, addMonths, startOfMonth } from "date-fns"
import { getCurrentProfile } from "@/lib/auth/profile"
import { listAppointmentsForClinician } from "@/lib/scheduling/admin"
import { getSchedulingConfig } from "@/lib/payments/config"
import AgendaClinicoShell from "@/components/admin/AgendaClinicoShell"

export const dynamic = "force-dynamic"

export default async function AgendaClinicoPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "clinico") redirect("/admin")

  // Cargar 60 días: 30 atrás + 30 adelante. Suficiente para semana / mes / lista.
  const now = new Date()
  const rangeStart = startOfMonth(addMonths(now, -1)).toISOString()
  const rangeEnd = addDays(now, 60).toISOString()

  const [appointments, config] = await Promise.all([
    listAppointmentsForClinician(profile.id, rangeStart, rangeEnd),
    getSchedulingConfig(),
  ])

  return (
    <AgendaClinicoShell
      appointments={appointments}
      teamsUrl={config.teamsMeetingUrl}
    />
  )
}
```

- [ ] **Step 2: NO commitear** — depende del shell (Task 12).

---

## Task 12 — Vistas Semana/Mes/Lista del clínico + métricas

**Files:**
- Create: `src/components/admin/AgendaMetrics.tsx`
- Create: `src/components/admin/AgendaWeekView.tsx`
- Create: `src/components/admin/AgendaMonthView.tsx`
- Create: `src/components/admin/AgendaListView.tsx`
- Create: `src/components/admin/CitaDrawerClinico.tsx`
- Create: `src/components/admin/AgendaClinicoShell.tsx`

- [ ] **Step 1: Crear `AgendaMetrics.tsx`**

```tsx
"use client"

import { useMemo } from "react"
import { isToday, isThisWeek, parseISO } from "date-fns"
import { formatHumanDateTimeBogota, msUntil } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

interface Props {
  appointments: AppointmentWithJoin[]
  teamsUrl: string
}

function formatRelative(ms: number): string {
  if (ms <= 0) return "ahora"
  const totalMin = Math.floor(ms / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `en ${days}d ${hours}h`
  if (hours > 0) return `en ${hours}h ${minutes}m`
  return `en ${minutes} min`
}

export default function AgendaMetrics({ appointments, teamsUrl }: Props) {
  const stats = useMemo(() => {
    const scheduled = appointments.filter((a) => a.status === "scheduled")
    const today = scheduled.filter((a) => isToday(parseISO(a.starts_at)))
    const week = scheduled.filter((a) => isThisWeek(parseISO(a.starts_at), { weekStartsOn: 1 }))
    const future = scheduled
      .filter((a) => parseISO(a.starts_at).getTime() > Date.now())
      .sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    return { todayCount: today.length, weekCount: week.length, next: future[0] ?? null }
  }, [appointments])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="rounded-xl border border-tertiary/10 bg-white p-4">
        <div className="text-xs uppercase text-tertiary">Hoy</div>
        <div className="mt-1 text-2xl font-bold text-neutral">{stats.todayCount}</div>
        <div className="text-xs text-tertiary">cita{stats.todayCount === 1 ? "" : "s"}</div>
      </div>
      <div className="rounded-xl border border-tertiary/10 bg-white p-4">
        <div className="text-xs uppercase text-tertiary">Esta semana</div>
        <div className="mt-1 text-2xl font-bold text-neutral">{stats.weekCount}</div>
        <div className="text-xs text-tertiary">cita{stats.weekCount === 1 ? "" : "s"}</div>
      </div>
      <div className="rounded-xl border border-tertiary/10 bg-white p-4">
        <div className="text-xs uppercase text-tertiary">Próxima cita</div>
        {stats.next ? (
          <>
            <div className="mt-1 text-sm font-medium text-neutral capitalize">
              {formatHumanDateTimeBogota(stats.next.starts_at)}
            </div>
            <div className="text-xs text-tertiary">{formatRelative(msUntil(stats.next.starts_at))}</div>
          </>
        ) : (
          <div className="mt-1 text-sm text-tertiary">Sin citas próximas</div>
        )}
      </div>
      <div className="rounded-xl border border-primary bg-primary/5 p-4 flex flex-col">
        <div className="text-xs uppercase text-primary">Microsoft Teams</div>
        {teamsUrl ? (
          <a
            href={teamsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-block rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-primary/90"
          >
            Unirme a Teams
          </a>
        ) : (
          <div className="mt-auto text-xs text-tertiary">El admin no ha configurado el link.</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `AgendaWeekView.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { addDays, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, format as fnsFormat, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { formatTimeBogota, utcIsoToBogotaDateKey } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_BG: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "bg-primary/10 border-primary/30 text-primary",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-tertiary/10 border-tertiary/30 text-tertiary line-through",
  no_show: "bg-amber-100 border-amber-300 text-amber-800",
}

interface Props {
  appointments: AppointmentWithJoin[]
  onSelect: (apt: AppointmentWithJoin) => void
}

export default function AgendaWeekView({ appointments, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => new Date())
  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [cursor])

  const aptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithJoin[]>()
    for (const a of appointments) {
      const key = utcIsoToBogotaDateKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    for (const list of map.values()) {
      list.sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    }
    return map
  }, [appointments])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => setCursor((c) => addWeeks(c, -1))}
          className="rounded-lg px-3 py-1 text-sm hover:bg-background"
        >
          ←
        </button>
        <span className="text-sm font-medium text-neutral capitalize min-w-[180px] text-center">
          {fnsFormat(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })} – {fnsFormat(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setCursor((c) => addWeeks(c, 1))}
          className="rounded-lg px-3 py-1 text-sm hover:bg-background"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => setCursor(new Date())}
          className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs hover:bg-background"
        >
          Hoy
        </button>
      </div>

      <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background">
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 text-center">
              <div className="text-xs uppercase text-tertiary">{fnsFormat(d, "EEE", { locale: es })}</div>
              <div className="text-sm font-medium text-neutral">{fnsFormat(d, "d MMM", { locale: es })}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((d) => {
            const list = aptsByDay.get(utcIsoToBogotaDateKey(d.toISOString())) ?? []
            return (
              <div key={d.toISOString()} className="border-r border-tertiary/10 last:border-r-0 p-2 space-y-1">
                {list.length === 0 ? (
                  <div className="text-xs text-tertiary/40 italic">—</div>
                ) : (
                  list.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className={`block w-full text-left rounded-md border px-2 py-1 text-xs ${STATUS_BG[a.status]} hover:opacity-80`}
                    >
                      <div className="font-medium">{formatTimeBogota(a.starts_at)}</div>
                      <div className="truncate">{a.patient_name}</div>
                    </button>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Crear `AgendaMonthView.tsx`**

```tsx
"use client"

import { useMemo, useState } from "react"
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, format as fnsFormat, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { BOGOTA_TZ } from "@/lib/scheduling/constants"
import { utcIsoToBogotaDateKey } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

interface Props {
  appointments: AppointmentWithJoin[]
  onSelect: (apt: AppointmentWithJoin) => void
}

export default function AgendaMonthView({ appointments, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => new Date())
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })
  }, [cursor])

  const aptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithJoin[]>()
    for (const a of appointments) {
      const key = utcIsoToBogotaDateKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [appointments])

  const firstDayOfWeek = (toZonedTime(days[0], BOGOTA_TZ).getDay() + 6) % 7

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded-lg px-3 py-1 text-sm hover:bg-background">←</button>
        <span className="text-sm font-medium text-neutral capitalize min-w-[160px] text-center">
          {fnsFormat(cursor, "MMMM yyyy", { locale: es })}
        </span>
        <button type="button" onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-lg px-3 py-1 text-sm hover:bg-background">→</button>
        <button type="button" onClick={() => setCursor(new Date())} className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs hover:bg-background">Hoy</button>
      </div>

      <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background text-xs font-medium text-tertiary">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="px-2 py-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[110px]">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="border-r border-b border-tertiary/10" />
          ))}
          {days.map((d) => {
            const list = aptsByDay.get(utcIsoToBogotaDateKey(d.toISOString())) ?? []
            const today = isSameDay(d, new Date())
            return (
              <div key={d.toISOString()} className="border-r border-b border-tertiary/10 p-1 overflow-hidden">
                <div className={`text-xs font-medium ${today ? "text-primary" : "text-neutral"}`}>{fnsFormat(d, "d")}</div>
                <div className="space-y-0.5 mt-1">
                  {list.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className="block w-full text-left truncate rounded px-1 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {a.patient_name}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <div className="text-[10px] text-tertiary">+{list.length - 3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Crear `AgendaListView.tsx`**

```tsx
"use client"

import { useMemo } from "react"
import { isToday, isTomorrow, isThisWeek, isThisMonth, parseISO } from "date-fns"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

function bucketFor(iso: string): "today" | "tomorrow" | "week" | "month" | "later" {
  const d = parseISO(iso)
  if (isToday(d)) return "today"
  if (isTomorrow(d)) return "tomorrow"
  if (isThisWeek(d, { weekStartsOn: 1 })) return "week"
  if (isThisMonth(d)) return "month"
  return "later"
}

const BUCKET_LABEL = {
  today: "Hoy",
  tomorrow: "Mañana",
  week: "Esta semana",
  month: "Este mes",
  later: "Próximamente",
}

interface Props {
  appointments: AppointmentWithJoin[]
  onSelect: (apt: AppointmentWithJoin) => void
}

export default function AgendaListView({ appointments, onSelect }: Props) {
  const grouped = useMemo(() => {
    const future = appointments
      .filter((a) => parseISO(a.starts_at).getTime() >= Date.now() - 60 * 60 * 1000)   // permite citas de la última hora
      .sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    const buckets: Record<keyof typeof BUCKET_LABEL, AppointmentWithJoin[]> = {
      today: [],
      tomorrow: [],
      week: [],
      month: [],
      later: [],
    }
    for (const a of future) buckets[bucketFor(a.starts_at)].push(a)
    return buckets
  }, [appointments])

  const orderedKeys = ["today", "tomorrow", "week", "month", "later"] as const

  if (orderedKeys.every((k) => grouped[k].length === 0)) {
    return (
      <div className="rounded-xl border border-dashed border-tertiary/30 p-8 text-center text-sm text-tertiary">
        No tienes citas programadas próximamente.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {orderedKeys.map((key) => {
        const list = grouped[key]
        if (list.length === 0) return null
        return (
          <section key={key} className="space-y-2">
            <h3 className="text-sm font-semibold text-tertiary uppercase tracking-wide">
              {BUCKET_LABEL[key]} ({list.length})
            </h3>
            <ul className="space-y-2">
              {list.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a)}
                    className="w-full flex items-center justify-between rounded-xl border border-tertiary/10 bg-white px-4 py-3 hover:bg-background"
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium text-neutral capitalize">
                        {formatHumanDateTimeBogota(a.starts_at)}
                      </div>
                      <div className="text-xs text-tertiary">{a.patient_name} · {a.patient_email}</div>
                    </div>
                    <span className="text-xs font-medium text-tertiary">{STATUS_LABEL[a.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Crear `CitaDrawerClinico.tsx`** (read-only — clínico solo ve, no actúa)

```tsx
"use client"

import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

interface Props {
  appointment: AppointmentWithJoin | null
  teamsUrl: string
  onClose: () => void
}

export default function CitaDrawerClinico({ appointment, teamsUrl, onClose }: Props) {
  if (!appointment) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="border-b border-tertiary/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral">Detalle de la cita</h2>
          <button type="button" onClick={onClose} className="text-tertiary hover:text-neutral">✕</button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-tertiary">Cuándo</div>
            <div className="mt-1 text-base font-medium text-neutral capitalize">
              {formatHumanDateTimeBogota(appointment.starts_at)}
            </div>
            <div className="mt-1 inline-block rounded-full bg-tertiary/10 px-3 py-1 text-xs font-medium">
              {STATUS_LABEL[appointment.status]}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-tertiary">Paciente</div>
            <div className="mt-1 text-base font-medium text-neutral">{appointment.patient_name}</div>
            <div className="text-sm text-tertiary">{appointment.patient_email}</div>
          </div>

          {teamsUrl && appointment.status === "scheduled" && (
            <a
              href={teamsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-primary/90"
            >
              Unirme a Teams ahora
            </a>
          )}

          {appointment.cancellation_reason && (
            <div>
              <div className="text-xs uppercase tracking-wide text-tertiary">Razón de cancelación / nota</div>
              <div className="mt-1 text-sm text-neutral">{appointment.cancellation_reason}</div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
```

- [ ] **Step 6: Crear `AgendaClinicoShell.tsx`** (orquesta toggle + métricas + drawer)

```tsx
"use client"

import { useState } from "react"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import AgendaMetrics from "./AgendaMetrics"
import AgendaWeekView from "./AgendaWeekView"
import AgendaMonthView from "./AgendaMonthView"
import AgendaListView from "./AgendaListView"
import CitaDrawerClinico from "./CitaDrawerClinico"

type Mode = "week" | "month" | "list"

interface Props {
  appointments: AppointmentWithJoin[]
  teamsUrl: string
}

export default function AgendaClinicoShell({ appointments, teamsUrl }: Props) {
  const [mode, setMode] = useState<Mode>("week")
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Mi agenda</h1>
        <p className="text-sm text-tertiary">Citas asignadas a ti.</p>
      </header>

      <AgendaMetrics appointments={appointments} teamsUrl={teamsUrl} />

      <div className="flex gap-1 rounded-lg border border-tertiary/20 p-1 w-fit">
        {(["week", "month", "list"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1 text-xs font-medium rounded ${mode === m ? "bg-primary text-white" : "text-tertiary hover:bg-background"}`}
          >
            {m === "week" ? "Semana" : m === "month" ? "Mes" : "Lista"}
          </button>
        ))}
      </div>

      {mode === "week" && <AgendaWeekView appointments={appointments} onSelect={setSelected} />}
      {mode === "month" && <AgendaMonthView appointments={appointments} onSelect={setSelected} />}
      {mode === "list" && <AgendaListView appointments={appointments} onSelect={setSelected} />}

      <CitaDrawerClinico
        appointment={selected}
        teamsUrl={teamsUrl}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
```

- [ ] **Step 7: Typecheck + commit (incluye también la página de Task 11)**

```bash
npx tsc --noEmit
git add src/components/admin/AgendaMetrics.tsx \
        src/components/admin/AgendaWeekView.tsx \
        src/components/admin/AgendaMonthView.tsx \
        src/components/admin/AgendaListView.tsx \
        src/components/admin/CitaDrawerClinico.tsx \
        src/components/admin/AgendaClinicoShell.tsx \
        "src/app/(admin)/admin/clinico/agenda/page.tsx"
git commit -m "feat(scheduling): add /admin/clinico/agenda with week/month/list views"
```

---

## Task 13 — AdminShell: agregar "Mi agenda"

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Agregar entrada en grupo "Clínico"**

Buscar el grupo "Clínico" (debería tener 3 items después de Plan 2: Dashboard clínico, Pacientes, Mi disponibilidad):

```tsx
{
  label: "Clínico",
  visibleTo: ["admin", "clinico"],
  items: [
    { href: "/admin/clinico/dashboard", label: "Dashboard clínico", icon: stethoscopeIcon },
    { href: "/admin/pacientes", label: "Pacientes", icon: patientsIcon },
    { href: "/admin/clinico/disponibilidad", label: "Mi disponibilidad", icon: calendarIcon },
  ],
},
```

Agregar "Mi agenda" después de "Mi disponibilidad":

```tsx
{
  label: "Clínico",
  visibleTo: ["admin", "clinico"],
  items: [
    { href: "/admin/clinico/dashboard", label: "Dashboard clínico", icon: stethoscopeIcon },
    { href: "/admin/pacientes", label: "Pacientes", icon: patientsIcon },
    { href: "/admin/clinico/disponibilidad", label: "Mi disponibilidad", icon: calendarIcon },
    { href: "/admin/clinico/agenda", label: "Mi agenda", icon: calendarIcon },
  ],
},
```

(Reusa `calendarIcon` existente — el plan no requiere icono distinto.)

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/admin/AdminShell.tsx
git commit -m "feat(scheduling): add 'Mi agenda' link for clinicians"
```

---

## Task 14 — Verificación end-to-end

**Files:** ninguno

- [ ] **Step 1: Levantar dev server**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev
```

- [ ] **Step 2: Login como admin → ver calendario**

Ir a `/admin/citas`. URL debe redirigir a `/admin/citas/calendario`.

- En vista Semana: ver bloques de citas creadas en Plan 2 (al menos la del miércoles).
- Toggle a Mes: ver el mismo día con cita resaltada.
- Filtrar por clínico → solo se muestran citas de ese clínico.
- Filtrar por estado "Programada" → solo `scheduled`.
- Filtrar rango de fechas (desde / hasta) → solo citas en rango.
- "Limpiar filtros" → vuelve a todo.

- [ ] **Step 3: Click en una cita → drawer**

Click en el bloque de la cita. Drawer abre con:
- Fecha y hora
- Estado
- Paciente (nombre + email)
- Clínico asignado (admin SÍ ve este nombre)
- 4 botones: Marcar completada, Reagendar, Marcar no-show, Cancelar cita

- [ ] **Step 4: Probar reagendamiento**

- Click "Reagendar".
- Nueva fecha: 2 días después. Hora: 10:00.
- Confirmar. Modal cierra. Cita se mueve.
- En SQL:
  ```sql
  select id, starts_at, reminder_24h_sent_at from public.appointments
  where status='scheduled' order by created_at desc limit 1;
  ```
  `starts_at` debe ser la nueva fecha. `reminder_24h_sent_at` debe ser NULL (resetea recordatorios).
- Audit log:
  ```sql
  select action, metadata from public.audit_log where action='admin_reschedule_appointment' order by created_at desc limit 1;
  ```

- [ ] **Step 5: Probar cancelación con devolución de crédito**

- Click "Cancelar cita".
- Razón: "Test cancelación".
- Checkbox "Devolver crédito" debe estar marcado por default si faltan ≥24h.
- Confirmar. Modal cierra.
- Estado de la cita ahora es "Cancelada", crédito vuelve al paciente.
- Verificar en SQL:
  ```sql
  select status, credit_returned, cancellation_reason from public.appointments where id='<cita_uuid>';
  select sum(remaining) from public.evaluation_credits where patient_id='<patient_uuid>';
  ```

- [ ] **Step 6: Probar tabla de citas**

Ir a tab "Tabla de citas":
- Ver todas las citas (incluyendo la cancelada).
- Buscar por nombre del paciente → filtra.
- Click "Ver detalle" → mismo drawer del calendario.
- Click "⬇ Exportar CSV" → archivo descargado con todas las filas. Abrirlo con Excel: nombres con tildes correctos (UTF-8 BOM), comas escapadas si las hay.

- [ ] **Step 7: Login como clínico → ver agenda**

Logout. Login como clínico que tiene citas asignadas.

- En sidebar: "Mi agenda" (debajo de "Mi disponibilidad"). Click.
- Header con métricas: Hoy / Esta semana / Próxima cita / botón Teams.
- Vista "Semana" (default): citas asignadas a este clínico.
- Toggle "Mes": vista mensual.
- Toggle "Lista": citas agrupadas Hoy/Mañana/Esta semana/Este mes/Próximamente.

- [ ] **Step 8: Click en una cita del clínico**

Drawer del clínico abre (read-only):
- Nombre del paciente
- Email
- Botón "Unirme a Teams ahora" (sin restricción de 24h — el clínico siempre puede entrar).

- [ ] **Step 9: Verificar permisos**

- Como clínico, intentar acceder directo a `/admin/citas/calendario` → debe redirigir a `/admin` (no es admin).
- Como clínico, NO debe haber botones de cancelar/reagendar/etc en su vista (CitaDrawerClinico es read-only).

- [ ] **Step 10: Probar marcar completada**

Login como admin de nuevo. Tomar una cita scheduled, drawer, "Marcar como completada". Estado pasa a "Completada", no devuelve crédito (no se le pregunta).

- [ ] **Step 11: Probar marcar no-show**

Otra cita scheduled (o si no hay, crear una). Drawer → "Marcar no-show". Modal con checkbox "Devolver crédito" desmarcado por default.
Confirmar.
- Estado: "No asistió"
- Crédito NO devuelto.
- Audit log: `action='admin_mark_no_show'`.

- [ ] **Step 12: Detener dev server + correr tests**

```bash
npx tsc --noEmit && npm test
```

Expected: tsc clean, 23 tests passing (5 nuevos de CSV + 18 previos).

---

## Self-Review

Antes de mergear:

- [ ] Spec sección "Tab Calendario admin" — semanal + mensual + drawer + 4 acciones (cancelar, reagendar, no-show, completar) ✓.
- [ ] Spec sección "Tab Tabla admin" — paginada, filtrable, búsqueda, CSV ✓.
- [ ] Spec sección "Tab Pagos" — sin cambios (Plan 1 lo cubrió).
- [ ] Spec sección "Vista clínico" — 3 modos (Semana/Mes/Lista), métricas, Teams sin restricción 24h ✓.
- [ ] Política de cancelación: sugerencia de devolver crédito si ≥24h, admin puede toggle ✓.
- [ ] No-show: default no devolver crédito ✓.
- [ ] Reagendamiento: resetea recordatorios ✓.

---

## Resumen de lo que entrega Plan 3

✅ `/admin/citas/calendario` con vistas Semana/Mes y filtros (clínico, estado, rango).
✅ Drawer del admin con detalles + 4 acciones (cancel/reschedule/no-show/complete).
✅ Audit log para todas las acciones del admin.
✅ Política de devolución de crédito automática (sugerida ≥24h, admin decide).
✅ `/admin/citas/tabla` con búsqueda, filtros y export CSV (BOM UTF-8 para Excel).
✅ `/admin/clinico/agenda` con toggle Semana/Mes/Lista + métricas.
✅ Drawer del clínico (read-only) con botón Teams sin restricción 24h.
✅ 5 unit tests nuevos para CSV helper.

❌ Notificaciones por email + recordatorios — Plan 4.
❌ Reasignación auto al desactivar clínico + alertas dashboard — Plan 5.
❌ Wompi — Plan 6.
❌ Slot picker completo (estilo paciente) en reagendamiento del admin — usa datetime-local; Plan 5 puede mejorar.

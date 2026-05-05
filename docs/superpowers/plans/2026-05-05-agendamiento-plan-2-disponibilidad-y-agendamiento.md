# Agendamiento — Plan 2: Disponibilidad del clínico + agendamiento del paciente

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer funcional el agendamiento end-to-end: el clínico configura su horario base + bloqueos puntuales en `/admin/clinico/disponibilidad`, y el paciente reserva un slot en `/agendar` consumiendo un crédito. La asignación de clínico es ciega (round-robin pool, paciente nunca ve el nombre).

**Architecture:** Slots **computados al vuelo** (no materializados): la query combina `clinician_schedules` + `schedule_blocks` + `appointments` + función SQL `pick_least_loaded_clinician()` (ya creada en Plan 1) para devolver disponibilidad y asignar. El booking es atómico (creación de cita + consumo de crédito vía optimistic-CAS, protección anti doble-booking via UNIQUE constraint en DB). Patient UI es una sola página que cambia de Estado A/B/C según créditos y citas.

**Tech Stack:** Next.js 16 + Supabase + Tailwind 4 + framer-motion + date-fns + date-fns-tz (nuevo) + Vitest (nuevo).

**Spec:** [`docs/superpowers/specs/2026-05-04-agendamiento-evaluaciones-design.md`](../specs/2026-05-04-agendamiento-evaluaciones-design.md)
**Plan anterior:** [Plan 1 — Fundamentos + Pagos manuales](./2026-05-04-agendamiento-plan-1-fundamentos.md)

**Estado al iniciar Plan 2 (asumido):**
- Migración v9 aplicada en Supabase ✓
- Plan 1 mergeado a `main` ✓
- Existen tablas `clinician_schedules`, `schedule_blocks`, `appointments`, `evaluation_credits`, `payments`, `audit_log` ✓
- Función SQL `pick_least_loaded_clinician(timestamptz)` disponible ✓
- Helper `consumeOneCredit(patientId)` con optimistic CAS disponible ✓
- Hay al menos 1 paciente con créditos vivos (creados vía pago manual en Plan 1) ✓

**Convenciones a respetar (del Plan 1):**
- Server actions: `"use server"` + `getCurrentProfile()` + `isAdmin()`/`isClinico()`/role check, retornan `{ ok: true } | { ok: false; error: string }`.
- Money en centavos en DB.
- Fechas en `timestamptz` UTC; UI muestra en `America/Bogota` (UTC-5, sin DST).
- En user-facing copy: "evaluación de salud", nunca "historia clínica".
- Patient nunca ve `clinician_id` ni nombre del clínico (decisión 5.b del spec).

**Verificación:** Plan 2 introduce **Vitest** porque el cómputo de slots tiene mucha lógica de fechas/timezone/edge cases que es testeable de verdad. La Task 4 incluye unit tests críticos. Para el resto, manual e2e final.

---

## File Structure

**Crear:**

Backend / domain:
- `src/lib/scheduling/types.ts` — tipos compartidos: `SlotISO`, `ScheduleEntry`, `BlockEntry`, `Appointment`, `AppointmentStatus`.
- `src/lib/scheduling/constants.ts` — `SLOT_DURATION_MIN=30`, `BUFFER_MIN=10`, `MIN_NOTICE_HOURS=24`, `BOGOTA_TZ='America/Bogota'`.
- `src/lib/scheduling/format.ts` — utilidades puras de fecha/hora en Bogota TZ (formato display, ISO conversions). Sin imports de Supabase.
- `src/lib/scheduling/slots.ts` — `computeAvailableSlots(rangeStart, rangeEnd)`, `slotsToDayMap(slots)`. Helpers puros + 1 fetch a Supabase.
- `src/lib/scheduling/schedules.ts` — CRUD de `clinician_schedules` y `schedule_blocks`. Funciones para clínico (RLS aplica) y admin (bypass).
- `src/lib/scheduling/booking.ts` — `bookAppointment(patientId, slotStartIso)` (atómico), `getActiveAppointment(patientId)`, `listPastAppointments(patientId)`.
- `src/lib/scheduling/__tests__/slots.test.ts` — unit tests del cómputo.
- `src/lib/scheduling/__tests__/format.test.ts` — unit tests de formato.
- `vitest.config.ts` — config de Vitest.

Clínico UI:
- `src/app/(admin)/admin/clinico/disponibilidad/page.tsx` — server, carga horarios + bloqueos del clínico.
- `src/app/(admin)/admin/clinico/disponibilidad/actions.ts` — server actions `saveScheduleEntry`, `deleteScheduleEntry`, `createBlock`, `deleteBlock`.
- `src/components/admin/HorarioBaseEditor.tsx` — client, tabla por día de la semana.
- `src/components/admin/BloqueosManager.tsx` — client, lista + botón crear.
- `src/components/admin/CrearBloqueoModal.tsx` — client, modal con form.

Patient UI:
- `src/app/(dashboard)/agendar/page.tsx` — server, dispatcher por estado.
- `src/app/(dashboard)/agendar/actions.ts` — server actions `requestManualPaymentMessage`, `bookSlot`.
- `src/components/dashboard/EstadoSinCreditos.tsx` — Estado A.
- `src/components/dashboard/SelectorSlot.tsx` — Estado B (selector tipo Calendly).
- `src/components/dashboard/CitaActiva.tsx` — Estado C.
- `src/components/dashboard/EvaluacionesPasadas.tsx` — sección histórica del Estado C.
- `src/lib/scheduling/teamsLink.ts` — helper que resuelve si el link de Teams se debe mostrar (24h gate) y devuelve la URL si aplica.

**Modificar:**
- `package.json` — agregar deps `date-fns`, `date-fns-tz`, `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react` (para tests futuros), nuevo script `"test": "vitest"`.
- `src/components/admin/AdminShell.tsx` — agregar "Mi disponibilidad" en grupo "Clínico" (visible solo a clínico).
- `src/components/dashboard/DashboardShell.tsx` — agregar "Agendar evaluación" en sidebar del paciente.

---

## Task 1 — Instalar y configurar Vitest + date-fns

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Agregar dependencias**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && \
npm install --save date-fns date-fns-tz && \
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

Verificar que `package.json` quede con las nuevas deps en las secciones correspondientes.

- [ ] **Step 2: Agregar script de tests a `package.json`**

En la sección `"scripts"`, después de `"lint": "eslint"`, agregar:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
```

- [ ] **Step 3: Crear `vitest.config.ts` en la raíz del proyecto**

```typescript
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "node",                  // los tests de scheduling no necesitan DOM
    globals: false,
    include: ["src/**/__tests__/**/*.test.ts", "src/**/__tests__/**/*.test.tsx"],
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 4: Smoke test — crear un test trivial para verificar la config funciona**

Crear `src/lib/__tests__/_smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest"

describe("smoke", () => {
  it("vitest runs and assertions work", () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Correr el smoke test**

```bash
npm test
```

Expected: 1 test passed, 0 failed. Si falla, debugear la config antes de seguir.

- [ ] **Step 6: Borrar el smoke test (ya no lo necesitamos)**

```bash
rm src/lib/__tests__/_smoke.test.ts
rmdir src/lib/__tests__ 2>/dev/null || true
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore(scheduling): add vitest + date-fns for slot computation tests"
```

---

## Task 2 — Tipos compartidos del dominio

**Files:**
- Create: `src/lib/scheduling/types.ts`
- Create: `src/lib/scheduling/constants.ts`

- [ ] **Step 1: Crear `src/lib/scheduling/constants.ts`**

```typescript
/** Constantes operativas del agendamiento (decisiones del spec). */

export const SLOT_DURATION_MIN = 30
export const BUFFER_MIN = 10                 // tiempo libre entre citas
export const MIN_NOTICE_HOURS = 24            // anticipación mínima del paciente
export const BOGOTA_TZ = "America/Bogota"

/** Rango (en días) que el selector del paciente examina hacia adelante para "no hay disponibilidad" */
export const NO_AVAILABILITY_LOOKAHEAD_DAYS = 90
```

- [ ] **Step 2: Crear `src/lib/scheduling/types.ts`**

```typescript
export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show"

export interface ScheduleEntry {
  id: string
  clinician_id: string
  weekday: number              // 0=domingo, 1=lunes, ..., 6=sábado
  start_time: string           // "HH:MM:SS" o "HH:MM"
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BlockEntry {
  id: string
  clinician_id: string
  start_at: string             // ISO timestamptz
  end_at: string
  reason: string | null
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  clinician_id: string
  starts_at: string            // ISO timestamptz UTC
  ends_at: string
  status: AppointmentStatus
  credit_id: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  credit_returned: boolean
  reminder_24h_sent_at: string | null
  reminder_1h_sent_at: string | null
  created_at: string
  updated_at: string
}

/** Slot disponible computado al vuelo. Sin clinician_id porque el paciente no debe verlo. */
export interface AvailableSlot {
  starts_at: string            // ISO UTC
  ends_at: string              // starts_at + 30 min
}

/** Mapa día → slots disponibles, para pintar el grid del paciente. */
export interface SlotsByDay {
  [dateBogotaIso: string]: AvailableSlot[]   // key formato "YYYY-MM-DD" en Bogota TZ
}
```

- [ ] **Step 3: Verificar typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scheduling/types.ts src/lib/scheduling/constants.ts
git commit -m "feat(scheduling): add domain types and constants"
```

---

## Task 3 — Utilidades de formato (Bogota TZ)

**Files:**
- Create: `src/lib/scheduling/format.ts`
- Create: `src/lib/scheduling/__tests__/format.test.ts`

- [ ] **Step 1: Crear `src/lib/scheduling/format.ts`**

```typescript
import { parseISO, addMinutes } from "date-fns"
import { toZonedTime, fromZonedTime, format as tzFormat } from "date-fns-tz"
import { es } from "date-fns/locale"
import { BOGOTA_TZ, SLOT_DURATION_MIN } from "./constants"

/** Convierte ISO UTC → "YYYY-MM-DD" en Bogota TZ. Útil como key de día. */
export function utcIsoToBogotaDateKey(iso: string): string {
  return tzFormat(toZonedTime(parseISO(iso), BOGOTA_TZ), "yyyy-MM-dd", { timeZone: BOGOTA_TZ })
}

/** Convierte "YYYY-MM-DD HH:mm" Bogota → ISO UTC */
export function bogotaToUtcIso(dateBogota: string, timeBogota: string): string {
  // dateBogota="2026-05-10", timeBogota="10:00"
  const local = `${dateBogota}T${timeBogota.length === 5 ? timeBogota : timeBogota.slice(0, 5)}:00`
  return fromZonedTime(local, BOGOTA_TZ).toISOString()
}

/** Format human-friendly en Bogota TZ. Ej: "jueves 8 mayo, 10:30 AM" */
export function formatHumanDateTimeBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "EEEE d MMM, h:mm a", { timeZone: BOGOTA_TZ, locale: es })
}

/** Format de hora corta. Ej: "10:30 AM" */
export function formatTimeBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "h:mm a", { timeZone: BOGOTA_TZ })
}

/** Format fecha corta. Ej: "jueves 8 mayo 2026" */
export function formatDateBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "EEEE d MMM yyyy", { timeZone: BOGOTA_TZ, locale: es })
}

/** Format mes completo. Ej: "Mayo 2026" */
export function formatMonthBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "MMMM yyyy", { timeZone: BOGOTA_TZ, locale: es })
}

/** Hora de fin del slot dado el ISO de inicio. */
export function slotEndIso(startIso: string): string {
  return addMinutes(parseISO(startIso), SLOT_DURATION_MIN).toISOString()
}

/** Devuelve el inicio del día (00:00 Bogota) en UTC ISO, dado un ISO de cualquier hora. */
export function startOfDayBogotaIso(iso: string): string {
  const dateKey = utcIsoToBogotaDateKey(iso)
  return bogotaToUtcIso(dateKey, "00:00")
}

/** Devuelve el final del día (23:59:59.999 Bogota) en UTC ISO. */
export function endOfDayBogotaIso(iso: string): string {
  const dateKey = utcIsoToBogotaDateKey(iso)
  return fromZonedTime(`${dateKey}T23:59:59.999`, BOGOTA_TZ).toISOString()
}

/** Diferencia en milisegundos entre `target` y `now`. Negativo si target ya pasó. */
export function msUntil(targetIso: string): number {
  return parseISO(targetIso).getTime() - Date.now()
}
```

- [ ] **Step 2: Crear `src/lib/scheduling/__tests__/format.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import {
  utcIsoToBogotaDateKey,
  bogotaToUtcIso,
  formatTimeBogota,
  slotEndIso,
  startOfDayBogotaIso,
  endOfDayBogotaIso,
} from "../format"

describe("Bogota TZ format helpers", () => {
  it("converts UTC midnight to Bogota previous day 19:00 (UTC-5)", () => {
    // 2026-05-10 00:00 UTC = 2026-05-09 19:00 Bogota
    expect(utcIsoToBogotaDateKey("2026-05-10T00:00:00.000Z")).toBe("2026-05-09")
  })

  it("converts UTC 04:00 to Bogota 23:00 prev day", () => {
    expect(utcIsoToBogotaDateKey("2026-05-10T04:00:00.000Z")).toBe("2026-05-09")
  })

  it("UTC 05:00 is Bogota midnight = same day", () => {
    expect(utcIsoToBogotaDateKey("2026-05-10T05:00:00.000Z")).toBe("2026-05-10")
  })

  it("converts Bogota local to UTC ISO", () => {
    // 2026-05-10 10:00 Bogota = 15:00 UTC
    expect(bogotaToUtcIso("2026-05-10", "10:00")).toBe("2026-05-10T15:00:00.000Z")
  })

  it("formatTimeBogota renders 10:30 AM for UTC 15:30", () => {
    expect(formatTimeBogota("2026-05-10T15:30:00.000Z")).toMatch(/10:30\s?AM/i)
  })

  it("slotEndIso adds 30 min", () => {
    expect(slotEndIso("2026-05-10T15:00:00.000Z")).toBe("2026-05-10T15:30:00.000Z")
  })

  it("startOfDayBogotaIso returns 00:00 Bogota = 05:00 UTC", () => {
    expect(startOfDayBogotaIso("2026-05-10T15:00:00.000Z")).toBe("2026-05-10T05:00:00.000Z")
  })

  it("endOfDayBogotaIso returns 23:59:59.999 Bogota = 04:59:59.999 UTC next day", () => {
    expect(endOfDayBogotaIso("2026-05-10T15:00:00.000Z")).toBe("2026-05-11T04:59:59.999Z")
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 8 tests passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scheduling/format.ts src/lib/scheduling/__tests__/format.test.ts
git commit -m "feat(scheduling): add Bogota TZ format utilities with tests"
```

---

## Task 4 — Cómputo de slots disponibles + tests

**Files:**
- Create: `src/lib/scheduling/slots.ts`
- Create: `src/lib/scheduling/__tests__/slots.test.ts`

Esta tarea es **el corazón del feature**. Es la única que tiene lógica testeable rica. Tests primero.

- [ ] **Step 1: Definir el contrato — solo el "puro" (sin DB) primero**

Crear `src/lib/scheduling/slots.ts` con la función pura `generateSlotsForDay`. La capa con DB viene en Step 4 abajo.

```typescript
import { addMinutes, parseISO } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  SLOT_DURATION_MIN,
  BUFFER_MIN,
  MIN_NOTICE_HOURS,
  BOGOTA_TZ,
} from "./constants"
import type { ScheduleEntry, BlockEntry, Appointment, AvailableSlot, SlotsByDay } from "./types"
import { utcIsoToBogotaDateKey } from "./format"

/**
 * Genera los slots de 30 min para un día específico de un clínico,
 * dadas las entradas de horario base que aplican a ese día.
 * Pure function — no DB calls.
 *
 * @param dateBogotaKey  formato "YYYY-MM-DD" en Bogota TZ
 * @param schedules      schedule entries activas para ese weekday
 * @returns ISO timestamps UTC de cada slot start (sin restar bloqueos / citas todavía)
 */
export function generateSlotsForDay(
  dateBogotaKey: string,
  schedules: Pick<ScheduleEntry, "start_time" | "end_time">[],
): string[] {
  const slots: string[] = []
  const slotMs = SLOT_DURATION_MIN * 60 * 1000
  const stepMs = (SLOT_DURATION_MIN + BUFFER_MIN) * 60 * 1000

  for (const sch of schedules) {
    // Construir Date para start y end del horario en Bogota TZ
    const startBogota = `${dateBogotaKey}T${sch.start_time.slice(0, 5)}:00`
    const endBogota = `${dateBogotaKey}T${sch.end_time.slice(0, 5)}:00`
    const startUtc = fromZonedTime(startBogota, BOGOTA_TZ)
    const endUtc = fromZonedTime(endBogota, BOGOTA_TZ)

    let cursor = startUtc.getTime()
    // Mientras quepa un slot completo (cursor + 30 min) <= end del horario
    while (cursor + slotMs <= endUtc.getTime()) {
      slots.push(new Date(cursor).toISOString())
      cursor += stepMs           // siguiente slot empieza 40 min después (30 cita + 10 buffer)
    }
  }
  return slots
}

/**
 * Filtra los slots removiendo los que caen en bloqueos puntuales.
 * Pure function.
 */
export function filterByBlocks(slots: string[], blocks: Pick<BlockEntry, "start_at" | "end_at">[]): string[] {
  return slots.filter((slotStartIso) => {
    const slotStart = parseISO(slotStartIso).getTime()
    const slotEnd = slotStart + SLOT_DURATION_MIN * 60 * 1000
    return !blocks.some((b) => {
      const bStart = parseISO(b.start_at).getTime()
      const bEnd = parseISO(b.end_at).getTime()
      // Overlap: bStart < slotEnd AND bEnd > slotStart
      return bStart < slotEnd && bEnd > slotStart
    })
  })
}

/**
 * Filtra los slots removiendo los que ya están reservados (citas activas).
 * Pure function.
 */
export function filterByAppointments(
  slots: string[],
  appointments: Pick<Appointment, "starts_at" | "status">[],
): string[] {
  const taken = new Set(
    appointments.filter((a) => a.status === "scheduled").map((a) => a.starts_at),
  )
  return slots.filter((s) => !taken.has(s))
}

/**
 * Filtra los slots removiendo los que están dentro de la ventana de "anticipación mínima".
 * Pure function — recibe `now` para testabilidad.
 */
export function filterByMinNotice(slots: string[], now: Date = new Date()): string[] {
  const cutoffMs = now.getTime() + MIN_NOTICE_HOURS * 60 * 60 * 1000
  return slots.filter((s) => parseISO(s).getTime() >= cutoffMs)
}

/**
 * Computa los slots disponibles agregados de TODO el pool de clínicos activos
 * dentro del rango [rangeStart, rangeEnd]. Cada slot se incluye si AL MENOS UN clínico
 * lo tiene disponible.
 *
 * Llama a Supabase. Usa admin client (bypass RLS) porque el caller es un server action
 * que ya validó al usuario.
 */
export async function computeAvailableSlots(
  rangeStart: Date,
  rangeEnd: Date,
  now: Date = new Date(),
): Promise<SlotsByDay> {
  const admin = createAdminClient()

  // 1. Cargar todos los clínicos activos
  const { data: clinicians, error: cliErr } = await admin
    .from("users")
    .select("id")
    .eq("role", "clinico")
    .eq("is_active", true)
  if (cliErr) throw new Error(`Error loading clinicians: ${cliErr.message}`)
  if (!clinicians || clinicians.length === 0) return {}

  const clinicianIds = clinicians.map((c) => c.id)

  // 2. Cargar schedules activos de todos
  const { data: schedules, error: schErr } = await admin
    .from("clinician_schedules")
    .select("clinician_id, weekday, start_time, end_time")
    .in("clinician_id", clinicianIds)
    .eq("is_active", true)
  if (schErr) throw new Error(`Error loading schedules: ${schErr.message}`)

  // 3. Cargar bloqueos en el rango
  const { data: blocks, error: blkErr } = await admin
    .from("schedule_blocks")
    .select("clinician_id, start_at, end_at")
    .in("clinician_id", clinicianIds)
    .lt("start_at", rangeEnd.toISOString())
    .gt("end_at", rangeStart.toISOString())
  if (blkErr) throw new Error(`Error loading blocks: ${blkErr.message}`)

  // 4. Cargar citas scheduled en el rango
  const { data: appointments, error: aptErr } = await admin
    .from("appointments")
    .select("clinician_id, starts_at, status")
    .in("clinician_id", clinicianIds)
    .eq("status", "scheduled")
    .gte("starts_at", rangeStart.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
  if (aptErr) throw new Error(`Error loading appointments: ${aptErr.message}`)

  // 5. Iterar día a día en Bogota, generar slots por clínico, agregar el set unión
  const result: SlotsByDay = {}
  const slotsAccumulator = new Set<string>()

  // Schedules indexados por (clinician, weekday)
  const schedByCliWeekday = new Map<string, Pick<ScheduleEntry, "start_time" | "end_time">[]>()
  for (const s of schedules ?? []) {
    const key = `${s.clinician_id}_${s.weekday}`
    if (!schedByCliWeekday.has(key)) schedByCliWeekday.set(key, [])
    schedByCliWeekday.get(key)!.push({ start_time: s.start_time, end_time: s.end_time })
  }

  // Blocks indexados por clínico
  const blocksByCli = new Map<string, Pick<BlockEntry, "start_at" | "end_at">[]>()
  for (const b of blocks ?? []) {
    if (!blocksByCli.has(b.clinician_id)) blocksByCli.set(b.clinician_id, [])
    blocksByCli.get(b.clinician_id)!.push({ start_at: b.start_at, end_at: b.end_at })
  }

  // Appointments indexados por clínico
  const aptsByCli = new Map<string, Pick<Appointment, "starts_at" | "status">[]>()
  for (const a of appointments ?? []) {
    if (!aptsByCli.has(a.clinician_id)) aptsByCli.set(a.clinician_id, [])
    aptsByCli.get(a.clinician_id)!.push({ starts_at: a.starts_at, status: a.status })
  }

  // Iterar día por día (en Bogota)
  const dayMs = 24 * 60 * 60 * 1000
  let cursor = rangeStart.getTime()
  while (cursor <= rangeEnd.getTime()) {
    const dateBogotaKey = utcIsoToBogotaDateKey(new Date(cursor).toISOString())
    const weekday = toZonedTime(new Date(cursor), BOGOTA_TZ).getDay()

    // Por cada clínico, generar y filtrar
    for (const cliId of clinicianIds) {
      const sched = schedByCliWeekday.get(`${cliId}_${weekday}`) ?? []
      if (sched.length === 0) continue

      let slots = generateSlotsForDay(dateBogotaKey, sched)
      slots = filterByBlocks(slots, blocksByCli.get(cliId) ?? [])
      slots = filterByAppointments(slots, aptsByCli.get(cliId) ?? [])

      for (const s of slots) slotsAccumulator.add(s)
    }
    cursor += dayMs
  }

  // Aplicar filtro de min notice y ordenar por día
  const filteredSlots = filterByMinNotice(Array.from(slotsAccumulator), now).sort()

  for (const slotIso of filteredSlots) {
    const dayKey = utcIsoToBogotaDateKey(slotIso)
    if (!result[dayKey]) result[dayKey] = []
    result[dayKey].push({
      starts_at: slotIso,
      ends_at: addMinutes(parseISO(slotIso), SLOT_DURATION_MIN).toISOString(),
    })
  }

  return result
}
```

- [ ] **Step 2: Crear tests para las funciones puras**

`src/lib/scheduling/__tests__/slots.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  generateSlotsForDay,
  filterByBlocks,
  filterByAppointments,
  filterByMinNotice,
} from "../slots"

describe("generateSlotsForDay", () => {
  it("returns 6 slots for a single 4h schedule (8:00-12:00 Bogota = 13:00-17:00 UTC)", () => {
    // 8:00-12:00 Bogota, slots de 30 min con buffer 10 min → cada 40 min
    // 8:00, 8:40, 9:20, 10:00, 10:40, 11:20 → 6 slots (último = 11:20-11:50, dentro del horario)
    const slots = generateSlotsForDay("2026-05-11", [
      { start_time: "08:00", end_time: "12:00" },
    ])
    expect(slots).toHaveLength(6)
    expect(slots[0]).toBe("2026-05-11T13:00:00.000Z")           // 8:00 Bogota
    expect(slots[5]).toBe("2026-05-11T16:20:00.000Z")           // 11:20 Bogota
  })

  it("supports split schedule (morning + afternoon)", () => {
    const slots = generateSlotsForDay("2026-05-11", [
      { start_time: "08:00", end_time: "10:00" },     // 8:00, 8:40, 9:20 → 3 (último 9:20-9:50)
      { start_time: "14:00", end_time: "16:00" },     // 14:00, 14:40, 15:20 → 3
    ])
    expect(slots).toHaveLength(6)
  })

  it("returns 0 slots for empty schedule list", () => {
    expect(generateSlotsForDay("2026-05-11", [])).toEqual([])
  })

  it("respects buffer — 8:00-9:00 only fits 1 slot", () => {
    // 8:00-9:00 = 60 min. Slot=30 + buffer=10. 8:00-8:30 cabe. 8:40 no cabe (8:40+30=9:10 > 9:00)
    const slots = generateSlotsForDay("2026-05-11", [
      { start_time: "08:00", end_time: "09:00" },
    ])
    expect(slots).toHaveLength(1)
    expect(slots[0]).toBe("2026-05-11T13:00:00.000Z")
  })
})

describe("filterByBlocks", () => {
  it("removes slots that overlap with a block", () => {
    const slots = [
      "2026-05-11T13:00:00.000Z",
      "2026-05-11T13:40:00.000Z",
      "2026-05-11T14:20:00.000Z",
    ]
    // Block from 13:30 to 14:00 UTC overlaps with the second slot (13:40-14:10)
    const blocks = [
      { start_at: "2026-05-11T13:30:00.000Z", end_at: "2026-05-11T14:00:00.000Z" },
    ]
    const result = filterByBlocks(slots, blocks)
    expect(result).toEqual([
      "2026-05-11T13:00:00.000Z",
      "2026-05-11T14:20:00.000Z",
    ])
  })

  it("does NOT remove slot whose end exactly equals block start (touching but not overlapping)", () => {
    const slots = ["2026-05-11T13:00:00.000Z"] // 13:00-13:30
    const blocks = [{ start_at: "2026-05-11T13:30:00.000Z", end_at: "2026-05-11T14:00:00.000Z" }]
    expect(filterByBlocks(slots, blocks)).toEqual(["2026-05-11T13:00:00.000Z"])
  })

  it("removes slot when block fully contains it", () => {
    const slots = ["2026-05-11T13:00:00.000Z"]
    const blocks = [{ start_at: "2026-05-11T12:00:00.000Z", end_at: "2026-05-11T15:00:00.000Z" }]
    expect(filterByBlocks(slots, blocks)).toEqual([])
  })
})

describe("filterByAppointments", () => {
  it("removes slot already taken by a scheduled appointment", () => {
    const slots = ["2026-05-11T13:00:00.000Z", "2026-05-11T13:40:00.000Z"]
    const apts = [{ starts_at: "2026-05-11T13:00:00.000Z", status: "scheduled" as const }]
    expect(filterByAppointments(slots, apts)).toEqual(["2026-05-11T13:40:00.000Z"])
  })

  it("ignores cancelled appointments", () => {
    const slots = ["2026-05-11T13:00:00.000Z"]
    const apts = [{ starts_at: "2026-05-11T13:00:00.000Z", status: "cancelled" as const }]
    expect(filterByAppointments(slots, apts)).toEqual(["2026-05-11T13:00:00.000Z"])
  })
})

describe("filterByMinNotice", () => {
  it("removes slots that are within MIN_NOTICE_HOURS", () => {
    const now = new Date("2026-05-10T12:00:00.000Z")
    const slots = [
      "2026-05-10T20:00:00.000Z",          // 8h ahead — too soon
      "2026-05-11T11:00:00.000Z",          // 23h ahead — too soon
      "2026-05-11T12:00:00.000Z",          // exactly 24h — borderline (>= passes)
      "2026-05-11T13:00:00.000Z",          // 25h ahead — ok
    ]
    expect(filterByMinNotice(slots, now)).toEqual([
      "2026-05-11T12:00:00.000Z",
      "2026-05-11T13:00:00.000Z",
    ])
  })
})
```

- [ ] **Step 3: Run tests, expect failures (red)**

```bash
npm test
```

Expected: tests fail because `slots.ts` exists but maybe still has bugs to refine. If all pass directly, great — move on. Otherwise fix.

- [ ] **Step 4: Run tests, expect green**

```bash
npm test
```

Expected: 12 tests passed (8 from format + 12 from slots... wait, 8 + 12 = 20).

Actually: **8 tests in format.test.ts (Task 3) + 12 tests in slots.test.ts (this task) = 20 total**.

- [ ] **Step 5: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scheduling/slots.ts src/lib/scheduling/__tests__/slots.test.ts
git commit -m "feat(scheduling): add slot computation with unit tests"
```

---

## Task 5 — CRUD de horarios y bloqueos del clínico

**Files:**
- Create: `src/lib/scheduling/schedules.ts`

- [ ] **Step 1: Crear el módulo**

```typescript
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseISO } from "date-fns"
import type { ScheduleEntry, BlockEntry } from "./types"

/* ============================================================
 * Lecturas (usan session client — RLS aplica)
 * ============================================================ */

/** Trae los horarios base de un clínico (filtra a is_active si quieres). */
export async function getClinicianSchedules(clinicianId: string): Promise<ScheduleEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clinician_schedules")
    .select("*")
    .eq("clinician_id", clinicianId)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true })
  if (error) throw new Error(`Error reading schedules: ${error.message}`)
  return (data ?? []) as ScheduleEntry[]
}

/** Trae los bloqueos puntuales de un clínico, ordenados por start_at desc. */
export async function getClinicianBlocks(clinicianId: string): Promise<BlockEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("*")
    .eq("clinician_id", clinicianId)
    .order("start_at", { ascending: false })
  if (error) throw new Error(`Error reading blocks: ${error.message}`)
  return (data ?? []) as BlockEntry[]
}

/* ============================================================
 * Escrituras (usan admin client — bypass RLS, caller debe
 * haber validado que el actor es el dueño o admin)
 * ============================================================ */

export interface UpsertScheduleInput {
  id?: string                    // si presente, update; si null, insert
  clinician_id: string
  weekday: number                // 0-6
  start_time: string             // "HH:MM"
  end_time: string
  is_active: boolean
}

export async function upsertSchedule(input: UpsertScheduleInput): Promise<string> {
  if (input.weekday < 0 || input.weekday > 6) throw new Error("weekday inválido")
  if (input.start_time >= input.end_time) throw new Error("start_time debe ser menor que end_time")

  const admin = createAdminClient()
  if (input.id) {
    const { error } = await admin
      .from("clinician_schedules")
      .update({
        weekday: input.weekday,
        start_time: input.start_time,
        end_time: input.end_time,
        is_active: input.is_active,
      })
      .eq("id", input.id)
      .eq("clinician_id", input.clinician_id)        // defensa extra
    if (error) throw new Error(`Error updating schedule: ${error.message}`)
    return input.id
  } else {
    const { data, error } = await admin
      .from("clinician_schedules")
      .insert({
        clinician_id: input.clinician_id,
        weekday: input.weekday,
        start_time: input.start_time,
        end_time: input.end_time,
        is_active: input.is_active,
      })
      .select("id")
      .single()
    if (error || !data) throw new Error(`Error inserting schedule: ${error?.message ?? "no data"}`)
    return data.id
  }
}

export async function deleteSchedule(scheduleId: string, clinicianId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("clinician_schedules")
    .delete()
    .eq("id", scheduleId)
    .eq("clinician_id", clinicianId)
  if (error) throw new Error(`Error deleting schedule: ${error.message}`)
}

export interface CreateBlockInput {
  clinician_id: string
  start_at: string               // ISO UTC
  end_at: string
  reason: string | null
}

/**
 * Crea un bloqueo. PRIMERO verifica que no haya citas SCHEDULED dentro del rango;
 * si las hay, lanza un error informativo (admin debe reasignar primero).
 */
export async function createBlock(input: CreateBlockInput): Promise<string> {
  if (parseISO(input.start_at).getTime() >= parseISO(input.end_at).getTime()) {
    throw new Error("La fecha/hora de inicio debe ser anterior a la de fin")
  }

  const admin = createAdminClient()

  // Check de citas en conflicto
  const { data: conflicts, error: cErr } = await admin
    .from("appointments")
    .select("id, starts_at")
    .eq("clinician_id", input.clinician_id)
    .eq("status", "scheduled")
    .gte("starts_at", input.start_at)
    .lt("starts_at", input.end_at)
  if (cErr) throw new Error(`Error verificando citas: ${cErr.message}`)
  if (conflicts && conflicts.length > 0) {
    throw new Error(
      `Hay ${conflicts.length} cita(s) programada(s) dentro de este rango. Pide al admin reasignarlas o cancelarlas antes de crear el bloqueo.`,
    )
  }

  const { data, error } = await admin
    .from("schedule_blocks")
    .insert({
      clinician_id: input.clinician_id,
      start_at: input.start_at,
      end_at: input.end_at,
      reason: input.reason,
    })
    .select("id")
    .single()
  if (error || !data) throw new Error(`Error creando bloqueo: ${error?.message ?? "no data"}`)
  return data.id
}

export async function deleteBlock(blockId: string, clinicianId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("schedule_blocks")
    .delete()
    .eq("id", blockId)
    .eq("clinician_id", clinicianId)
  if (error) throw new Error(`Error eliminando bloqueo: ${error.message}`)
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scheduling/schedules.ts
git commit -m "feat(scheduling): add schedule and block CRUD with appointment-conflict check"
```

---

## Task 6 — Booking atómico

**Files:**
- Create: `src/lib/scheduling/booking.ts`

- [ ] **Step 1: Crear el módulo**

```typescript
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { parseISO, addMinutes } from "date-fns"
import { consumeOneCredit, returnOneCredit } from "@/lib/payments/credits"
import { SLOT_DURATION_MIN } from "./constants"
import type { Appointment } from "./types"

export interface BookingResult {
  ok: true
  appointmentId: string
}

export interface BookingFailure {
  ok: false
  error: string
}

/**
 * Reserva un slot para el paciente. ATÓMICO en el sentido de saga:
 *  1. Consume 1 crédito (con CAS optimista, lanza si conflicto)
 *  2. Llama a `pick_least_loaded_clinician(slot)` para obtener el clínico
 *  3. Inserta `appointments` (UNIQUE constraint protege double-booking)
 *  4. Si insert falla → devuelve crédito + reporta error
 *
 * Caller (server action) ya validó que el paciente está logueado.
 */
export async function bookAppointment(
  patientId: string,
  slotStartIso: string,
): Promise<BookingResult | BookingFailure> {
  const admin = createAdminClient()

  // 0. Sanity: el slot no puede estar en el pasado
  if (parseISO(slotStartIso).getTime() < Date.now()) {
    return { ok: false, error: "El horario seleccionado ya pasó" }
  }

  // 1. Consume credit (FIFO + CAS)
  let creditId: string
  try {
    const consumed = await consumeOneCredit(patientId)
    creditId = consumed.creditId
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sin créditos"
    return { ok: false, error: msg }
  }

  // 2. Pick clinician (round-robin)
  const { data: cliRow, error: cliErr } = await admin
    .rpc("pick_least_loaded_clinician", { slot_start: slotStartIso })
  if (cliErr) {
    // Devolver crédito y abortar
    await returnOneCredit(creditId).catch(() => undefined)
    return { ok: false, error: `Error asignando clínico: ${cliErr.message}` }
  }
  const clinicianId = cliRow as string | null
  if (!clinicianId) {
    await returnOneCredit(creditId).catch(() => undefined)
    return {
      ok: false,
      error: "Ese horario ya no está disponible. Por favor escoge otro.",
    }
  }

  // 3. Insert appointment
  const endsAt = addMinutes(parseISO(slotStartIso), SLOT_DURATION_MIN).toISOString()
  const { data: apt, error: aptErr } = await admin
    .from("appointments")
    .insert({
      patient_id: patientId,
      clinician_id: clinicianId,
      starts_at: slotStartIso,
      ends_at: endsAt,
      status: "scheduled",
      credit_id: creditId,
    })
    .select("id")
    .single()

  if (aptErr || !apt) {
    // Probablemente colisión por UNIQUE constraint (race con otro paciente)
    await returnOneCredit(creditId).catch(() => undefined)
    return {
      ok: false,
      error: "Ese horario fue tomado por otro paciente justo antes que tú. Elige otro.",
    }
  }

  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: patientId,
    action: "patient_booked_appointment",
    target_type: "appointment",
    target_id: apt.id,
    metadata: { clinician_id: clinicianId, credit_id: creditId, slot: slotStartIso },
  })

  return { ok: true, appointmentId: apt.id }
}

/**
 * Devuelve la próxima cita activa (status='scheduled' y starts_at en el futuro)
 * del paciente, o null si no tiene.
 */
export async function getActiveAppointment(patientId: string): Promise<Appointment | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(`Error reading active appointment: ${error.message}`)
  return (data as Appointment) ?? null
}

/**
 * Lista las citas pasadas (completed / cancelled / no_show) del paciente,
 * ordenadas por starts_at desc.
 */
export async function listPastAppointments(patientId: string): Promise<Appointment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .neq("status", "scheduled")
    .order("starts_at", { ascending: false })
    .limit(20)
  if (error) throw new Error(`Error reading past appointments: ${error.message}`)
  return (data ?? []) as Appointment[]
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/scheduling/booking.ts
git commit -m "feat(scheduling): add atomic booking with round-robin and credit consumption"
```

---

## Task 7 — Server actions para `/admin/clinico/disponibilidad`

**Files:**
- Create: `src/app/(admin)/admin/clinico/disponibilidad/actions.ts`

- [ ] **Step 1: Crear las actions**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { getCurrentProfile } from "@/lib/auth/profile"
import {
  upsertSchedule,
  deleteSchedule,
  createBlock,
  deleteBlock,
  type UpsertScheduleInput,
} from "@/lib/scheduling/schedules"

type Result = { ok: true } | { ok: false; error: string }

/** Solo el clínico dueño (o admin) puede actuar sobre sus horarios. */
function authorizeFor(clinicianId: string, profile: { id: string; role: string } | null): boolean {
  if (!profile) return false
  if (profile.role === "admin") return true
  return profile.role === "clinico" && profile.id === clinicianId
}

export async function saveScheduleEntry(input: {
  id?: string
  clinician_id: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!authorizeFor(input.clinician_id, profile)) return { ok: false, error: "No autorizado" }

  if (!/^\d{2}:\d{2}$/.test(input.start_time) || !/^\d{2}:\d{2}$/.test(input.end_time)) {
    return { ok: false, error: "Formato de hora inválido (debe ser HH:MM)" }
  }
  if (input.start_time >= input.end_time) {
    return { ok: false, error: "La hora de inicio debe ser anterior a la de fin" }
  }
  if (input.weekday < 0 || input.weekday > 6) return { ok: false, error: "Día inválido" }

  try {
    await upsertSchedule(input as UpsertScheduleInput)
    revalidatePath("/admin/clinico/disponibilidad")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error guardando horario" }
  }
}

export async function deleteScheduleEntry(scheduleId: string, clinicianId: string): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!authorizeFor(clinicianId, profile)) return { ok: false, error: "No autorizado" }

  try {
    await deleteSchedule(scheduleId, clinicianId)
    revalidatePath("/admin/clinico/disponibilidad")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error eliminando horario" }
  }
}

export async function createScheduleBlock(input: {
  clinician_id: string
  start_at: string
  end_at: string
  reason: string | null
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!authorizeFor(input.clinician_id, profile)) return { ok: false, error: "No autorizado" }

  try {
    await createBlock(input)
    revalidatePath("/admin/clinico/disponibilidad")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error creando bloqueo" }
  }
}

export async function deleteScheduleBlock(blockId: string, clinicianId: string): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!authorizeFor(clinicianId, profile)) return { ok: false, error: "No autorizado" }

  try {
    await deleteBlock(blockId, clinicianId)
    revalidatePath("/admin/clinico/disponibilidad")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error eliminando bloqueo" }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/admin/clinico/disponibilidad/actions.ts"
git commit -m "feat(scheduling): add server actions for clinician availability"
```

---

## Task 8 — Página `/admin/clinico/disponibilidad`

**Files:**
- Create: `src/app/(admin)/admin/clinico/disponibilidad/page.tsx`

- [ ] **Step 1: Crear el server component**

```tsx
import { redirect } from "next/navigation"
import { getCurrentProfile, isStaff } from "@/lib/auth/profile"
import { getClinicianSchedules, getClinicianBlocks } from "@/lib/scheduling/schedules"
import HorarioBaseEditor from "@/components/admin/HorarioBaseEditor"
import BloqueosManager from "@/components/admin/BloqueosManager"

export const dynamic = "force-dynamic"

export default async function DisponibilidadPage() {
  const profile = await getCurrentProfile()
  if (!isStaff(profile) || profile?.role === "admin" /* admin no tiene horario propio */) {
    redirect("/admin")
  }
  const clinicianId = profile!.id

  const [schedules, blocks] = await Promise.all([
    getClinicianSchedules(clinicianId),
    getClinicianBlocks(clinicianId),
  ])

  return (
    <div className="space-y-10 p-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Mi disponibilidad</h1>
        <p className="text-sm text-tertiary">
          Configura las horas que estás disponible para evaluaciones de salud. Los pacientes podrán reservar slots dentro de estas franjas.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-neutral">Horario base</h2>
          <p className="text-sm text-tertiary">Tus horas regulares de la semana. Los cambios se aplican inmediatamente.</p>
        </div>
        <HorarioBaseEditor clinicianId={clinicianId} initialSchedules={schedules} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-neutral">Bloqueos puntuales</h2>
          <p className="text-sm text-tertiary">
            Vacaciones, congresos, capacitaciones — días u horas específicas en las que NO atiendes. Restan de tu horario base.
          </p>
        </div>
        <BloqueosManager clinicianId={clinicianId} initialBlocks={blocks} />
      </section>
    </div>
  )
}
```

- [ ] **Step 2: NO commitear** — depende de los componentes que vienen en Tasks 9-10.

---

## Task 9 — Componente HorarioBaseEditor

**Files:**
- Create: `src/components/admin/HorarioBaseEditor.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client"

import { useState, useTransition } from "react"
import {
  saveScheduleEntry,
  deleteScheduleEntry,
} from "@/app/(admin)/admin/clinico/disponibilidad/actions"
import type { ScheduleEntry } from "@/lib/scheduling/types"

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
]

interface DraftRow {
  id?: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}

function toDraft(s: ScheduleEntry): DraftRow {
  return {
    id: s.id,
    weekday: s.weekday,
    start_time: s.start_time.slice(0, 5),
    end_time: s.end_time.slice(0, 5),
    is_active: s.is_active,
  }
}

export default function HorarioBaseEditor({
  clinicianId,
  initialSchedules,
}: {
  clinicianId: string
  initialSchedules: ScheduleEntry[]
}) {
  const [rows, setRows] = useState<DraftRow[]>(initialSchedules.map(toDraft))
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null)

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { weekday: 1, start_time: "08:00", end_time: "12:00", is_active: true },
    ])
  }

  function saveRow(index: number) {
    setFeedback(null)
    const row = rows[index]
    startTransition(async () => {
      const res = await saveScheduleEntry({
        ...row,
        clinician_id: clinicianId,
      })
      if (res.ok) {
        setFeedback({ kind: "ok", msg: "Horario guardado" })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  function removeRow(index: number) {
    setFeedback(null)
    const row = rows[index]
    if (!row.id) {
      // Aún no guardado en DB — solo quita de la UI
      setRows((prev) => prev.filter((_, i) => i !== index))
      return
    }
    if (!confirm("¿Eliminar este horario?")) return
    startTransition(async () => {
      const res = await deleteScheduleEntry(row.id!, clinicianId)
      if (res.ok) {
        setRows((prev) => prev.filter((_, i) => i !== index))
        setFeedback({ kind: "ok", msg: "Horario eliminado" })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  return (
    <div className="rounded-xl border border-tertiary/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-background text-tertiary">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Día</th>
            <th className="px-4 py-3 text-left font-medium">Inicio</th>
            <th className="px-4 py-3 text-left font-medium">Fin</th>
            <th className="px-4 py-3 text-left font-medium">Activo</th>
            <th className="px-4 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-tertiary">
                No has configurado ningún horario. Agrega uno para empezar.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? `new-${i}`} className="border-t border-tertiary/10">
                <td className="px-4 py-3">
                  <select
                    value={row.weekday}
                    onChange={(e) => updateRow(i, { weekday: Number(e.target.value) })}
                    className="rounded-lg border border-tertiary/20 px-2 py-1 text-sm"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    className="rounded-lg border border-tertiary/20 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    className="rounded-lg border border-tertiary/20 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) => updateRow(i, { is_active: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => saveRow(i)}
                    disabled={pending}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={pending}
                    className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs font-medium text-tertiary hover:bg-background"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-tertiary/10 px-4 py-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-dashed border-tertiary/30 px-3 py-1.5 text-xs font-medium text-tertiary hover:bg-background"
        >
          + Agregar bloque de horario
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/HorarioBaseEditor.tsx
git commit -m "feat(scheduling): add HorarioBaseEditor for clinician weekly schedule"
```

---

## Task 10 — Componentes BloqueosManager + CrearBloqueoModal

**Files:**
- Create: `src/components/admin/CrearBloqueoModal.tsx`
- Create: `src/components/admin/BloqueosManager.tsx`

- [ ] **Step 1: Crear `CrearBloqueoModal.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { createScheduleBlock } from "@/app/(admin)/admin/clinico/disponibilidad/actions"
import { bogotaToUtcIso } from "@/lib/scheduling/format"

interface Props {
  open: boolean
  onClose: () => void
  clinicianId: string
  onSuccess: () => void
}

export default function CrearBloqueoModal({ open, onClose, clinicianId, onSuccess }: Props) {
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("18:00")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDate("")
    setStartTime("08:00")
    setEndTime("18:00")
    setReason("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) {
      setError("Selecciona una fecha")
      return
    }
    if (startTime >= endTime) {
      setError("La hora de inicio debe ser anterior a la de fin")
      return
    }
    const start_at = bogotaToUtcIso(date, startTime)
    const end_at = bogotaToUtcIso(date, endTime)
    startTransition(async () => {
      const res = await createScheduleBlock({
        clinician_id: clinicianId,
        start_at,
        end_at,
        reason: reason.trim() || null,
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
        <h2 className="text-lg font-semibold text-neutral mb-1">Bloquear tiempo</h2>
        <p className="mb-6 text-sm text-tertiary">
          Las horas dentro del bloqueo no estarán disponibles para reservas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral">Desde</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral">Hasta</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Razón (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Vacaciones, congreso, hora libre"
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
              {pending ? "Creando..." : "Crear bloqueo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear `BloqueosManager.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { deleteScheduleBlock } from "@/app/(admin)/admin/clinico/disponibilidad/actions"
import type { BlockEntry } from "@/lib/scheduling/types"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import CrearBloqueoModal from "./CrearBloqueoModal"

export default function BloqueosManager({
  clinicianId,
  initialBlocks,
}: {
  clinicianId: string
  initialBlocks: BlockEntry[]
}) {
  const [blocks, setBlocks] = useState<BlockEntry[]>(initialBlocks)
  const [showModal, setShowModal] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete(blockId: string) {
    if (!confirm("¿Eliminar este bloqueo?")) return
    setError(null)
    startTransition(async () => {
      const res = await deleteScheduleBlock(blockId, clinicianId)
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      } else {
        setError(res.error)
      }
    })
  }

  // Después de crear un bloqueo, refrescamos vía window.location reload
  // (más simple que mantener estado server-cliente sincronizado)
  function handleCreated() {
    window.location.reload()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Bloquear tiempo
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-tertiary/30 p-8 text-center text-sm text-tertiary">
          No tienes bloqueos activos.
        </div>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-tertiary/10 bg-white px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-neutral">
                  {formatHumanDateTimeBogota(b.start_at)} → {formatHumanDateTimeBogota(b.end_at)}
                </div>
                {b.reason && <div className="text-xs text-tertiary">{b.reason}</div>}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(b.id)}
                className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs font-medium text-tertiary hover:bg-background disabled:opacity-50"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <CrearBloqueoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        clinicianId={clinicianId}
        onSuccess={handleCreated}
      />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit (incluye también la página de Task 8 que aún no commiteamos)**

```bash
git add "src/app/(admin)/admin/clinico/disponibilidad/page.tsx" \
        src/components/admin/CrearBloqueoModal.tsx \
        src/components/admin/BloqueosManager.tsx
git commit -m "feat(scheduling): add /admin/clinico/disponibilidad UI"
```

---

## Task 11 — Agregar "Mi disponibilidad" al nav del clínico

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Agregar entrada al grupo "Clínico" del navGroups**

Buscar el grupo "Clínico":

```tsx
{
  label: "Clínico",
  visibleTo: ["admin", "clinico"],
  items: [
    { href: "/admin/clinico/dashboard", label: "Dashboard clínico", icon: stethoscopeIcon },
    { href: "/admin/pacientes", label: "Pacientes", icon: patientsIcon },
  ],
},
```

Y reemplazar por:

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

(`calendarIcon` ya existe en este archivo desde Plan 1.)

- [ ] **Step 2: Verificar typecheck**

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminShell.tsx
git commit -m "feat(scheduling): link clinician availability page in admin nav"
```

---

## Task 12 — Server actions para `/agendar`

**Files:**
- Create: `src/app/(dashboard)/agendar/actions.ts`

- [ ] **Step 1: Crear las actions**

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile } from "@/lib/auth/profile"
import { bookAppointment } from "@/lib/scheduling/booking"
import type { Plan } from "@/lib/payments/types"
import { PLAN_LABEL } from "@/lib/payments/types"

type Result = { ok: true } | { ok: false; error: string }

/**
 * Cuando el paciente clickea "Solicitar pago" (antes de Wompi), se le
 * envía un mensaje pre-armado a un admin (el de menor id, determinístico)
 * indicando qué plan quiere comprar.
 */
export async function requestManualPaymentMessage(plan: Plan): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "patient") return { ok: false, error: "No autorizado" }

  const admin = createAdminClient()
  const { data: admins } = await admin
    .from("users")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(1)
  const targetAdmin = admins?.[0]
  if (!targetAdmin) return { ok: false, error: "No hay administradores disponibles" }

  const body = `Hola, me gustaría comprar el plan: ${PLAN_LABEL[plan]}. Por favor envíame los datos para hacer la transferencia.`

  const { error } = await admin.from("messages").insert({
    from_user_id: profile.id,
    to_user_id: targetAdmin.id,
    body,
  })
  if (error) return { ok: false, error: `No se pudo enviar el mensaje: ${error.message}` }

  return { ok: true }
}

/**
 * Reserva el slot. Devuelve el id de la cita o un error.
 */
export async function bookSlotAction(slotStartIso: string): Promise<
  | { ok: true; appointmentId: string }
  | { ok: false; error: string }
> {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "patient") return { ok: false, error: "No autorizado" }

  const result = await bookAppointment(profile.id, slotStartIso)
  if (result.ok) {
    revalidatePath("/agendar")
    return { ok: true, appointmentId: result.appointmentId }
  }
  return { ok: false, error: result.error }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(dashboard)/agendar/actions.ts"
git commit -m "feat(scheduling): add patient-facing booking and payment-request actions"
```

---

## Task 13 — Helper de Teams link (gate de 24h)

**Files:**
- Create: `src/lib/scheduling/teamsLink.ts`

- [ ] **Step 1: Crear el módulo**

```typescript
import { parseISO } from "date-fns"
import { getSchedulingConfig } from "@/lib/payments/config"

export interface TeamsLinkInfo {
  /** Si el paciente puede ver/usar el link ahora */
  unlocked: boolean
  /** URL del Teams (vacía si no configurada) */
  url: string
  /** Cuándo se desbloquea (ISO) — útil para mostrar countdown */
  unlocksAtIso: string
}

/**
 * Dado el inicio de una cita, decide si el paciente ya puede ver el link.
 * Regla: 24h antes de starts_at.
 */
export async function getTeamsLinkInfo(appointmentStartsAt: string): Promise<TeamsLinkInfo> {
  const config = await getSchedulingConfig()
  const startMs = parseISO(appointmentStartsAt).getTime()
  const unlocksAt = new Date(startMs - 24 * 60 * 60 * 1000)
  const unlocked = Date.now() >= unlocksAt.getTime()
  return {
    unlocked,
    url: config.teamsMeetingUrl,
    unlocksAtIso: unlocksAt.toISOString(),
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/scheduling/teamsLink.ts
git commit -m "feat(scheduling): add Teams link 24h gate helper"
```

---

## Task 14 — Página `/agendar` (dispatcher)

**Files:**
- Create: `src/app/(dashboard)/agendar/page.tsx`

- [ ] **Step 1: Crear el server component**

```tsx
import { redirect } from "next/navigation"
import { addDays } from "date-fns"
import { getCurrentProfile } from "@/lib/auth/profile"
import { getRemainingCreditsForPatient } from "@/lib/payments/credits"
import { getSchedulingConfig } from "@/lib/payments/config"
import { centsToCop } from "@/lib/payments/format"
import {
  computeAvailableSlots,
} from "@/lib/scheduling/slots"
import {
  getActiveAppointment,
  listPastAppointments,
} from "@/lib/scheduling/booking"
import { NO_AVAILABILITY_LOOKAHEAD_DAYS } from "@/lib/scheduling/constants"
import { getTeamsLinkInfo } from "@/lib/scheduling/teamsLink"
import EstadoSinCreditos from "@/components/dashboard/EstadoSinCreditos"
import SelectorSlot from "@/components/dashboard/SelectorSlot"
import CitaActiva from "@/components/dashboard/CitaActiva"

export const dynamic = "force-dynamic"

export default async function AgendarPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "patient") redirect("/login")

  const [credits, active, config] = await Promise.all([
    getRemainingCreditsForPatient(profile.id),
    getActiveAppointment(profile.id),
    getSchedulingConfig(),
  ])

  // Estado C — tiene cita activa
  if (active) {
    const teamsInfo = await getTeamsLinkInfo(active.starts_at)
    const past = await listPastAppointments(profile.id)
    return (
      <CitaActiva
        appointment={active}
        teamsInfo={teamsInfo}
        creditsRemaining={credits}
        pastAppointments={past}
      />
    )
  }

  // Estado A — sin créditos
  if (credits === 0) {
    return (
      <EstadoSinCreditos
        priceSingleCop={centsToCop(config.priceSingleCop)}
        pricePack3Cop={centsToCop(config.pricePack3Cop)}
      />
    )
  }

  // Estado B — con créditos, sin cita activa → selector
  const now = new Date()
  const rangeEnd = addDays(now, NO_AVAILABILITY_LOOKAHEAD_DAYS)
  const slotsByDay = await computeAvailableSlots(now, rangeEnd, now)

  return (
    <SelectorSlot creditsRemaining={credits} slotsByDay={slotsByDay} />
  )
}
```

- [ ] **Step 2: NO commitear** — depende de los componentes que vienen.

---

## Task 15 — Componente EstadoSinCreditos (Estado A)

**Files:**
- Create: `src/components/dashboard/EstadoSinCreditos.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client"

import { useState, useTransition } from "react"
import { requestManualPaymentMessage } from "@/app/(dashboard)/agendar/actions"
import type { Plan } from "@/lib/payments/types"

interface Props {
  priceSingleCop: number     // pesos enteros
  pricePack3Cop: number
}

export default function EstadoSinCreditos({ priceSingleCop, pricePack3Cop }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null)

  function requestPayment(plan: Plan) {
    setFeedback(null)
    startTransition(async () => {
      const res = await requestManualPaymentMessage(plan)
      if (res.ok) {
        setFeedback({
          kind: "ok",
          msg: "Tu solicitud fue enviada. El administrador te enviará los datos por mensaje pronto.",
        })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Agenda tu evaluación de salud</h1>
        <p className="text-sm text-tertiary">
          Para reservar una cita necesitas comprar al menos una evaluación. Elige el plan que mejor se adapte a ti.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Plan single */}
        <div className="rounded-2xl border border-tertiary/10 bg-white p-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral">1 evaluación de salud</h3>
            <p className="mt-1 text-sm text-tertiary">Una cita con tu clínico asignado.</p>
          </div>
          <div className="text-3xl font-bold text-primary">{fmt(priceSingleCop)}</div>
          <button
            type="button"
            disabled={pending}
            onClick={() => requestPayment("single")}
            className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Enviando solicitud..." : "Solicitar pago"}
          </button>
        </div>

        {/* Plan pack3 — destacado */}
        <div className="rounded-2xl border-2 border-primary bg-white p-6 space-y-4 relative">
          <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">
            30% off
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral">3 evaluaciones de salud</h3>
            <p className="mt-1 text-sm text-tertiary">Inicial, intermedia y final — sigue tu progreso.</p>
          </div>
          <div className="text-3xl font-bold text-primary">{fmt(pricePack3Cop)}</div>
          <p className="text-xs text-tertiary">
            Ahorras {fmt(priceSingleCop * 3 - pricePack3Cop)} vs. comprar individual.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => requestPayment("pack3")}
            className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? "Enviando solicitud..." : "Solicitar pago"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.kind === "ok"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <div className="rounded-xl bg-background p-4 text-xs text-tertiary">
        <strong>¿Cómo funciona el pago?</strong> Por ahora solo aceptamos pago manual por transferencia.
        Cuando hagas click en "Solicitar pago", el administrador recibirá un mensaje y te enviará los datos
        bancarios por la sección de "Mensajes". Una vez confirmado, tendrás los créditos disponibles para agendar.
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/EstadoSinCreditos.tsx
git commit -m "feat(scheduling): add Estado A — EstadoSinCreditos with payment request"
```

---

## Task 16 — Componente SelectorSlot (Estado B)

**Files:**
- Create: `src/components/dashboard/SelectorSlot.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
"use client"

import { useState, useMemo, useTransition } from "react"
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format as fnsFormat } from "date-fns"
import { es } from "date-fns/locale"
import { bookSlotAction } from "@/app/(dashboard)/agendar/actions"
import type { SlotsByDay } from "@/lib/scheduling/types"
import {
  formatHumanDateTimeBogota,
  formatTimeBogota,
  formatMonthBogota,
  utcIsoToBogotaDateKey,
} from "@/lib/scheduling/format"

interface Props {
  creditsRemaining: number
  slotsByDay: SlotsByDay
}

export default function SelectorSlot({ creditsRemaining, slotsByDay }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [confirmSlot, setConfirmSlot] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [bookedId, setBookedId] = useState<string | null>(null)

  // Días del mes actual
  const monthDays = useMemo(() => {
    const start = startOfMonth(monthCursor)
    const end = endOfMonth(monthCursor)
    return eachDayOfInterval({ start, end })
  }, [monthCursor])

  const daysWithSlots = useMemo(() => {
    return new Set(Object.keys(slotsByDay))
  }, [slotsByDay])

  function dayHasSlots(day: Date): boolean {
    const key = utcIsoToBogotaDateKey(day.toISOString())
    return daysWithSlots.has(key)
  }

  function handleConfirm() {
    if (!confirmSlot) return
    setError(null)
    startTransition(async () => {
      const res = await bookSlotAction(confirmSlot)
      if (res.ok) {
        setBookedId(res.appointmentId)
        // Refrescar la página para que aparezca Estado C
        window.location.reload()
      } else {
        setError(res.error)
        setConfirmSlot(null)
      }
    })
  }

  if (Object.keys(slotsByDay).length === 0) {
    return (
      <div className="space-y-6 max-w-3xl">
        <header>
          <h1 className="text-2xl font-semibold text-neutral mb-1">Agenda tu evaluación de salud</h1>
          <p className="text-sm text-tertiary">Tienes {creditsRemaining} evaluación{creditsRemaining === 1 ? "" : "es"} disponible{creditsRemaining === 1 ? "" : "s"}.</p>
        </header>
        <div className="rounded-xl border border-dashed border-tertiary/30 p-12 text-center">
          <p className="text-lg font-medium text-neutral">Por ahora no hay disponibilidad</p>
          <p className="mt-2 text-sm text-tertiary">Vuelve a revisar pronto. Estamos abriendo más horarios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Agenda tu evaluación de salud</h1>
        <p className="text-sm text-tertiary">
          Tienes <strong className="text-neutral">{creditsRemaining}</strong> evaluación
          {creditsRemaining === 1 ? "" : "es"} disponible{creditsRemaining === 1 ? "" : "s"}.
          Elige el día y la hora que mejor te funcione.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Calendario */}
        <div className="rounded-2xl border border-tertiary/10 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setMonthCursor((m) => addMonths(m, -1))}
              className="rounded-lg px-3 py-1 text-sm hover:bg-background"
            >
              ← Mes anterior
            </button>
            <h2 className="text-lg font-medium text-neutral capitalize">
              {formatMonthBogota(monthCursor.toISOString())}
            </h2>
            <button
              type="button"
              onClick={() => setMonthCursor((m) => addMonths(m, 1))}
              className="rounded-lg px-3 py-1 text-sm hover:bg-background"
            >
              Mes siguiente →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-tertiary mb-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-1 font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Padding inicial: cuántos días desde el lunes hasta el día 1 */}
            {Array.from({ length: ((getDay(monthDays[0]) + 6) % 7) }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {monthDays.map((day) => {
              const key = utcIsoToBogotaDateKey(day.toISOString())
              const hasSlots = daysWithSlots.has(key)
              const isSelected = selectedDay === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!hasSlots}
                  onClick={() => setSelectedDay(key)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-white"
                      : hasSlots
                      ? "bg-primary/5 text-primary hover:bg-primary/10"
                      : "text-tertiary/40 cursor-not-allowed"
                  }`}
                >
                  {fnsFormat(day, "d")}
                  {hasSlots && !isSelected && (
                    <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel de slots */}
        <div className="rounded-2xl border border-tertiary/10 bg-white p-6">
          {!selectedDay ? (
            <div className="py-8 text-center text-sm text-tertiary">
              Selecciona un día con disponibilidad para ver los horarios.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-neutral capitalize">
                {fnsFormat(new Date(selectedDay + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
              </div>
              <div className="space-y-1.5">
                {(slotsByDay[selectedDay] ?? []).map((slot) => (
                  <button
                    key={slot.starts_at}
                    type="button"
                    onClick={() => setConfirmSlot(slot.starts_at)}
                    className="w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm font-medium text-neutral hover:bg-primary hover:border-primary hover:text-white transition-colors"
                  >
                    {formatTimeBogota(slot.starts_at)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmSlot && !bookedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral mb-2">Confirmar tu evaluación</h2>
            <p className="text-sm text-tertiary mb-4">
              <strong className="text-neutral capitalize">{formatHumanDateTimeBogota(confirmSlot)}</strong>
            </p>
            <p className="text-sm text-tertiary mb-6">
              Tu evaluación será online por Microsoft Teams. Recibirás el link 24 horas antes de tu cita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSlot(null)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {pending ? "Reservando..." : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/SelectorSlot.tsx
git commit -m "feat(scheduling): add Estado B — SelectorSlot calendar picker"
```

---

## Task 17 — Componente CitaActiva (Estado C)

**Files:**
- Create: `src/components/dashboard/EvaluacionesPasadas.tsx`
- Create: `src/components/dashboard/CitaActiva.tsx`

- [ ] **Step 1: Crear `EvaluacionesPasadas.tsx`**

```tsx
import type { Appointment } from "@/lib/scheduling/types"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"

const STATUS_LABEL: Record<Appointment["status"], { text: string; className: string }> = {
  scheduled: { text: "Programada", className: "bg-primary/10 text-primary" },
  completed: { text: "Completada", className: "bg-green-100 text-green-800" },
  cancelled: { text: "Cancelada", className: "bg-tertiary/10 text-tertiary" },
  no_show: { text: "No asistió", className: "bg-amber-100 text-amber-800" },
}

export default function EvaluacionesPasadas({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-tertiary/20 p-6 text-center text-sm text-tertiary">
        Aún no tienes evaluaciones pasadas.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {appointments.map((a) => {
        const status = STATUS_LABEL[a.status]
        return (
          <li key={a.id} className="flex items-center justify-between rounded-xl border border-tertiary/10 bg-white px-4 py-3">
            <div>
              <div className="text-sm font-medium text-neutral capitalize">
                {formatHumanDateTimeBogota(a.starts_at)}
              </div>
              {a.cancellation_reason && (
                <div className="text-xs text-tertiary">{a.cancellation_reason}</div>
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
              {status.text}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Crear `CitaActiva.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Appointment } from "@/lib/scheduling/types"
import type { TeamsLinkInfo } from "@/lib/scheduling/teamsLink"
import { formatHumanDateTimeBogota, msUntil } from "@/lib/scheduling/format"
import EvaluacionesPasadas from "./EvaluacionesPasadas"

interface Props {
  appointment: Appointment
  teamsInfo: TeamsLinkInfo
  creditsRemaining: number
  pastAppointments: Appointment[]
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "ahora"
  const totalMin = Math.floor(ms / (60 * 1000))
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin % (60 * 24)) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `en ${days}d ${hours}h`
  if (hours > 0) return `en ${hours}h ${minutes}m`
  return `en ${minutes} min`
}

export default function CitaActiva({ appointment, teamsInfo, creditsRemaining, pastAppointments }: Props) {
  const [countdown, setCountdown] = useState(formatCountdown(msUntil(appointment.starts_at)))
  const [unlocked, setUnlocked] = useState(teamsInfo.unlocked)

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(formatCountdown(msUntil(appointment.starts_at)))
      // Re-evaluar unlock cada minuto
      setUnlocked(Date.now() >= new Date(teamsInfo.unlocksAtIso).getTime())
    }, 60_000)
    return () => clearInterval(id)
  }, [appointment.starts_at, teamsInfo.unlocksAtIso])

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Tu evaluación de salud</h1>
        <p className="text-sm text-tertiary">Detalles y link de la videollamada.</p>
      </header>

      {/* Card principal de la cita */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-primary">Próxima evaluación</div>
          <div className="mt-1 text-xl font-semibold text-neutral capitalize">
            {formatHumanDateTimeBogota(appointment.starts_at)}
          </div>
          <div className="mt-1 text-sm text-tertiary">{countdown}</div>
        </div>

        {unlocked && teamsInfo.url ? (
          <a
            href={teamsInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-primary/90"
          >
            Unirme por Teams
          </a>
        ) : (
          <div className="rounded-lg bg-background px-4 py-3 text-center text-sm text-tertiary">
            El link de Teams se habilitará 24 horas antes de tu cita.
          </div>
        )}

        <p className="text-xs text-tertiary">
          ¿Necesitas reagendar o cancelar?{" "}
          <Link href="/mensajes" className="underline hover:text-primary">
            Envía un mensaje al administrador
          </Link>
          .
        </p>
      </div>

      {/* Créditos restantes */}
      {creditsRemaining > 0 && (
        <div className="rounded-xl border border-tertiary/10 bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral">
              Te queda{creditsRemaining === 1 ? "" : "n"}{" "}
              <strong>{creditsRemaining}</strong> evaluación
              {creditsRemaining === 1 ? "" : "es"} más.
            </div>
            <div className="text-xs text-tertiary">Puedes agendar la siguiente cuando quieras.</div>
          </div>
          {/* No se puede agendar otra mientras haya una activa según el flujo del spec.
              El botón vuelve a /agendar pero el server le mostrará Estado C otra vez.
              Cuando complete o cancele esta cita, podrá agendar la próxima. */}
        </div>
      )}

      {/* Histórico */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-neutral">Evaluaciones pasadas</h2>
        <EvaluacionesPasadas appointments={pastAppointments} />
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit todos los componentes del paciente que faltaban + la página**

```bash
git add "src/app/(dashboard)/agendar/page.tsx" \
        src/components/dashboard/EvaluacionesPasadas.tsx \
        src/components/dashboard/CitaActiva.tsx
git commit -m "feat(scheduling): add /agendar page with Estado C (CitaActiva) and history"
```

---

## Task 18 — Agregar "Agendar evaluación" al sidebar del paciente

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`

El archivo `DashboardShell.tsx` tiene dos arrays separados al inicio: `evaluacionItems` (currently solo "Mi Evaluación" → /mi-historia-clinica) y `escuelaItems`. Agregamos "Agendar evaluación" al inicio de `evaluacionItems` porque conceptualmente va antes de ver los resultados.

- [ ] **Step 1: Modificar `evaluacionItems`**

Buscar este bloque exacto (líneas ~12-22 del archivo):

```tsx
const evaluacionItems = [
  {
    href: "/mi-historia-clinica",
    label: "Mi Evaluación",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]
```

Reemplazar por:

```tsx
const evaluacionItems = [
  {
    href: "/agendar",
    label: "Agendar evaluación",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/mi-historia-clinica",
    label: "Mi Evaluación",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx
git commit -m "feat(scheduling): add 'Agendar evaluación' to patient sidebar"
```

---

## Task 19 — Verificación end-to-end manual

**Files:** ninguno

Asume que en Plan 1 ya quedó un paciente con créditos. Si no, primero crea uno desde admin.

- [ ] **Step 1: Levantar dev server**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev
```

- [ ] **Step 2: Configurar disponibilidad como clínico**

Login como **clínico**. Ir a "Mi disponibilidad" en el sidebar.
- Agregar 3 horarios: lun-mier-vie, 8:00-12:00 cada uno. Click "Guardar" en cada fila.
- Verificar que se persisten al recargar la página.

Login como un segundo clínico (si tienes uno). Repetir con otro horario distinto (ej. mar-jue 14:00-18:00). Si solo tienes un clínico activo, salta este paso.

- [ ] **Step 3: Crear un bloqueo puntual**

Como clínico, en sección "Bloqueos puntuales": click "+ Bloquear tiempo".
- Fecha: la próxima semana, lunes.
- Desde: 09:00. Hasta: 11:00.
- Razón: "Test de bloqueo".
- Click crear. Aparece en la lista.

- [ ] **Step 4: Verificar disponibilidad como paciente**

Logout. Login como **paciente con créditos** (creado en Plan 1).
- Ir a "Agendar evaluación" en el sidebar.
- Estado B: ver el calendario con los días Lun-Mier-Vie marcados con dot.
- Click en el lunes próximo: ver slots de 8:00, 8:40 (los de 9:20, 10:00, 10:40 deben estar AUSENTES por el bloqueo de 9-11). Verifica que los slots posteriores a 11:00 sí aparecen.
- Click en otro día sin bloqueo: 6 slots normales (8:00, 8:40, 9:20, 10:00, 10:40, 11:20).
- **Verifica que NO aparece nombre de clínico en ninguna parte del UI.**

- [ ] **Step 5: Reservar un slot**

- Click en el slot 8:00 del miércoles próximo.
- Modal: confirma la fecha/hora. Click "Confirmar reserva".
- Página se recarga → ahora estás en Estado C: card grande "Próxima evaluación · miércoles X mayo · en Yd Zh", botón "Unirme por Teams" deshabilitado con texto "se habilitará 24h antes".
- Sección "Te quedan N evaluaciones más" si tenías más de 1 crédito.
- Sección "Evaluaciones pasadas" — vacía por ahora.

- [ ] **Step 6: Verificar en Supabase**

```sql
select id, patient_id, clinician_id, starts_at, status, credit_id
from public.appointments
order by created_at desc limit 3;

select sum(remaining) as credits_remaining
from public.evaluation_credits where patient_id = '<patient_uuid>';

select action, target_type, metadata
from public.audit_log where action = 'patient_booked_appointment'
order by created_at desc limit 1;
```

Expected: cita con `status='scheduled'`, créditos decrementados en 1, audit_log con la metadata correcta (clinician_id presente — admin puede ver, paciente no en su UI).

- [ ] **Step 7: Probar el caso "ese horario fue tomado"**

Manualmente, en SQL Editor de Supabase, marca el slot que el paciente reservó como ya tomado por otro clínico:
```sql
-- (no es necesario forzar este test si confías en el UNIQUE constraint)
```
Saltable.

- [ ] **Step 8: Probar Estado A (sin créditos)**

Si tienes otro paciente sin créditos, login con él. Ir a "Agendar evaluación".
- Ver Estado A: dos cards de planes, botones "Solicitar pago".
- Click "Solicitar pago" en single. Ver mensaje de éxito.
- Verificar en SQL:
```sql
select from_user_id, to_user_id, body, sent_at
from public.messages order by sent_at desc limit 1;
```
Mensaje insertado con `from_user_id=patient` y `to_user_id=admin`, body con el plan.

- [ ] **Step 9: Probar Estado D (sin slots)**

Borra todos los `clinician_schedules` (login como clínico → eliminar todos los horarios). Vuelve al paciente y agendar.
- Ver Estado B vacío: "Por ahora no hay disponibilidad. Vuelve a revisar pronto."
- Restaura los horarios después.

- [ ] **Step 10: Probar el conflicto al crear bloqueo con cita existente**

Login como clínico. Intenta crear un bloqueo que cubre el slot que el paciente reservó (ej. el miércoles próximo de 8:00 a 9:00).
- Debe fallar con: "Hay 1 cita(s) programada(s) dentro de este rango. Pide al admin reasignarlas o cancelarlas antes de crear el bloqueo."

- [ ] **Step 11: Detener dev server**

Ctrl-C.

- [ ] **Step 12: Verificación de typecheck + tests final**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && \
npx tsc --noEmit && \
npm test
```

Expected: tsc clean, 20 tests passing.

---

## Self-Review (post-execución)

Antes de mergear a main:

- [ ] Spec sección "Disponibilidad y reservas" — todas las reglas en lugar (30 min, 10 buffer, 24h notice, sin límite ventana, round-robin, blind assignment, double-booking imposible).
- [ ] Spec sección "Estado A/B/C del paciente" — los 3 estados implementados.
- [ ] Spec sección "Disponibilidad del clínico" — horario base + bloqueos, validación de citas en conflicto.
- [ ] El paciente NO ve el nombre del clínico en ningún componente.
- [ ] El link Teams se desbloquea exactamente 24h antes.
- [ ] Audit log captura el booking del paciente.

---

## Resumen de lo que entrega Plan 2

✅ Vitest + 20 unit tests (8 format + 12 slots).
✅ Cómputo de slots al vuelo, con buffer, bloqueos, citas existentes, anticipación mínima.
✅ Función round-robin del Plan 1 conectada al booking.
✅ Booking atómico con consumo FIFO de crédito + UNIQUE constraint anti doble-booking.
✅ Página `/admin/clinico/disponibilidad` con horario base editable + bloqueos.
✅ Página `/agendar` para paciente con Estados A (sin créditos), B (selector), C (cita activa), D (sin disponibilidad).
✅ Validación al crear bloqueo si hay citas en conflicto.
✅ Link Teams gated a 24h antes.
✅ Mensaje del paciente al admin para "Solicitar pago" (cuando no tiene créditos y aún no hay Wompi).

❌ Calendarios de admin/clínico (vista global con bloques de citas) — Plan 3.
❌ Notificaciones por email + recordatorios — Plan 4.
❌ Re-asignación automática al desactivar clínico + alertas en dashboard admin — Plan 5.
❌ Wompi integration — Plan 6.

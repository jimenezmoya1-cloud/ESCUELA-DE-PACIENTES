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

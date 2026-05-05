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

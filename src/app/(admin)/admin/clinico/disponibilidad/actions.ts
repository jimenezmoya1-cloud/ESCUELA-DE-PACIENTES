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

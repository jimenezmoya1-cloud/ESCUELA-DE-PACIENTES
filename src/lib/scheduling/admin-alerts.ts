import { createAdminClient } from "@/lib/supabase/admin"
import { addDays } from "date-fns"
import { computeAvailableSlots } from "./slots"

export interface AdminAlerts {
  orphanedCount: number
  patientsWithCreditsAndNoSlots: number
}

/**
 * Genera el resumen de alertas para el dashboard admin.
 * - Citas huérfanas: status='scheduled' y clínico inactivo.
 * - Pacientes con créditos pero sin slots: paciente con remaining>0,
 *   sin appointment activo, Y el sistema no tiene slots disponibles
 *   en los próximos 30 días (chequeo simple — si no hay slots GLOBAL,
 *   todos los pacientes con créditos están bloqueados).
 */
export async function getAdminAlerts(): Promise<AdminAlerts> {
  const admin = createAdminClient()

  // 1. Citas huérfanas — clínico inactivo y status scheduled
  const { data: orphaned } = await admin
    .from("appointments")
    .select("id, users!clinician_id(is_active)")
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())

  const orphanedCount = (orphaned ?? []).filter((row: any) => row.users?.is_active === false).length

  // 2. Pacientes con créditos sin disponibilidad — chequeo aproximado:
  //    Si computeAvailableSlots devuelve vacío en los próximos 30d,
  //    entonces TODOS los pacientes con créditos están bloqueados.
  let patientsWithCreditsAndNoSlots = 0
  const now = new Date()
  const slotsByDay = await computeAvailableSlots(now, addDays(now, 30), now)
  const hasAnySlot = Object.keys(slotsByDay).length > 0

  if (!hasAnySlot) {
    // Contar pacientes con créditos > 0 y SIN cita activa
    const { data: creditsData } = await admin
      .from("evaluation_credits")
      .select("patient_id, remaining")
      .gt("remaining", 0)
    const patientsWithCredits = new Set((creditsData ?? []).map((r: any) => r.patient_id))

    const { data: activeApts } = await admin
      .from("appointments")
      .select("patient_id")
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
    const patientsWithActive = new Set((activeApts ?? []).map((r: any) => r.patient_id))

    patientsWithCreditsAndNoSlots = [...patientsWithCredits].filter((p) => !patientsWithActive.has(p)).length
  }

  return { orphanedCount, patientsWithCreditsAndNoSlots }
}

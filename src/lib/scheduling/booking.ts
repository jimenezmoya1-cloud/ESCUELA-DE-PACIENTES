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

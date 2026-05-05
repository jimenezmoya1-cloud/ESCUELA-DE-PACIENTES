import { createAdminClient } from "@/lib/supabase/admin"
import { notifyBookingCreated } from "@/lib/notifications/triggers"

interface ReassignmentEvent {
  appointment_id: string
  new_clinician_id: string
  patient_id: string
  starts_at: string
}

interface OrphanEvent {
  appointment_id: string
  starts_at: string
}

export interface DeactivationOutcome {
  reassignedCount: number
  orphanedCount: number
}

/**
 * Lee los audit_log entries generados por el trigger handle_clinician_deactivation
 * para un clínico desactivado en los últimos 60 segundos, y dispara notificaciones
 * a los clínicos nuevos asignados.
 *
 * No lanza errores: si una notificación falla, loggea y continúa.
 */
export async function notifyAfterDeactivation(deactivatedClinicianId: string): Promise<DeactivationOutcome> {
  const admin = createAdminClient()

  // Buscar audit entries muy recientes (últimos 60s) generados por el trigger para este clínico
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString()

  const { data: entries } = await admin
    .from("audit_log")
    .select("action, target_id, metadata, created_at")
    .in("action", ["clinician_auto_reassigned", "clinician_orphaned_appointment"])
    .eq("target_type", "appointment")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })

  const reassigned: ReassignmentEvent[] = []
  const orphaned: OrphanEvent[] = []

  for (const e of entries ?? []) {
    const meta = e.metadata as any
    if (meta?.old_clinician_id !== deactivatedClinicianId) continue

    if (e.action === "clinician_auto_reassigned" && meta?.new_clinician_id) {
      // Necesitamos el patient_id; lo leemos de appointments
      const { data: apt } = await admin
        .from("appointments")
        .select("patient_id")
        .eq("id", e.target_id)
        .maybeSingle()
      if (apt) {
        reassigned.push({
          appointment_id: e.target_id,
          new_clinician_id: meta.new_clinician_id,
          patient_id: apt.patient_id,
          starts_at: meta.starts_at,
        })
      }
    } else if (e.action === "clinician_orphaned_appointment") {
      orphaned.push({
        appointment_id: e.target_id,
        starts_at: meta.starts_at,
      })
    }
  }

  // Notificar al nuevo clínico (mensaje + email) por cada reasignación.
  // Reutilizamos notifyBookingCreated — desde el punto de vista del nuevo clínico,
  // es esencialmente "te asignaron una cita nueva".
  for (const r of reassigned) {
    try {
      await notifyBookingCreated({
        patientId: r.patient_id,
        clinicianId: r.new_clinician_id,
        startsAtIso: r.starts_at,
      })
    } catch (e) {
      console.error("[post-deactivation] notify failed:", e, { appointment: r.appointment_id })
    }
  }

  return {
    reassignedCount: reassigned.length,
    orphanedCount: orphaned.length,
  }
}

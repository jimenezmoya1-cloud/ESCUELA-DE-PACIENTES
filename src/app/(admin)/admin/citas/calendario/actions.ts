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

  // 5. Notificación (best-effort)
  try {
    const { data: aptFull } = await admin
      .from("appointments")
      .select("patient_id, starts_at")
      .eq("id", input.appointmentId)
      .single()
    if (aptFull) {
      const { notifyAppointmentCancelled } = await import("@/lib/notifications/triggers")
      await notifyAppointmentCancelled({
        patientId: aptFull.patient_id,
        startsAtIso: aptFull.starts_at,
        reason: input.reason.trim(),
        creditReturned: input.returnCredit,
      })
    }
  } catch (e) {
    console.error("[cancel_appointment] notification failed:", e)
  }

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
      reminder_24h_sent_at: null,
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

export async function createManualAppointmentAction(input: {
  patientId: string
  clinicianId: string
  startsAtIso: string
  consumeCredit: boolean
  note: string
}): Promise<{ ok: true; appointmentId: string } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.patientId || !input.clinicianId) return { ok: false, error: "Paciente y clínico son requeridos" }
  if (parseISO(input.startsAtIso).getTime() < Date.now()) {
    return { ok: false, error: "La fecha/hora no puede estar en el pasado" }
  }

  const admin = createAdminClient()

  // 1. Validar paciente
  const { data: patient, error: pErr } = await admin
    .from("users").select("id, role").eq("id", input.patientId).single()
  if (pErr || !patient) return { ok: false, error: "Paciente no encontrado" }
  if (patient.role !== "patient") return { ok: false, error: "El usuario no es un paciente" }

  // 2. Validar clínico activo
  const { data: clinician, error: cErr } = await admin
    .from("users").select("id, role, is_active").eq("id", input.clinicianId).single()
  if (cErr || !clinician) return { ok: false, error: "Clínico no encontrado" }
  if (clinician.role !== "clinico") return { ok: false, error: "El usuario no es un clínico" }
  if (!clinician.is_active) return { ok: false, error: "El clínico está inactivo" }

  // 3. Consumir crédito si aplica
  let creditId: string | null = null
  if (input.consumeCredit) {
    try {
      const { consumeOneCredit } = await import("@/lib/payments/credits")
      const res = await consumeOneCredit(input.patientId)
      creditId = res.creditId
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error consumiendo crédito" }
    }
  }

  // 4. Insert appointment
  const endsAt = addMinutes(parseISO(input.startsAtIso), SLOT_DURATION_MIN).toISOString()
  const { data: apt, error: aptErr } = await admin
    .from("appointments")
    .insert({
      patient_id: input.patientId,
      clinician_id: input.clinicianId,
      starts_at: input.startsAtIso,
      ends_at: endsAt,
      status: "scheduled",
      credit_id: creditId,
    })
    .select("id")
    .single()

  if (aptErr || !apt) {
    // Compensar: si consumimos crédito, devolverlo
    if (creditId) {
      try {
        const { returnOneCredit } = await import("@/lib/payments/credits")
        await returnOneCredit(creditId)
      } catch {}
    }
    return {
      ok: false,
      error: "Ese horario ya está tomado por otra cita del mismo clínico (UNIQUE constraint).",
    }
  }

  // 5. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_create_manual_appointment",
    target_type: "appointment",
    target_id: apt.id,
    metadata: {
      patient_id: input.patientId,
      clinician_id: input.clinicianId,
      starts_at: input.startsAtIso,
      consume_credit: input.consumeCredit,
      credit_id: creditId,
      note: input.note,
    },
  })

  // 6. Notificar (best-effort)
  try {
    const { notifyBookingCreated } = await import("@/lib/notifications/triggers")
    await notifyBookingCreated({
      patientId: input.patientId,
      clinicianId: input.clinicianId,
      startsAtIso: input.startsAtIso,
    })
  } catch (e) {
    console.error("[admin_create_manual_appointment] notification failed:", e)
  }

  revalidatePath("/admin/citas")
  return { ok: true, appointmentId: apt.id }
}

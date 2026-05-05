import { createAdminClient } from "@/lib/supabase/admin"
import { sendSystemMessage } from "./in-platform"
import { sendEmail } from "./email"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import { formatCop } from "@/lib/payments/format"
import { PLAN_LABEL } from "@/lib/payments/types"
import type { Plan } from "@/lib/payments/types"

import ManualPaymentApprovedEmail from "./templates/ManualPaymentApprovedEmail"
import AppointmentBookedPatientEmail from "./templates/AppointmentBookedPatientEmail"
import AppointmentBookedClinicianEmail from "./templates/AppointmentBookedClinicianEmail"
import AppointmentCancelledPatientEmail from "./templates/AppointmentCancelledPatientEmail"
import Reminder24hPatientEmail from "./templates/Reminder24hPatientEmail"
import Reminder1hPatientEmail from "./templates/Reminder1hPatientEmail"
import Reminder1hClinicianEmail from "./templates/Reminder1hClinicianEmail"

function appUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

async function getUserContact(userId: string): Promise<{ name: string; email: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin.from("users").select("name, email").eq("id", userId).maybeSingle()
  if (!data) return null
  return { name: data.name, email: data.email }
}

/* ============================================================
 * Eventos
 * ============================================================ */

export async function notifyManualPaymentApproved(args: {
  patientId: string
  plan: Plan
  amountCop: number       // centavos
}): Promise<void> {
  const patient = await getUserContact(args.patientId)
  if (!patient) return

  const planLabel = PLAN_LABEL[args.plan]
  const amountFormatted = formatCop(args.amountCop)
  const body = `Tu pago de ${amountFormatted} por el plan "${planLabel}" fue confirmado. Ya tienes créditos disponibles para agendar tu evaluación de salud.`

  await sendSystemMessage({
    toUserId: args.patientId,
    body,
    kind: "manual_payment_approved",
  })

  await sendEmail({
    to: patient.email,
    subject: "Tu pago fue confirmado",
    template: "manual_payment_approved",
    body: ManualPaymentApprovedEmail({
      patientName: patient.name,
      planLabel,
      amountFormatted,
      appUrl: `${appUrl()}/agendar`,
    }),
    recipientId: args.patientId,
  })
}

export async function notifyBookingCreated(args: {
  patientId: string
  clinicianId: string
  startsAtIso: string
}): Promise<void> {
  const [patient, clinician] = await Promise.all([
    getUserContact(args.patientId),
    getUserContact(args.clinicianId),
  ])

  const dt = formatHumanDateTimeBogota(args.startsAtIso)

  // Paciente
  if (patient) {
    await sendSystemMessage({
      toUserId: args.patientId,
      body: `Tu evaluación de salud está agendada para ${dt}. Recibirás el link de Teams 24 horas antes.`,
      kind: "appointment_booked_patient",
    })
    await sendEmail({
      to: patient.email,
      subject: "Tu evaluación está agendada",
      template: "appointment_booked_patient",
      body: AppointmentBookedPatientEmail({
        patientName: patient.name,
        appointmentDateTime: dt,
      }),
      recipientId: args.patientId,
    })
  }

  // Clínico
  if (clinician && patient) {
    await sendSystemMessage({
      toUserId: args.clinicianId,
      body: `Te asignaron una nueva evaluación: ${patient.name} (${patient.email}) el ${dt}.`,
      kind: "appointment_booked_clinician",
    })
    await sendEmail({
      to: clinician.email,
      subject: "Nueva cita asignada",
      template: "appointment_booked_clinician",
      body: AppointmentBookedClinicianEmail({
        clinicianName: clinician.name,
        patientName: patient.name,
        patientEmail: patient.email,
        appointmentDateTime: dt,
      }),
      recipientId: args.clinicianId,
    })
  }
}

export async function notifyAppointmentCancelled(args: {
  patientId: string
  startsAtIso: string
  reason: string
  creditReturned: boolean
}): Promise<void> {
  const patient = await getUserContact(args.patientId)
  if (!patient) return

  const dt = formatHumanDateTimeBogota(args.startsAtIso)
  const body = `Tu cita del ${dt} fue cancelada. Razón: ${args.reason}. ${args.creditReturned ? "Tu crédito fue devuelto." : "El crédito NO fue devuelto."}`

  await sendSystemMessage({
    toUserId: args.patientId,
    body,
    kind: "appointment_cancelled_patient",
  })

  await sendEmail({
    to: patient.email,
    subject: "Tu evaluación fue cancelada",
    template: "appointment_cancelled_patient",
    body: AppointmentCancelledPatientEmail({
      patientName: patient.name,
      appointmentDateTime: dt,
      reason: args.reason,
      creditReturned: args.creditReturned,
    }),
    recipientId: args.patientId,
  })
}

export async function notifyReminder24h(args: {
  patientId: string
  startsAtIso: string
  teamsUrl: string
}): Promise<void> {
  const patient = await getUserContact(args.patientId)
  if (!patient) return

  const dt = formatHumanDateTimeBogota(args.startsAtIso)
  await sendSystemMessage({
    toUserId: args.patientId,
    body: `Recordatorio: tu evaluación es mañana ${dt}. El link de Teams ya está activo en tu cuenta.`,
    kind: "reminder_24h_patient",
  })
  await sendEmail({
    to: patient.email,
    subject: "Tu evaluación es mañana",
    template: "reminder_24h_patient",
    body: Reminder24hPatientEmail({
      patientName: patient.name,
      appointmentDateTime: dt,
      teamsUrl: args.teamsUrl,
    }),
    recipientId: args.patientId,
  })
}

export async function notifyReminder1h(args: {
  patientId: string
  clinicianId: string
  startsAtIso: string
  teamsUrl: string
}): Promise<void> {
  const [patient, clinician] = await Promise.all([
    getUserContact(args.patientId),
    getUserContact(args.clinicianId),
  ])

  const dt = formatHumanDateTimeBogota(args.startsAtIso)

  if (patient) {
    await sendSystemMessage({
      toUserId: args.patientId,
      body: `Tu evaluación empieza en una hora (${dt}). Únete por Teams cuando estés listo/a.`,
      kind: "reminder_1h_patient",
    })
    await sendEmail({
      to: patient.email,
      subject: "Tu evaluación empieza en una hora",
      template: "reminder_1h_patient",
      body: Reminder1hPatientEmail({
        patientName: patient.name,
        appointmentDateTime: dt,
        teamsUrl: args.teamsUrl,
      }),
      recipientId: args.patientId,
    })
  }

  if (clinician && patient) {
    await sendSystemMessage({
      toUserId: args.clinicianId,
      body: `Tu próxima cita con ${patient.name} es en una hora (${dt}).`,
      kind: "reminder_1h_clinician",
    })
    await sendEmail({
      to: clinician.email,
      subject: "Tu próxima cita en una hora",
      template: "reminder_1h_clinician",
      body: Reminder1hClinicianEmail({
        clinicianName: clinician.name,
        patientName: patient.name,
        appointmentDateTime: dt,
      }),
      recipientId: args.clinicianId,
    })
  }
}

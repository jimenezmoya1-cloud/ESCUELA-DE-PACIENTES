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

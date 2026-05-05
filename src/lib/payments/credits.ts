import { createAdminClient } from "@/lib/supabase/admin"
import type { EvaluationCredit, Plan, PaymentSource } from "./types"
import { PLAN_AMOUNT_OF_CREDITS } from "./types"

/** Total de créditos restantes del paciente (suma de remaining en filas activas). */
export async function getRemainingCreditsForPatient(patientId: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("evaluation_credits")
    .select("remaining")
    .eq("patient_id", patientId)
    .gt("remaining", 0)

  if (error) throw new Error(`No se pudieron leer créditos: ${error.message}`)
  return (data ?? []).reduce((sum, row) => sum + row.remaining, 0)
}

/** Lista todos los créditos del paciente (incluye agotados, ordenados por más reciente). */
export async function listCreditsForPatient(patientId: string): Promise<EvaluationCredit[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("evaluation_credits")
    .select("*")
    .eq("patient_id", patientId)
    .order("purchased_at", { ascending: false })

  if (error) throw new Error(`No se pudieron leer créditos: ${error.message}`)
  return (data ?? []) as EvaluationCredit[]
}

/**
 * Crea una fila de evaluation_credits a partir de un pago aprobado.
 * El caller debe haber validado el pago. Retorna el id del crédito creado.
 */
export async function createCreditFromPayment(args: {
  patientId: string
  paymentId: string
  plan: Plan
  source: PaymentSource
  notes?: string | null
}): Promise<string> {
  const admin = createAdminClient()
  const amount = PLAN_AMOUNT_OF_CREDITS[args.plan]
  const { data, error } = await admin
    .from("evaluation_credits")
    .insert({
      patient_id: args.patientId,
      payment_id: args.paymentId,
      source: args.source,
      amount,
      remaining: amount,
      notes: args.notes ?? null,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(`No se pudo crear el crédito: ${error?.message ?? "sin datos"}`)
  return data.id
}

/**
 * Consume 1 crédito del paciente (FIFO — el más antiguo con remaining > 0).
 * Retorna { creditId, remaining } después del consumo. Lanza error si no hay créditos.
 * NOTA: este helper se usa al crear una cita. En Plan 2 se llama desde la server action de booking.
 */
export async function consumeOneCredit(patientId: string): Promise<{ creditId: string; remaining: number }> {
  const admin = createAdminClient()
  // Buscar el crédito FIFO con remaining > 0
  const { data: candidate, error: selErr } = await admin
    .from("evaluation_credits")
    .select("id, remaining")
    .eq("patient_id", patientId)
    .gt("remaining", 0)
    .order("purchased_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selErr) throw new Error(`Error leyendo créditos: ${selErr.message}`)
  if (!candidate) throw new Error("Sin créditos disponibles")

  const newRemaining = candidate.remaining - 1
  const { data: updated, error: updErr } = await admin
    .from("evaluation_credits")
    .update({ remaining: newRemaining })
    .eq("id", candidate.id)
    .eq("remaining", candidate.remaining)            // optimistic concurrency
    .select("id")
  if (updErr) throw new Error(`Error consumiendo crédito: ${updErr.message}`)
  if (!updated || updated.length === 0) {
    throw new Error("Conflicto de concurrencia: el crédito fue modificado por otra operación, intenta de nuevo")
  }
  return { creditId: candidate.id, remaining: newRemaining }
}

/** Devuelve 1 crédito a un crédito específico. Usado al cancelar una cita con reembolso de crédito. */
export async function returnOneCredit(creditId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: row, error: selErr } = await admin
    .from("evaluation_credits")
    .select("amount, remaining")
    .eq("id", creditId)
    .single()

  if (selErr || !row) throw new Error(`Crédito no encontrado: ${selErr?.message ?? creditId}`)
  if (row.remaining >= row.amount) {
    throw new Error("El crédito ya está al máximo")
  }
  const { data: updated, error: updErr } = await admin
    .from("evaluation_credits")
    .update({ remaining: row.remaining + 1 })
    .eq("id", creditId)
    .eq("remaining", row.remaining)                    // optimistic concurrency
    .select("id")
  if (updErr) throw new Error(`Error devolviendo crédito: ${updErr.message}`)
  if (!updated || updated.length === 0) {
    throw new Error("Conflicto de concurrencia al devolver crédito, intenta de nuevo")
  }
}

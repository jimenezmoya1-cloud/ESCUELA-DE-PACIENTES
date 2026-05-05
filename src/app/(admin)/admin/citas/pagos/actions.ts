"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { copToCents } from "@/lib/payments/config"
import { createCreditFromPayment } from "@/lib/payments/credits"
import type { Plan, Payment } from "@/lib/payments/types"

type Result = { ok: true } | { ok: false; error: string }

export async function registerManualPayment(input: {
  patientId: string
  plan: Plan
  amountCop: number          // pesos enteros, ej. 80000
  notes: string
}): Promise<Result & { paymentId?: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.patientId) return { ok: false, error: "Paciente requerido" }
  if (input.plan !== "single" && input.plan !== "pack3") {
    return { ok: false, error: "Plan inválido" }
  }
  if (!Number.isFinite(input.amountCop) || input.amountCop < 1000) {
    return { ok: false, error: "Monto inválido" }
  }
  if (!input.notes.trim()) {
    return { ok: false, error: "Nota obligatoria (ej: número de transferencia, banco)" }
  }

  const admin = createAdminClient()

  // 1. Validar que el paciente existe y es paciente
  const { data: patient, error: pErr } = await admin
    .from("users")
    .select("id, role")
    .eq("id", input.patientId)
    .single()
  if (pErr || !patient) return { ok: false, error: "Paciente no encontrado" }
  if (patient.role !== "patient") return { ok: false, error: "El usuario no es un paciente" }

  // 2. Crear payment row
  const nowIso = new Date().toISOString()
  const { data: payment, error: payErr } = await admin
    .from("payments")
    .insert({
      patient_id: input.patientId,
      plan: input.plan,
      amount_cop: copToCents(input.amountCop),
      source: "manual_offline",
      status: "approved",
      created_by_admin_id: profile!.id,
      notes: input.notes.trim(),
      approved_at: nowIso,
    })
    .select("id")
    .single()

  if (payErr || !payment) {
    return { ok: false, error: `No se pudo crear el pago: ${payErr?.message ?? "sin datos"}` }
  }

  // 3. Crear el crédito asociado
  let creditId: string
  try {
    creditId = await createCreditFromPayment({
      patientId: input.patientId,
      paymentId: payment.id,
      plan: input.plan,
      source: "manual_offline",
      notes: input.notes.trim(),
    })
  } catch (e) {
    // Rollback: borrar el payment
    await admin.from("payments").delete().eq("id", payment.id)
    return { ok: false, error: e instanceof Error ? e.message : "Error creando crédito" }
  }

  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "manual_payment",
    target_type: "payment",
    target_id: payment.id,
    metadata: { credit_id: creditId, plan: input.plan, patient_id: input.patientId },
  })

  revalidatePath("/admin/citas/pagos")
  return { ok: true, paymentId: payment.id }
}

export async function adjustCredit(input: {
  patientId: string
  delta: number          // ej. +1, -1
  reason: string
}): Promise<Result> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.reason.trim()) return { ok: false, error: "Razón obligatoria" }
  if (!Number.isFinite(input.delta) || input.delta === 0) {
    return { ok: false, error: "Delta inválido" }
  }
  if (Math.abs(input.delta) > 10) {
    return { ok: false, error: "Delta fuera de rango razonable (máx ±10)" }
  }

  const admin = createAdminClient()

  if (input.delta > 0) {
    // Sumar: crear un crédito sintético amount=delta
    const { error } = await admin.from("evaluation_credits").insert({
      patient_id: input.patientId,
      source: "manual_offline",
      payment_id: null,
      amount: input.delta,
      remaining: input.delta,
      notes: `Ajuste manual: ${input.reason.trim()}`,
    })
    if (error) return { ok: false, error: error.message }
  } else {
    // Restar: descontar de remaining (FIFO)
    let toRemove = -input.delta
    while (toRemove > 0) {
      const { data: row, error: selErr } = await admin
        .from("evaluation_credits")
        .select("id, remaining")
        .eq("patient_id", input.patientId)
        .gt("remaining", 0)
        .order("purchased_at", { ascending: true })
        .limit(1)
        .maybeSingle()
      if (selErr) return { ok: false, error: selErr.message }
      if (!row) return { ok: false, error: "El paciente no tiene suficientes créditos para restar" }

      const take = Math.min(row.remaining, toRemove)
      const { data: updated, error: updErr } = await admin
        .from("evaluation_credits")
        .update({ remaining: row.remaining - take })
        .eq("id", row.id)
        .eq("remaining", row.remaining)             // optimistic concurrency
        .select("id")
      if (updErr) return { ok: false, error: updErr.message }
      if (!updated || updated.length === 0) {
        return { ok: false, error: "Conflicto de concurrencia: el crédito fue modificado por otra operación, intenta de nuevo" }
      }
      toRemove -= take
    }
  }

  // Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "adjust_credit",
    target_type: "user",
    target_id: input.patientId,
    metadata: { delta: input.delta, reason: input.reason.trim() },
  })

  revalidatePath("/admin/citas/pagos")
  return { ok: true }
}

/** Lista pagos paginados, ordenados por fecha desc. */
export async function listPayments(input: {
  limit?: number
  offset?: number
  search?: string          // nombre o email del paciente
  status?: string
  source?: string
}): Promise<{ ok: true; payments: (Payment & { patient_name: string; patient_email: string })[]; total: number } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const limit = input.limit ?? 50
  const offset = input.offset ?? 0
  const admin = createAdminClient()

  // Join por columna (más estable que depender del nombre auto-generado del FK)
  let query = admin
    .from("payments")
    .select("*, users!patient_id(name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (input.status) query = query.eq("status", input.status)
  if (input.source) query = query.eq("source", input.source)

  const { data, error, count } = await query
  if (error) return { ok: false, error: error.message }

  // Normalizar shape: aplanar nombre/email del join
  const payments = (data ?? []).map((row: any) => {
    const u = row.users
    return {
      ...row,
      users: undefined,
      patient_name: u?.name ?? "(sin nombre)",
      patient_email: u?.email ?? "",
    } as Payment & { patient_name: string; patient_email: string }
  })

  // Filtro por search en memoria (simplificado para Plan 1; en Plan 3 se hace con ilike sobre el join)
  const filtered = input.search
    ? payments.filter(
        (p) =>
          p.patient_name.toLowerCase().includes(input.search!.toLowerCase()) ||
          p.patient_email.toLowerCase().includes(input.search!.toLowerCase()),
      )
    : payments

  return {
    ok: true,
    payments: filtered,
    total: input.search ? filtered.length : (count ?? 0),
  }
}

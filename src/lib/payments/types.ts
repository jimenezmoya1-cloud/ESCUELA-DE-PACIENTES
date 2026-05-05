export type Plan = "single" | "pack3"
export type PaymentSource = "wompi" | "manual_offline"
export type PaymentStatus = "pending" | "approved" | "declined" | "voided" | "error"

export interface Payment {
  id: string
  patient_id: string
  plan: Plan
  amount_cop: number          // en centavos
  source: PaymentSource
  status: PaymentStatus
  wompi_reference: string | null
  wompi_transaction_id: string | null
  created_by_admin_id: string | null
  notes: string | null
  created_at: string          // ISO
  approved_at: string | null
}

export interface EvaluationCredit {
  id: string
  patient_id: string
  source: PaymentSource
  payment_id: string | null
  amount: number              // 1 o 3
  remaining: number
  purchased_at: string
  expires_at: string | null
  notes: string | null
  created_at: string
}

export const PLAN_LABEL: Record<Plan, string> = {
  single: "1 evaluación",
  pack3: "3 evaluaciones",
}

export const PLAN_AMOUNT_OF_CREDITS: Record<Plan, number> = {
  single: 1,
  pack3: 3,
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  declined: "Rechazado",
  voided: "Anulado",
  error: "Error",
}

export const SOURCE_LABEL: Record<PaymentSource, string> = {
  wompi: "Wompi",
  manual_offline: "Manual",
}

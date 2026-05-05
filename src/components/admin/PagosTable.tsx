"use client"

import { useState, useEffect, useTransition } from "react"
import { listPayments } from "@/app/(admin)/admin/citas/pagos/actions"
import { formatCop } from "@/lib/payments/format"
import { PLAN_LABEL, STATUS_LABEL, SOURCE_LABEL } from "@/lib/payments/types"
import type { Payment } from "@/lib/payments/types"
import RegistrarPagoManualModal from "./RegistrarPagoManualModal"
import AjustarCreditosModal from "./AjustarCreditosModal"

type PaymentRow = Payment & { patient_name: string; patient_email: string }

interface Props {
  defaultPriceSingle: number     // pesos enteros
  defaultPricePack3: number
}

export default function PagosTable({ defaultPriceSingle, defaultPricePack3 }: Props) {
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sourceFilter, setSourceFilter] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [showPagoModal, setShowPagoModal] = useState(false)
  const [showCreditModal, setShowCreditModal] = useState(false)

  const refresh = () => {
    startTransition(async () => {
      const res = await listPayments({ search, status: statusFilter, source: sourceFilter })
      if (res.ok) setRows(res.payments)
    })
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sourceFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && refresh()}
            placeholder="Buscar paciente..."
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="approved">Aprobado</option>
            <option value="pending">Pendiente</option>
            <option value="declined">Rechazado</option>
            <option value="voided">Anulado</option>
            <option value="error">Error</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todas las fuentes</option>
            <option value="manual_offline">Manual</option>
            <option value="wompi">Wompi</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreditModal(true)}
            className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-neutral hover:bg-background"
          >
            Ajustar créditos
          </button>
          <button
            onClick={() => setShowPagoModal(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Registrar pago manual
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tertiary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha</th>
              <th className="px-4 py-3 text-left font-medium">Paciente</th>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Monto</th>
              <th className="px-4 py-3 text-left font-medium">Fuente</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Nota</th>
            </tr>
          </thead>
          <tbody>
            {pending && rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-tertiary">Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-tertiary">Sin pagos registrados todavía.</td></tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-t border-tertiary/10">
                  <td className="px-4 py-3 text-neutral whitespace-nowrap">
                    {new Date(p.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral">{p.patient_name}</div>
                    <div className="text-xs text-tertiary">{p.patient_email}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral">{PLAN_LABEL[p.plan]}</td>
                  <td className="px-4 py-3 text-neutral">{formatCop(p.amount_cop)}</td>
                  <td className="px-4 py-3 text-neutral">{SOURCE_LABEL[p.source]}</td>
                  <td className="px-4 py-3 text-neutral">{STATUS_LABEL[p.status]}</td>
                  <td className="px-4 py-3 text-tertiary text-xs max-w-xs truncate" title={p.notes ?? ""}>{p.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <RegistrarPagoManualModal
        open={showPagoModal}
        onClose={() => setShowPagoModal(false)}
        defaultPriceSingle={defaultPriceSingle}
        defaultPricePack3={defaultPricePack3}
        onSuccess={refresh}
      />
      <AjustarCreditosModal
        open={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onSuccess={refresh}
      />
    </div>
  )
}

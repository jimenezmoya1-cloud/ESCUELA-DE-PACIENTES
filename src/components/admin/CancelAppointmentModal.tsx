"use client"

import { useState, useTransition } from "react"
import { cancelAppointmentAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { differenceInHours, parseISO } from "date-fns"

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  startsAt: string                  // ISO UTC
  onSuccess: () => void
}

export default function CancelAppointmentModal({ open, onClose, appointmentId, startsAt, onSuccess }: Props) {
  const hoursUntil = differenceInHours(parseISO(startsAt), new Date())
  const [reason, setReason] = useState("")
  const [returnCredit, setReturnCredit] = useState(hoursUntil >= 24)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setReason("")
    setReturnCredit(hoursUntil >= 24)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!reason.trim()) {
      setError("Razón obligatoria")
      return
    }
    startTransition(async () => {
      const res = await cancelAppointmentAction({
        appointmentId,
        reason: reason.trim(),
        returnCredit,
      })
      if (res.ok) {
        reset()
        onSuccess()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Cancelar evaluación</h2>
        <p className="mb-4 text-sm text-tertiary">
          {hoursUntil >= 24
            ? `Faltan ${hoursUntil} horas (≥24h). Sugerimos devolver el crédito.`
            : `Faltan menos de 24h (${hoursUntil}h). Por defecto NO se devuelve el crédito.`}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              placeholder="Ej: paciente solicitó reagendar, indisponibilidad del clínico"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={returnCredit}
              onChange={(e) => setReturnCredit(e.target.checked)}
            />
            <span>Devolver el crédito al paciente</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? "Cancelando..." : "Confirmar cancelación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

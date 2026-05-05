"use client"

import { useState, useTransition } from "react"
import { adjustCredit } from "@/app/(admin)/admin/citas/pagos/actions"
import PatientAutocomplete, { type PatientLite } from "./PatientAutocomplete"

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function AjustarCreditosModal({ open, onClose, onSuccess }: Props) {
  const [patient, setPatient] = useState<PatientLite | null>(null)
  const [delta, setDelta] = useState<string>("1")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setPatient(null)
    setDelta("1")
    setReason("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!patient) {
      setError("Selecciona un paciente")
      return
    }
    const deltaNum = parseInt(delta, 10)
    if (!Number.isFinite(deltaNum) || deltaNum === 0) {
      setError("Delta debe ser distinto de 0")
      return
    }
    startTransition(async () => {
      const res = await adjustCredit({ patientId: patient.id, delta: deltaNum, reason })
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
        <h2 className="text-lg font-semibold text-neutral mb-1">Ajustar créditos</h2>
        <p className="mb-6 text-sm text-tertiary">
          Suma o resta créditos manualmente. Razón obligatoria, queda en la auditoría.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Paciente</label>
            <div className="mt-1">
              <PatientAutocomplete value={patient} onChange={setPatient} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Delta</label>
            <input
              type="number"
              min={-10}
              max={10}
              step={1}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-tertiary">
              Positivo para sumar, negativo para restar. Rango: ±10.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? "Aplicando..." : "Aplicar ajuste"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

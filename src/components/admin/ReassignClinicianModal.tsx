"use client"

import { useState, useTransition } from "react"
import { reassignClinicianAction } from "@/app/(admin)/admin/citas/calendario/actions"

interface ClinicianOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  currentClinicianId: string
  clinicians: ClinicianOption[]
  onSuccess: () => void
}

export default function ReassignClinicianModal({
  open,
  onClose,
  appointmentId,
  currentClinicianId,
  clinicians,
  onSuccess,
}: Props) {
  const [newClinicianId, setNewClinicianId] = useState<string>("")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!newClinicianId) return setError("Selecciona un clínico")
    if (newClinicianId === currentClinicianId) return setError("Ese ya es el clínico actual")
    if (!reason.trim()) return setError("Razón obligatoria")

    startTransition(async () => {
      const res = await reassignClinicianAction({
        appointmentId,
        newClinicianId,
        reason: reason.trim(),
      })
      if (res.ok) {
        setNewClinicianId("")
        setReason("")
        onSuccess()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  // Excluir el clínico actual del dropdown
  const options = clinicians.filter((c) => c.id !== currentClinicianId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Reasignar clínico</h2>
        <p className="mb-4 text-sm text-tertiary">
          La cita se moverá al nuevo clínico (misma fecha/hora). Los recordatorios se reenvían y al nuevo clínico le llega notificación.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Nuevo clínico</label>
            <select
              value={newClinicianId}
              onChange={(e) => setNewClinicianId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Selecciona…</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="Ej: clínico se retiró, conflicto de horario detectado"
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
              {pending ? "Reasignando..." : "Confirmar reasignación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

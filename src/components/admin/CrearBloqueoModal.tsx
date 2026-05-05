"use client"

import { useState, useTransition } from "react"
import { createScheduleBlock } from "@/app/(admin)/admin/clinico/disponibilidad/actions"
import { bogotaToUtcIso } from "@/lib/scheduling/format"

interface Props {
  open: boolean
  onClose: () => void
  clinicianId: string
  onSuccess: () => void
}

export default function CrearBloqueoModal({ open, onClose, clinicianId, onSuccess }: Props) {
  const [date, setDate] = useState("")
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("18:00")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDate("")
    setStartTime("08:00")
    setEndTime("18:00")
    setReason("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) {
      setError("Selecciona una fecha")
      return
    }
    if (startTime >= endTime) {
      setError("La hora de inicio debe ser anterior a la de fin")
      return
    }
    const start_at = bogotaToUtcIso(date, startTime)
    const end_at = bogotaToUtcIso(date, endTime)
    startTransition(async () => {
      const res = await createScheduleBlock({
        clinician_id: clinicianId,
        start_at,
        end_at,
        reason: reason.trim() || null,
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
        <h2 className="text-lg font-semibold text-neutral mb-1">Bloquear tiempo</h2>
        <p className="mb-6 text-sm text-tertiary">
          Las horas dentro del bloqueo no estarán disponibles para reservas.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral">Desde</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral">Hasta</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Razón (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Vacaciones, congreso, hora libre"
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
              {pending ? "Creando..." : "Crear bloqueo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { rescheduleAppointmentAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { bogotaToUtcIso } from "@/lib/scheduling/format"

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  onSuccess: () => void
}

export default function RescheduleAppointmentModal({ open, onClose, appointmentId, onSuccess }: Props) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("08:00")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setDate("")
    setTime("08:00")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) {
      setError("Selecciona una fecha")
      return
    }
    const newStartsAtIso = bogotaToUtcIso(date, time)
    startTransition(async () => {
      const res = await rescheduleAppointmentAction({ appointmentId, newStartsAtIso })
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
        <h2 className="text-lg font-semibold text-neutral mb-1">Reagendar evaluación</h2>
        <p className="mb-4 text-sm text-tertiary">
          Mueve la cita al nuevo horario. El clínico asignado se mantiene. Los recordatorios se reenvían.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-sm font-medium text-neutral">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
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
              {pending ? "Reagendando..." : "Confirmar reagendamiento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

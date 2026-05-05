"use client"

import { useState, useTransition } from "react"
import { markNoShowAction } from "@/app/(admin)/admin/citas/calendario/actions"

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  onSuccess: () => void
}

export default function MarkNoShowModal({ open, onClose, appointmentId, onSuccess }: Props) {
  const [returnCredit, setReturnCredit] = useState(false)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await markNoShowAction({ appointmentId, returnCredit, note })
      if (res.ok) {
        onSuccess()
        onClose()
        setNote("")
        setReturnCredit(false)
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Marcar como no-show</h2>
        <p className="mb-4 text-sm text-tertiary">
          El paciente no se presentó. Por defecto NO se devuelve el crédito.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Nota (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ej: paciente avisó tarde, intentamos contactar sin éxito"
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
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Confirmar no-show"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

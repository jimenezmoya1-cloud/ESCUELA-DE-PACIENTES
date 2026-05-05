"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deactivateClinicianAction } from "@/app/(admin)/admin/personal/actions"

interface Props {
  clinicianId: string
  clinicianName: string
}

export default function DeactivateClinicianButton({ clinicianId, clinicianName }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await deactivateClinicianAction(clinicianId)
      if (res.ok) {
        const { reassignedCount, orphanedCount } = res.outcome
        let summary = `Clínico desactivado.`
        if (reassignedCount > 0) summary += ` ${reassignedCount} cita(s) reasignada(s) automáticamente.`
        if (orphanedCount > 0) summary += ` ${orphanedCount} cita(s) huérfana(s) requieren resolución manual (revisa el dashboard).`
        alert(summary)
        setConfirmOpen(false)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Desactivar
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral mb-2">Desactivar clínico</h2>
            <p className="text-sm text-tertiary mb-4">
              Vas a desactivar a <strong className="text-neutral">{clinicianName}</strong>. El sistema intentará reasignar automáticamente sus citas futuras a otros clínicos disponibles. Las que no encuentren reemplazo quedarán como "huérfanas" y aparecerán en el dashboard para que las resuelvas manualmente.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Desactivando..." : "Confirmar desactivación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

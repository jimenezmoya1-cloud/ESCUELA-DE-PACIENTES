"use client"

import { useState, useTransition } from "react"
import { deleteScheduleBlock } from "@/app/(admin)/admin/clinico/disponibilidad/actions"
import type { BlockEntry } from "@/lib/scheduling/types"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import CrearBloqueoModal from "./CrearBloqueoModal"

export default function BloqueosManager({
  clinicianId,
  initialBlocks,
}: {
  clinicianId: string
  initialBlocks: BlockEntry[]
}) {
  const [blocks, setBlocks] = useState<BlockEntry[]>(initialBlocks)
  const [showModal, setShowModal] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete(blockId: string) {
    if (!confirm("¿Eliminar este bloqueo?")) return
    setError(null)
    startTransition(async () => {
      const res = await deleteScheduleBlock(blockId, clinicianId)
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      } else {
        setError(res.error)
      }
    })
  }

  // Después de crear un bloqueo, refrescamos vía window.location reload
  // (más simple que mantener estado server-cliente sincronizado)
  function handleCreated() {
    window.location.reload()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Bloquear tiempo
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-tertiary/30 p-8 text-center text-sm text-tertiary">
          No tienes bloqueos activos.
        </div>
      ) : (
        <ul className="space-y-2">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-tertiary/10 bg-white px-4 py-3"
            >
              <div>
                <div className="text-sm font-medium text-neutral">
                  {formatHumanDateTimeBogota(b.start_at)} → {formatHumanDateTimeBogota(b.end_at)}
                </div>
                {b.reason && <div className="text-xs text-tertiary">{b.reason}</div>}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(b.id)}
                className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs font-medium text-tertiary hover:bg-background disabled:opacity-50"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <CrearBloqueoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        clinicianId={clinicianId}
        onSuccess={handleCreated}
      />
    </div>
  )
}

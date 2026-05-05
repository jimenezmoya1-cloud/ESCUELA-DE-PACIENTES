"use client"

import { useState, useTransition } from "react"
import {
  saveScheduleEntry,
  deleteScheduleEntry,
} from "@/app/(admin)/admin/clinico/disponibilidad/actions"
import type { ScheduleEntry } from "@/lib/scheduling/types"

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
]

interface DraftRow {
  id?: string
  weekday: number
  start_time: string
  end_time: string
  is_active: boolean
}

function toDraft(s: ScheduleEntry): DraftRow {
  return {
    id: s.id,
    weekday: s.weekday,
    start_time: s.start_time.slice(0, 5),
    end_time: s.end_time.slice(0, 5),
    is_active: s.is_active,
  }
}

export default function HorarioBaseEditor({
  clinicianId,
  initialSchedules,
}: {
  clinicianId: string
  initialSchedules: ScheduleEntry[]
}) {
  const [rows, setRows] = useState<DraftRow[]>(initialSchedules.map(toDraft))
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; msg: string } | null>(null)

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { weekday: 1, start_time: "08:00", end_time: "12:00", is_active: true },
    ])
  }

  function saveRow(index: number) {
    setFeedback(null)
    const row = rows[index]
    startTransition(async () => {
      const res = await saveScheduleEntry({
        ...row,
        clinician_id: clinicianId,
      })
      if (res.ok) {
        setFeedback({ kind: "ok", msg: "Horario guardado" })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  function removeRow(index: number) {
    setFeedback(null)
    const row = rows[index]
    if (!row.id) {
      // Aún no guardado en DB — solo quita de la UI
      setRows((prev) => prev.filter((_, i) => i !== index))
      return
    }
    if (!confirm("¿Eliminar este horario?")) return
    startTransition(async () => {
      const res = await deleteScheduleEntry(row.id!, clinicianId)
      if (res.ok) {
        setRows((prev) => prev.filter((_, i) => i !== index))
        setFeedback({ kind: "ok", msg: "Horario eliminado" })
      } else {
        setFeedback({ kind: "error", msg: res.error })
      }
    })
  }

  return (
    <div className="rounded-xl border border-tertiary/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-background text-tertiary">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Día</th>
            <th className="px-4 py-3 text-left font-medium">Inicio</th>
            <th className="px-4 py-3 text-left font-medium">Fin</th>
            <th className="px-4 py-3 text-left font-medium">Activo</th>
            <th className="px-4 py-3 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-tertiary">
                No has configurado ningún horario. Agrega uno para empezar.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? `new-${i}`} className="border-t border-tertiary/10">
                <td className="px-4 py-3">
                  <select
                    value={row.weekday}
                    onChange={(e) => updateRow(i, { weekday: Number(e.target.value) })}
                    className="rounded-lg border border-tertiary/20 px-2 py-1 text-sm"
                  >
                    {WEEKDAYS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={(e) => updateRow(i, { start_time: e.target.value })}
                    className="rounded-lg border border-tertiary/20 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={(e) => updateRow(i, { end_time: e.target.value })}
                    className="rounded-lg border border-tertiary/20 px-2 py-1 text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) => updateRow(i, { is_active: e.target.checked })}
                  />
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    onClick={() => saveRow(i)}
                    disabled={pending}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={pending}
                    className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs font-medium text-tertiary hover:bg-background"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="flex items-center justify-between border-t border-tertiary/10 px-4 py-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-dashed border-tertiary/30 px-3 py-1.5 text-xs font-medium text-tertiary hover:bg-background"
        >
          + Agregar bloque de horario
        </button>
        {feedback && (
          <span className={`text-xs ${feedback.kind === "ok" ? "text-green-600" : "text-red-600"}`}>
            {feedback.msg}
          </span>
        )}
      </div>
    </div>
  )
}

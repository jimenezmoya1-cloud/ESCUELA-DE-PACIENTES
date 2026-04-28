"use client"

import { Calendar } from "lucide-react"
import type { AssessmentNivel } from "@/types/database"

interface TimelineItem {
  id: string
  created_at: string
  score_global: number
  nivel: AssessmentNivel
}

const nivelStyle: Record<AssessmentNivel, string> = {
  Verde: "bg-green-100 text-green-700",
  Amarillo: "bg-yellow-100 text-yellow-700",
  Rojo: "bg-red-100 text-red-700",
}

export default function AssessmentTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Aún no hay evaluaciones registradas.
      </div>
    )
  }

  const oldestId = items[items.length - 1]?.id

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
      {items.map((it) => {
        const isInicial = it.id === oldestId && items.length > 1
        return (
          <div key={it.id} className="flex items-center gap-4 px-5 py-3">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">
                {new Date(it.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                {isInicial && <span className="ml-2 text-xs text-slate-400 italic">(inicial)</span>}
              </p>
            </div>
            <span className="font-bold text-slate-700 text-sm">{it.score_global}/100</span>
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${nivelStyle[it.nivel]}`}>{it.nivel}</span>
          </div>
        )
      })}
    </div>
  )
}

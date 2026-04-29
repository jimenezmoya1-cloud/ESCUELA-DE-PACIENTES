"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react"
import type { PatientAssessment } from "@/types/database"

export interface AssessmentWithDelta extends PatientAssessment {
  delta_score: number | null
  delta_nivel: "mejoro" | "empeoro" | "igual" | null
}

interface Props {
  assessments: AssessmentWithDelta[]
  onViewReport: (assessmentId: string) => void
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-tertiary">Primera evaluación</span>
  if (delta > 0)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
        <TrendingUp className="w-3.5 h-3.5" />+{delta} pts
      </span>
    )
  if (delta < 0)
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
        <TrendingDown className="w-3.5 h-3.5" />{delta} pts
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-xs text-tertiary">
      <Minus className="w-3.5 h-3.5" />Sin cambios
    </span>
  )
}

export default function AssessmentListWithDelta({ assessments, onViewReport }: Props) {
  const [filterMonth, setFilterMonth] = useState("")

  const filtered = filterMonth
    ? assessments.filter((a) => new Date(a.created_at).toISOString().slice(0, 7) === filterMonth)
    : assessments

  const months = Array.from(
    new Set(assessments.map((a) => new Date(a.created_at).toISOString().slice(0, 7))),
  ).sort((a, b) => b.localeCompare(a))

  return (
    <div className="w-full">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-tertiary" />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(m + "-02").toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-tertiary">No hay evaluaciones en este período</p>
        ) : (
          filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => onViewReport(a.id)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-secondary text-sm">
                  {new Date(a.created_at).toLocaleDateString("es-CO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      a.nivel === "Verde"
                        ? "bg-green-100 text-green-700"
                        : a.nivel === "Amarillo"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {a.nivel}
                  </span>
                  <span className="text-xs text-tertiary">Score: {a.score_global}/100</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DeltaChip delta={a.delta_score} />
                <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

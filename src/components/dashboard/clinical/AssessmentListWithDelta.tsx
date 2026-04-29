"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, Calendar, BookOpen } from "lucide-react"
import type { PatientAssessment } from "@/types/database"

export interface AssessmentWithDelta extends PatientAssessment {
  delta_score: number | null
  delta_nivel: "mejoro" | "empeoro" | "igual" | null
}

interface Props {
  assessments: AssessmentWithDelta[]
  onViewReport: (assessmentId: string) => void
}

const NIVEL_THEME: Record<string, { spine: string; accent: string; chip: string; hoverRing: string }> = {
  Verde: {
    spine: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    accent: "text-emerald-700",
    chip: "bg-emerald-100 text-emerald-700",
    hoverRing: "hover:ring-emerald-300",
  },
  Amarillo: {
    spine: "bg-gradient-to-b from-amber-400 to-amber-500",
    accent: "text-amber-700",
    chip: "bg-amber-100 text-amber-700",
    hoverRing: "hover:ring-amber-300",
  },
  Rojo: {
    spine: "bg-gradient-to-b from-rose-500 to-rose-600",
    accent: "text-rose-700",
    chip: "bg-rose-100 text-rose-700",
    hoverRing: "hover:ring-rose-300",
  },
}

function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
        Inicial
      </span>
    )
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
        <TrendingUp className="w-3 h-3" />+{delta}
      </span>
    )
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
        <TrendingDown className="w-3 h-3" />
        {delta}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
      <Minus className="w-3 h-3" />0
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
      <div className="mb-6 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Date(m + "-02").toLocaleDateString("es-CO", { year: "numeric", month: "long" })}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">
          No hay evaluaciones en este período
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((a, idx) => {
            const isLatest = idx === 0 && !filterMonth
            const theme = NIVEL_THEME[a.nivel] ?? NIVEL_THEME.Amarillo
            const date = new Date(a.created_at)
            const day = date.getDate()
            const month = date
              .toLocaleDateString("es-CO", { month: "short" })
              .replace(".", "")
              .toUpperCase()
            const year = date.getFullYear()
            const weekday = date.toLocaleDateString("es-CO", { weekday: "long" })

            return (
              <button
                key={a.id}
                onClick={() => onViewReport(a.id)}
                className={`group relative flex h-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-2 ${theme.hoverRing}`}
              >
                {/* Book spine */}
                <div className={`w-2 shrink-0 ${theme.spine}`} aria-hidden />

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-col leading-none">
                      <span className="text-[11px] font-semibold tracking-widest text-slate-400">
                        {month}
                      </span>
                      <span className="mt-1 text-4xl font-black text-slate-800">{day}</span>
                      <span className="text-xs font-medium text-slate-400">{year}</span>
                    </div>
                    {isLatest && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Última
                      </span>
                    )}
                  </div>

                  <p className="mb-4 text-xs capitalize text-slate-400">{weekday}</p>

                  <div className="mb-3 flex items-baseline gap-1">
                    <span className={`text-2xl font-black ${theme.accent}`}>{a.score_global}</span>
                    <span className="text-xs font-medium text-slate-400">/100</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${theme.chip}`}
                    >
                      {a.nivel}
                    </span>
                    <DeltaChip delta={a.delta_score} />
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Abrir reporte</span>
                    <svg
                      className="ml-auto w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

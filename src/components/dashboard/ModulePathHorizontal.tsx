"use client"

import Link from "next/link"
import {
  Compass, Flame, Sparkles, Users, Pill, Heart, Activity, Apple, Brain, Moon,
  HeartPulse, Droplet, CircleDashed, CigaretteOff, Scale, BookOpen, Check,
  type LucideIcon,
} from "lucide-react"
import type { ModuleWithStatus } from "@/types/database"

interface NodeVisual {
  icon: LucideIcon
  gradient: string
}

const COMPONENT_VISUAL: Record<string, NodeVisual> = {
  empowerment: { icon: Compass, gradient: "from-indigo-500 to-blue-600" },
  empowerment_cierre: { icon: Sparkles, gradient: "from-amber-400 to-orange-500" },
  el_incendio: { icon: Flame, gradient: "from-rose-500 to-red-600" },
  empoderamiento_salud: { icon: Brain, gradient: "from-violet-500 to-purple-600" },
  red_de_apoyo: { icon: Users, gradient: "from-pink-500 to-rose-500" },
  adherencia: { icon: Pill, gradient: "from-cyan-500 to-blue-500" },
  salud_sexual: { icon: Heart, gradient: "from-rose-400 to-pink-600" },
  actividad_fisica: { icon: Activity, gradient: "from-emerald-500 to-teal-600" },
  alimentacion: { icon: Apple, gradient: "from-lime-500 to-green-600" },
  salud_mental: { icon: Brain, gradient: "from-purple-500 to-fuchsia-600" },
  sueno: { icon: Moon, gradient: "from-slate-600 to-indigo-800" },
  presion_arterial: { icon: HeartPulse, gradient: "from-red-500 to-orange-500" },
  glucosa: { icon: Droplet, gradient: "from-sky-500 to-blue-600" },
  colesterol: { icon: CircleDashed, gradient: "from-yellow-500 to-amber-600" },
  nicotina: { icon: CigaretteOff, gradient: "from-stone-500 to-zinc-700" },
  control_peso: { icon: Scale, gradient: "from-teal-500 to-cyan-600" },
}

const DEFAULT_VISUAL: NodeVisual = { icon: BookOpen, gradient: "from-slate-500 to-slate-700" }

// Mapas de clases literales para que el JIT de Tailwind las incluya.
const GRID_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
}

// Inset horizontal de la línea conectora alineado al centro del primer y
// último ícono según el número de columnas (icono centrado = (i+0.5)/N).
const LINE_INSET: Record<number, string> = {
  2: "lg:left-[25%] lg:right-[25%]",
  3: "lg:left-[16.67%] lg:right-[16.67%]",
  4: "lg:left-[12.5%] lg:right-[12.5%]",
}

export default function ModulePathHorizontal({ modules }: { modules: ModuleWithStatus[] }) {
  if (modules.length === 0) return null

  const count = modules.length
  const hasInicio = modules[0]?.component_key === "empowerment"
  const gridCols = GRID_COLS[count] ?? "lg:grid-cols-4"
  const lineInset = LINE_INSET[count] ?? "lg:left-[12.5%] lg:right-[12.5%]"

  return (
    <div className="relative">
      {/* Línea conectora — escritorio: horizontal; móvil: vertical */}
      {count >= 2 && (
        <>
          <div
            aria-hidden
            className={`absolute hidden lg:block ${lineInset} lg:top-[44px] lg:h-1 lg:rounded-full bg-gradient-to-r from-indigo-200 via-blue-200 to-emerald-200`}
          />
          <div
            aria-hidden
            className="absolute left-[44px] top-12 bottom-12 w-1 rounded-full bg-gradient-to-b from-indigo-200 via-blue-200 to-emerald-200 lg:hidden"
          />
        </>
      )}

      <div className={`relative grid grid-cols-1 gap-6 ${gridCols} lg:gap-4`}>
        {modules.map((mod, idx) => {
          const visual = (mod.component_key ? COMPONENT_VISUAL[mod.component_key] : undefined) ?? DEFAULT_VISUAL
          const Icon = visual.icon
          const isCompleted = mod.status === "completed"
          const subTotal = mod.submodules_total ?? 0
          const subDone = mod.submodules_completed ?? 0
          const progress = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : (isCompleted ? 100 : 0)
          const stepLabel = hasInicio
            ? idx === 0 ? "Inicio" : `Prioridad ${idx}`
            : `Prioridad ${idx + 1}`

          return (
            <Link
              key={mod.id}
              href={`/modulos/${mod.id}`}
              className="group relative flex items-start gap-4 lg:flex-col lg:items-center lg:text-center"
            >
              {/* Icon node */}
              <div className="relative shrink-0">
                <div
                  className={`relative z-10 flex h-[88px] w-[88px] items-center justify-center rounded-2xl bg-gradient-to-br ${visual.gradient} shadow-lg ring-4 ring-white transition-transform group-hover:-translate-y-1 group-hover:shadow-xl`}
                >
                  <Icon className="h-10 w-10 text-white" strokeWidth={2.2} />
                  {isCompleted && (
                    <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white">
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                {/* Step number */}
                <div className="absolute -left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500 shadow ring-1 ring-slate-200 lg:left-1/2 lg:top-auto lg:-bottom-2 lg:-translate-x-1/2 lg:translate-y-0">
                  {stepLabel}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 pt-1 lg:mt-6 lg:w-full">
                <h3 className="line-clamp-2 text-base font-bold text-slate-800 lg:text-sm">{mod.title}</h3>
                {mod.short_description && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{mod.short_description}</p>
                )}
                {subTotal > 0 && (
                  <div className="mt-3 flex items-center gap-2 lg:justify-center">
                    <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${visual.gradient}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {subDone}/{subTotal}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

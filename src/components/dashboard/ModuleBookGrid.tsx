"use client"

import Link from "next/link"
import {
  Compass, Flame, Sparkles, Users, Pill, Heart, Activity, Apple, Brain, Moon,
  HeartPulse, Droplet, CircleDashed, CigaretteOff, Scale, BookOpen, Check,
  type LucideIcon,
} from "lucide-react"
import type { ModuleWithStatus } from "@/types/database"

interface ModuleVisual {
  icon: LucideIcon
  gradient: string
  accent: string
}

const COMPONENT_VISUAL: Record<string, ModuleVisual> = {
  empowerment: { icon: Compass, gradient: "from-indigo-500 to-blue-600", accent: "bg-indigo-100 text-indigo-700" },
  empowerment_cierre: { icon: Sparkles, gradient: "from-amber-400 to-orange-500", accent: "bg-amber-100 text-amber-700" },
  el_incendio: { icon: Flame, gradient: "from-rose-500 to-red-600", accent: "bg-rose-100 text-rose-700" },
  empoderamiento_salud: { icon: Brain, gradient: "from-violet-500 to-purple-600", accent: "bg-violet-100 text-violet-700" },
  red_de_apoyo: { icon: Users, gradient: "from-pink-500 to-rose-500", accent: "bg-pink-100 text-pink-700" },
  adherencia: { icon: Pill, gradient: "from-cyan-500 to-blue-500", accent: "bg-cyan-100 text-cyan-700" },
  salud_sexual: { icon: Heart, gradient: "from-rose-400 to-pink-600", accent: "bg-rose-100 text-rose-700" },
  actividad_fisica: { icon: Activity, gradient: "from-emerald-500 to-teal-600", accent: "bg-emerald-100 text-emerald-700" },
  alimentacion: { icon: Apple, gradient: "from-lime-500 to-green-600", accent: "bg-lime-100 text-lime-700" },
  salud_mental: { icon: Brain, gradient: "from-purple-500 to-fuchsia-600", accent: "bg-purple-100 text-purple-700" },
  sueno: { icon: Moon, gradient: "from-slate-600 to-indigo-800", accent: "bg-slate-100 text-slate-700" },
  presion_arterial: { icon: HeartPulse, gradient: "from-red-500 to-orange-500", accent: "bg-red-100 text-red-700" },
  glucosa: { icon: Droplet, gradient: "from-sky-500 to-blue-600", accent: "bg-sky-100 text-sky-700" },
  colesterol: { icon: CircleDashed, gradient: "from-yellow-500 to-amber-600", accent: "bg-yellow-100 text-yellow-700" },
  nicotina: { icon: CigaretteOff, gradient: "from-stone-500 to-zinc-700", accent: "bg-stone-100 text-stone-700" },
  control_peso: { icon: Scale, gradient: "from-teal-500 to-cyan-600", accent: "bg-teal-100 text-teal-700" },
}

const DEFAULT_VISUAL: ModuleVisual = {
  icon: BookOpen,
  gradient: "from-slate-500 to-slate-700",
  accent: "bg-slate-100 text-slate-700",
}

export default function ModuleBookGrid({ modules }: { modules: ModuleWithStatus[] }) {
  if (modules.length === 0) return null

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Biblioteca de módulos
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((mod) => {
          const visual = (mod.component_key ? COMPONENT_VISUAL[mod.component_key] : undefined) ?? DEFAULT_VISUAL
          const Icon = visual.icon
          const isCompleted = mod.status === "completed"
          const subTotal = mod.submodules_total ?? 0
          const subDone = mod.submodules_completed ?? 0
          const progress = subTotal > 0 ? Math.round((subDone / subTotal) * 100) : (isCompleted ? 100 : 0)

          return (
            <Link
              key={mod.id}
              href={`/modulos/${mod.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300"
            >
              {/* Top color band with icon */}
              <div className={`relative bg-gradient-to-br ${visual.gradient} p-5`}>
                {isCompleted && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <Check className="h-3 w-3" /> Completado
                  </span>
                )}
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Icon className="h-7 w-7 text-white" strokeWidth={2.2} />
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 line-clamp-2 text-sm font-bold text-slate-800">{mod.title}</h3>
                {mod.short_description && (
                  <p className="line-clamp-2 text-xs text-slate-500">{mod.short_description}</p>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  {subTotal > 0 ? (
                    <div className="flex flex-1 items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${visual.gradient}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {subDone}/{subTotal}
                      </span>
                    </div>
                  ) : (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${visual.accent}`}>
                      Disponible
                    </span>
                  )}
                  <svg
                    className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import type { ModuleWithStatus } from "@/types/database"
import { formatDate } from "@/lib/modules"

export default function ModuleRoadmap({
  modules,
}: {
  modules: ModuleWithStatus[]
}) {
  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8">
      {/* Línea curva SVG de fondo */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pathGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#1A62DD" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6A778F" stopOpacity="0.15" />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative space-y-2">
        {modules.map((mod, index) => {
          const isLeft = index % 2 === 0
          return (
            <div key={mod.id}>
              {/* Conector curvo entre nodos */}
              {index > 0 && (
                <ConnectorCurve isLeft={isLeft} prevStatus={modules[index - 1].status} />
              )}
              <ModuleNode module={mod} isLeft={isLeft} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ConnectorCurve({
  isLeft,
  prevStatus,
}: {
  isLeft: boolean
  prevStatus: string
}) {
  const isActive = prevStatus === "completed" || prevStatus === "current"
  const strokeColor = isActive ? "#22c55e" : "#6A778F"
  const opacity = isActive ? 0.5 : 0.2

  return (
    <div className="relative flex h-10 items-center justify-center">
      <svg width="200" height="40" viewBox="0 0 200 40" className="overflow-visible">
        <path
          d={
            isLeft
              ? "M 140 0 C 140 20, 60 20, 60 40"
              : "M 60 0 C 60 20, 140 20, 140 40"
          }
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeDasharray={isActive ? "none" : "6 4"}
          opacity={opacity}
        />
      </svg>
    </div>
  )
}

function ModuleNode({
  module: mod,
  isLeft,
}: {
  module: ModuleWithStatus
  isLeft: boolean
}) {
  const alignment = isLeft ? "justify-start" : "justify-end"

  if (mod.status === "completed") {
    return (
      <div className={`flex ${alignment}`}>
        <Link
          href={`/modulos/${mod.id}`}
          className="group relative flex w-[85%] items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 sm:w-[75%]"
        >
          {/* Nodo circular */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-sm shadow-emerald-200">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600">Módulo {mod.order}</span>
              {mod.completed_at && (
                <span className="text-[11px] text-tertiary">
                  {formatDate(mod.completed_at)}
                </span>
              )}
            </div>
            <h3 className="mt-0.5 truncate text-sm font-semibold text-neutral">{mod.title}</h3>
          </div>
          <svg className="h-4 w-4 shrink-0 text-tertiary/40 transition-colors group-hover:text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    )
  }

  if (mod.status === "current") {
    return (
      <div className={`flex ${alignment}`}>
        <Link
          href={`/modulos/${mod.id}`}
          className="relative w-[85%] overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-5 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 sm:w-[75%]"
        >
          {/* Efecto de brillo decorativo */}
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/5" />

          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white shadow-sm">
                {mod.order}
              </div>
              <span className="text-xs font-medium text-white/60">Módulo actual</span>
            </div>
            <h3 className="mt-3 text-lg font-bold text-white">{mod.title}</h3>
            {mod.short_description && (
              <p className="mt-1 text-sm leading-relaxed text-white/70">{mod.short_description}</p>
            )}
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-white/95">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Comenzar Lección
            </div>
          </div>
        </Link>
      </div>
    )
  }

  if (mod.status === "locked_next") {
    return (
      <div className={`flex ${alignment}`}>
        <div className="relative flex w-[85%] items-center gap-3 rounded-2xl border-2 border-dashed border-secondary/20 bg-white/60 p-4 backdrop-blur-sm sm:w-[75%]">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-secondary/30 bg-secondary/5">
            <svg className="h-5 w-5 text-secondary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-secondary/60">Módulo {mod.order}</span>
            <h3 className="mt-0.5 truncate text-sm font-medium text-tertiary">{mod.title}</h3>
            <p className="mt-0.5 text-xs text-secondary/50">
              Se desbloquea el {formatDate(mod.unlock_date)}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // locked_future
  return (
    <div className={`flex ${alignment}`}>
      <div className="relative flex w-[85%] items-center gap-3 rounded-2xl bg-background/40 p-4 sm:w-[75%]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-tertiary/15 bg-background/60">
          <svg className="h-5 w-5 text-tertiary/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1 opacity-50">
          <span className="text-xs font-semibold text-tertiary/60">Módulo {mod.order}</span>
          <h3 className="mt-0.5 truncate text-sm font-medium text-tertiary/60">{mod.title}</h3>
          <p className="mt-0.5 text-xs text-tertiary/40">Próximamente</p>
        </div>
      </div>
    </div>
  )
}

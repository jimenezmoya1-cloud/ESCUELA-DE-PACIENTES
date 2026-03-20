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
    <div className="relative">
      {/* Línea vertical del roadmap */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-tertiary/20 lg:left-8" />

      <div className="space-y-4">
        {modules.map((mod, index) => (
          <ModuleNode key={mod.id} module={mod} index={index} />
        ))}
      </div>
    </div>
  )
}

function ModuleNode({
  module: mod,
  index,
}: {
  module: ModuleWithStatus
  index: number
}) {
  if (mod.status === "completed") {
    return (
      <div className="relative flex gap-4 lg:gap-6">
        {/* Nodo completado */}
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-success bg-success/10 lg:h-16 lg:w-16">
          <svg className="h-5 w-5 text-success lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <Link
          href={`/modulos/${mod.id}`}
          className="flex flex-1 items-center rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-success">Módulo {mod.order}</span>
              {mod.completed_at && (
                <span className="text-xs text-tertiary">
                  Completado el {formatDate(mod.completed_at)}
                </span>
              )}
            </div>
            <h3 className="mt-0.5 font-medium text-neutral">{mod.title}</h3>
          </div>
          <svg className="h-5 w-5 shrink-0 text-tertiary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    )
  }

  if (mod.status === "current") {
    return (
      <div className="relative flex gap-4 lg:gap-6">
        {/* Nodo actual */}
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-secondary bg-secondary text-white lg:h-16 lg:w-16">
          <span className="text-sm font-bold lg:text-base">{mod.order}</span>
        </div>
        <Link
          href={`/modulos/${mod.id}`}
          className="flex flex-1 flex-col rounded-xl bg-primary p-5 shadow-lg transition-transform hover:scale-[1.01]"
        >
          <span className="text-xs font-medium text-white/70">Módulo {mod.order}</span>
          <h3 className="mt-1 text-lg font-semibold text-white">{mod.title}</h3>
          {mod.short_description && (
            <p className="mt-1 text-sm text-white/70">{mod.short_description}</p>
          )}
          <div className="mt-4 flex items-center gap-2 self-start rounded-lg bg-white px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-white/90">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            Comenzar Lección
          </div>
        </Link>
      </div>
    )
  }

  if (mod.status === "locked_next") {
    return (
      <div className="relative flex gap-4 lg:gap-6">
        {/* Nodo próximo a desbloquear */}
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-tertiary/30 bg-background lg:h-16 lg:w-16">
          <svg className="h-5 w-5 text-tertiary/50 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex flex-1 items-center rounded-xl border border-dashed border-tertiary/30 bg-white/50 p-4">
          <div className="flex-1">
            <span className="text-xs font-medium text-tertiary">Módulo {mod.order}</span>
            <h3 className="mt-0.5 font-medium text-tertiary">{mod.title}</h3>
            <p className="mt-1 text-xs text-tertiary/70">
              Se desbloquea el {formatDate(mod.unlock_date)}
            </p>
          </div>
          <svg className="h-5 w-5 shrink-0 text-tertiary/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      </div>
    )
  }

  // locked_future
  return (
    <div className="relative flex gap-4 lg:gap-6">
      {/* Nodo futuro */}
      <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-tertiary/20 bg-background lg:h-16 lg:w-16">
        <svg className="h-5 w-5 text-tertiary/30 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="flex flex-1 items-center rounded-xl bg-background/50 p-4 opacity-60">
        <div className="flex-1">
          <span className="text-xs font-medium text-tertiary/70">Módulo {mod.order}</span>
          <h3 className="mt-0.5 font-medium text-tertiary/70">{mod.title}</h3>
          <p className="mt-1 text-xs text-tertiary/50">Próximamente</p>
        </div>
      </div>
    </div>
  )
}

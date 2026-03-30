"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { ModuleWithStatus } from "@/types/database"
import ModuleRoadmap from "@/components/dashboard/ModuleRoadmap"
import ComponentSelector from "@/components/dashboard/ComponentSelector"

export default function MiCaminoClient({
  modulesWithStatus,
  currentModule,
  needsComponentSelection,
  patientId,
  userEmail,
}: {
  modulesWithStatus: ModuleWithStatus[]
  currentModule: ModuleWithStatus | null
  needsComponentSelection: boolean
  patientId: string
  userEmail: string
}) {
  const [showSelector, setShowSelector] = useState(needsComponentSelection)
  const [unlocking, setUnlocking] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleTestUnlock() {
    if (!confirm("¿Desbloquear todos los módulos?")) return
    setUnlocking(true)
    for (const mod of modulesWithStatus) {
      if (mod.status === "locked_next" || mod.status === "locked_future") {
        await supabase.from("patient_module_unlocks").upsert({
          patient_id: patientId,
          module_id: mod.id,
          unlocked_at: new Date().toISOString()
        }, { onConflict: "patient_id,module_id" })
      }
    }
    setUnlocking(false)
    router.refresh()
  }

  return (
    <div>
      {showSelector && (
        <ComponentSelector
          patientId={patientId}
          onComplete={() => setShowSelector(false)}
        />
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#212B52]">Mi Camino</h1>
        <p className="mt-1 text-base text-tertiary">
          Tu programa de salud cardiovascular personalizado
        </p>
      </div>

      {userEmail === "daniel.jimenez@caimed.com" && (
        <button
          onClick={handleTestUnlock}
          disabled={unlocking}
          className="mb-8 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          {unlocking ? "Desbloqueando..." : "⚡️ MODO PRUEBA: Desbloquear todos los módulos (Admin Tool)"}
        </button>
      )}

      <ModuleRoadmap modules={modulesWithStatus} />

      {/* Card fija: Siguiente tarea */}
      {currentModule && (
        <div className="fixed bottom-20 left-4 right-4 z-20 lg:bottom-6 lg:left-auto lg:right-8 lg:w-80">
          <a
            href={`/modulos/${currentModule.id}`}
            className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#06559F] to-[#1E8DCE] p-4 text-white shadow-lg transition-transform hover:scale-[1.02]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70">Siguiente lección</p>
              <p className="truncate text-sm font-medium">{currentModule.title}</p>
            </div>
            <svg className="h-5 w-5 shrink-0 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      )}
    </div>
  )
}


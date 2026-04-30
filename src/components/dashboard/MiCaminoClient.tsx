"use client"

import type { ModuleWithStatus } from "@/types/database"
import ModulePathHorizontal from "@/components/dashboard/ModulePathHorizontal"
import ModuleBookGrid from "@/components/dashboard/ModuleBookGrid"
import { Sparkles } from "lucide-react"

interface Props {
  pathModules: ModuleWithStatus[]
  libraryModules: ModuleWithStatus[]
  hasAssessment: boolean
  userEmail: string
}

export default function MiCaminoClient({
  pathModules,
  libraryModules,
  hasAssessment,
}: Props) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#212B52]">Mi Camino</h1>
        <p className="mt-1 text-base text-tertiary">
          {hasAssessment
            ? "Tu programa personalizado según tu última evaluación clínica"
            : "Tu auxiliar de enfermería completará tu historia clínica para personalizar tu camino"}
        </p>
      </div>

      {pathModules.length > 0 && (
        <section className="mb-14">
          <div className="mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              {hasAssessment ? "Tu camino prioritario" : "Comienza aquí"}
            </h2>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm ring-1 ring-slate-200/60 lg:p-8">
            <ModulePathHorizontal modules={pathModules} />
          </div>
        </section>
      )}

      {libraryModules.length > 0 && (
        <section>
          <ModuleBookGrid modules={libraryModules} />
        </section>
      )}
    </div>
  )
}

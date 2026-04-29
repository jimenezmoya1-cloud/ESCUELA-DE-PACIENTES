"use client"

import { forwardRef } from "react"
import HeaderSimple from "./HeaderSimple"
import InspirationalBanner from "./InspirationalBanner"
import type { DatosPaciente, ComponenteScore } from "@/lib/clinical/types"

interface Props {
  paciente: DatosPaciente
  componentes: ComponenteScore[]
  isGenerando: boolean
}

const ReportPage2 = forwardRef<HTMLDivElement, Props>(function ReportPage2({ paciente, componentes, isGenerando }, ref) {
  const componentesOrdenados = [...componentes].sort((a, b) => b.puntaje - a.puntaje)
  const topPeores = [...componentesOrdenados].reverse().slice(0, 3)
  const topFuertes = [...componentesOrdenados].slice(0, 3)

  return (
    <div
      ref={ref}
      className={`${isGenerando ? "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50" : "bg-transparent"} min-h-[297mm] flex flex-col relative font-sans`}
    >
      <HeaderSimple paciente={paciente} />

      <div className="px-8 pt-10 pb-12 flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          <InspirationalBanner
            nombrePaciente={paciente.nombre}
            caimedScore={paciente.scoreGlobal}
            nivelScore={paciente.nivel}
            metaProteccion={paciente.metaScore}
            top3Criticos={topPeores}
            top3Fuertes={topFuertes}
          />
        </div>
      </div>

      <footer className="mt-auto border-t border-slate-300/50 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-xs font-bold tracking-[0.2em] text-slate-600 uppercase">SALUD DIGITAL CAIMED</span>
        </div>
        <p className="text-[10px] text-slate-500 italic max-w-4xl mx-auto px-4 leading-relaxed">
          Este reporte corresponde a una evaluación digital. <strong>TODO TIENE QUE SER VALIDADO Y COMPRENDIDO POR UN MÉDICO</strong>. Por favor consulta nuestros términos y condiciones. Este es un programa de acompañamiento y <strong>NO un reemplazo ni equivale a una valoración médica</strong>.
        </p>
      </footer>
    </div>
  )
})

export default ReportPage2

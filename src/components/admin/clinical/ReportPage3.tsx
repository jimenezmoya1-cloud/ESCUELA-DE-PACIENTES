"use client"

import { forwardRef } from "react"
import { AlertTriangle, Info, Plus, X } from "lucide-react"
import HeaderSimple from "./HeaderSimple"
import type { DatosPaciente, DatosAlertas, CreatorSignature } from "@/lib/clinical/types"

interface Props {
  paciente: DatosPaciente
  alertas: DatosAlertas
  modoEdicion: boolean
  isGenerando: boolean
  creator?: CreatorSignature | null
  onAddAlerta: (tipo: "criticas" | "orientadoras") => void
  onRemoveAlerta: (tipo: "criticas" | "orientadoras", id: number) => void
  onUpdateAlerta: (tipo: "criticas" | "orientadoras", id: number, valor: string) => void
}

const PROFESSION_LABEL: Record<NonNullable<CreatorSignature["profession"]>, string> = {
  medico: "Médico/a",
  enfermero: "Enfermero/a",
  otro: "Otro",
}

function formatRegistroFecha(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const fecha = d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
  const hora = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  return `${fecha} ${hora}`
}

function SignatureBlock({ creator }: { creator: CreatorSignature | null | undefined }) {
  if (!creator) {
    return (
      <div className="mt-10 mx-auto max-w-md border-t border-slate-300/70 pt-6 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
          Evaluación de salud realizada por
        </p>
        <p className="text-sm font-semibold text-slate-700">Auto-diligenciado por el paciente</p>
      </div>
    )
  }

  const profession = creator.profession ? PROFESSION_LABEL[creator.profession] : null
  const segundaLinea = [profession, creator.specialty].filter(Boolean).join(" · ")

  return (
    <div className="mt-10 mx-auto max-w-md border-t border-slate-300/70 pt-6 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-2">
        Evaluación de salud realizada por
      </p>
      <p className="text-base font-bold text-slate-800">{creator.full_name}</p>
      {segundaLinea && <p className="text-sm text-slate-600">{segundaLinea}</p>}
      {creator.medical_registration && (
        <p className="text-sm text-slate-600">Reg. médico: {creator.medical_registration}</p>
      )}
      {creator.professional_id_card && (
        <p className="text-sm text-slate-600">Tarjeta profesional: {creator.professional_id_card}</p>
      )}
      <p className="mt-3 text-xs text-slate-500">Registro: {formatRegistroFecha(creator.created_at)}</p>
    </div>
  )
}

const ReportPage3 = forwardRef<HTMLDivElement, Props>(function ReportPage3(
  { paciente, alertas, modoEdicion, isGenerando, creator, onAddAlerta, onRemoveAlerta, onUpdateAlerta },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`${isGenerando ? "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50" : "bg-transparent"} min-h-[297mm] flex flex-col relative font-sans`}
    >
      <HeaderSimple paciente={paciente} />

      <div className="px-8 pt-10 pb-12 flex-grow flex flex-col">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-800 pb-2 mt-6">
          <AlertTriangle className="w-6 h-6 text-slate-800" />
          <h3 className="font-black text-slate-800 tracking-widest text-lg uppercase">Recomendaciones y Alertas Clínicas</h3>
        </div>

        {/* CRÍTICAS */}
        <div
          className={`mb-10 ${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl shadow-lg border border-white/80 overflow-hidden`}
        >
          <div className="bg-red-50/40 border-l-[8px] border-red-500 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-red-600 p-3 rounded-xl text-white shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-red-900 font-black uppercase text-xl tracking-wide">Alertas Críticas</h5>
                  <p className="text-red-700 text-sm font-bold opacity-80 uppercase tracking-widest">Atención Inmediata Requerida</p>
                </div>
              </div>
              {modoEdicion && (
                <button
                  onClick={() => onAddAlerta("criticas")}
                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-red-700 shadow-sm transition-all"
                >
                  <Plus className="w-5 h-5" /> AÑADIR CASO
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alertas.criticas.map((alerta) => (
                <div key={alerta.id} className="relative">
                  {modoEdicion ? (
                    <div className="relative group">
                      <textarea
                        className="w-full min-h-[120px] p-5 bg-white border border-red-200 rounded-2xl text-base text-red-900 font-bold text-center flex items-center justify-center resize-none focus:ring-2 focus:ring-red-400 outline-none shadow-sm transition-all"
                        value={alerta.accion}
                        onChange={(e) => onUpdateAlerta("criticas", alerta.id, e.target.value)}
                        placeholder="Ej: PHQ-9 Positivo"
                      />
                      <button
                        onClick={() => onRemoveAlerta("criticas", alerta.id)}
                        className="absolute -top-3 -right-3 bg-red-600 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition-colors border-2 border-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center justify-center text-center min-h-[120px]">
                      <p className="font-black text-red-900 text-lg leading-tight uppercase tracking-tight">{alerta.accion}</p>
                    </div>
                  )}
                </div>
              ))}
              {alertas.criticas.length === 0 && !modoEdicion && (
                <div className="col-span-full py-8 text-center">
                  <p className="text-red-400 font-bold text-sm italic uppercase tracking-widest">Sin alertas críticas activas para este paciente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ORIENTADORAS */}
        <div
          className={`${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl shadow-lg border border-white/80 overflow-hidden`}
        >
          <div className="bg-amber-50/40 border-l-[8px] border-amber-400 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-3 rounded-xl text-white shadow-md">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-amber-900 font-black uppercase text-xl tracking-wide">Alertas Orientadoras</h5>
                  <p className="text-amber-700 text-sm font-bold opacity-80 uppercase tracking-widest">Seguimiento y Educación</p>
                </div>
              </div>
              {modoEdicion && (
                <button
                  onClick={() => onAddAlerta("orientadoras")}
                  className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-amber-600 shadow-sm transition-all"
                >
                  <Plus className="w-5 h-5" /> AÑADIR CASO
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alertas.orientadoras.map((alerta) => (
                <div key={alerta.id} className="relative">
                  {modoEdicion ? (
                    <div className="relative group">
                      <textarea
                        className="w-full min-h-[120px] p-5 bg-white border border-amber-200 rounded-2xl text-base text-amber-900 font-bold text-center flex items-center justify-center resize-none focus:ring-2 focus:ring-amber-400 outline-none shadow-sm transition-all"
                        value={alerta.accion}
                        onChange={(e) => onUpdateAlerta("orientadoras", alerta.id, e.target.value)}
                        placeholder="Ej: Fumador actual"
                      />
                      <button
                        onClick={() => onRemoveAlerta("orientadoras", alerta.id)}
                        className="absolute -top-3 -right-3 bg-amber-500 text-white p-1.5 rounded-full shadow-md hover:bg-amber-600 transition-colors border-2 border-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-center text-center min-h-[120px]">
                      <p className="font-black text-amber-900 text-lg leading-tight uppercase tracking-tight">{alerta.accion}</p>
                    </div>
                  )}
                </div>
              ))}
              {alertas.orientadoras.length === 0 && !modoEdicion && (
                <div className="col-span-full py-8 text-center">
                  <p className="text-amber-400 font-bold text-sm italic uppercase tracking-widest">Sin alertas orientadoras para este paciente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SignatureBlock creator={creator} />

      <footer className="mt-auto border-t border-slate-300/50 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-xs font-bold tracking-[0.2em] text-slate-600 uppercase">SALUD DIGITAL CAIMED · ANEXO CLÍNICO</span>
        </div>
        <p className="text-[10px] text-slate-500 italic max-w-4xl mx-auto px-4 leading-relaxed">
          Este reporte contiene información confidencial. <strong>TODO TIENE QUE SER VALIDADO Y COMPRENDIDO POR UN MÉDICO</strong>. Por favor consulta nuestros términos y condiciones. Este es un programa de acompañamiento y <strong>NO un reemplazo ni equivale a una valoración médica</strong>.
        </p>
      </footer>
    </div>
  )
})

export default ReportPage3

"use client"

import { forwardRef } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Target, AlertTriangle, BarChart as BarChartIcon, TrendingUp, ThumbsUp, ExternalLink } from "lucide-react"
import HeaderComponent from "./HeaderComponent"
import type { DatosPaciente, ComponenteScore } from "@/lib/clinical/types"

interface Props {
  paciente: DatosPaciente
  setPaciente: React.Dispatch<React.SetStateAction<DatosPaciente>>
  componentes: ComponenteScore[]
  modoEdicion: boolean
  edadCalculada: number
  isSCA: boolean
  setIsSCA: React.Dispatch<React.SetStateAction<boolean>>
  isDM2: boolean
  setIsDM2: React.Dispatch<React.SetStateAction<boolean>>
  isPluripatologico: boolean
  setIsPluripatologico: React.Dispatch<React.SetStateAction<boolean>>
  isPocaExpectativa: boolean
  setIsPocaExpectativa: React.Dispatch<React.SetStateAction<boolean>>
  isGenerando: boolean
  onScoreChange: (nombre: string, valor: string) => void
}

const getBarColor = (score: number): string => {
  if (score >= 80) return "#22c55e"
  if (score >= 50) return "#eab308"
  return "#ef4444"
}

const ReportPage1 = forwardRef<HTMLDivElement, Props>(function ReportPage1(props, ref) {
  const { paciente, setPaciente, componentes, modoEdicion, isGenerando, onScoreChange } = props

  const componentesOrdenados = [...componentes].sort((a, b) => b.puntaje - a.puntaje)
  const topPeores = [...componentesOrdenados].reverse().slice(0, 3)

  const dataProgreso: Array<{ etapa: string; score: number }> = [
    ...(paciente.evaluacionInicial !== "-" && !isNaN(parseInt(paciente.evaluacionInicial))
      ? [{ etapa: "Inicial", score: Math.max(0, Math.min(100, parseInt(paciente.evaluacionInicial))) }]
      : []),
    { etapa: "Actual", score: paciente.scoreGlobal },
    { etapa: "Meta", score: paciente.metaScore },
  ]

  const getMensajeFeedback = (): string => {
    const inicialStr = paciente.evaluacionInicial
    const actual = paciente.scoreGlobal
    if (inicialStr === "-" || inicialStr === "")
      return "¡Bienvenido a CAIMED Cardiopreventiva! Hoy comienzas el camino más importante: el de cuidar tu corazón."
    const inicial = parseInt(inicialStr)
    if (isNaN(inicial)) return ""
    if (actual > inicial) return "¡Felicitaciones! Tu progreso refleja una mejora continua en tu salud cardiometabólica."
    return "Tu progreso actual indica que necesitamos revisar y ajustar tus hábitos para impulsar tu salud cardiometabólica."
  }

  return (
    <div
      ref={ref}
      className={`${isGenerando ? "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50" : "bg-transparent"} min-h-[297mm] flex flex-col relative`}
    >
      <HeaderComponent
        paciente={paciente}
        setPaciente={setPaciente}
        modoEdicion={modoEdicion}
        edadCalculada={props.edadCalculada}
        isSCA={props.isSCA}
        setIsSCA={props.setIsSCA}
        isDM2={props.isDM2}
        setIsDM2={props.setIsDM2}
        isPluripatologico={props.isPluripatologico}
        setIsPluripatologico={props.setIsPluripatologico}
        isPocaExpectativa={props.isPocaExpectativa}
        setIsPocaExpectativa={props.setIsPocaExpectativa}
      />

      <div className="px-8 pt-10 pb-12 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 flex-grow">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">

          {/* CAIMED SCORE CARD */}
          <div className={`${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl border border-white/80 shadow-lg p-6 flex flex-col items-center`}>
            <div className="flex items-center gap-2 mb-6 w-full border-b border-slate-200 pb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-800 tracking-widest text-sm uppercase">CAIMED SCORE</h3>
            </div>

            <div className="relative w-48 h-24 mx-auto overflow-hidden mb-4">
              <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[24px] border-slate-100 box-border"></div>
              <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[24px] border-transparent box-border transition-all duration-1000 ease-out"
                style={{ borderTopColor: getBarColor(paciente.scoreGlobal), borderRightColor: getBarColor(paciente.scoreGlobal), transform: `rotate(${135 + (paciente.scoreGlobal * 1.8)}deg)` }}></div>
            </div>

            <div className="relative z-20 -mt-8 mb-4 text-center">
              <span className="text-6xl font-black text-slate-900 tracking-tighter relative block">
                {paciente.scoreGlobal}<span className="text-slate-300 text-3xl ml-1 font-light">/100</span>
              </span>
              <div className="mt-4">
                <span className="text-xs font-bold uppercase px-6 py-1.5 rounded-full tracking-widest border"
                  style={{ color: getBarColor(paciente.scoreGlobal), borderColor: getBarColor(paciente.scoreGlobal) }}>
                  {paciente.nivel}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 w-full text-center mb-6">
              <p className="text-sm italic text-slate-600 font-medium leading-relaxed">
                &quot;Tu perfil muestra señales tempranas que pueden estar afectando tu salud cardiovascular.&quot;
              </p>
            </div>

            <div className="w-full bg-blue-600 text-white rounded-xl p-4 text-center shadow-md">
              <div className="flex items-center justify-center gap-2 mb-1 opacity-90">
                <Target className="w-4 h-4" />
                <span className="text-xs uppercase font-bold tracking-widest">Meta de Protección</span>
              </div>
              <div className="text-3xl font-black">
                {paciente.metaScore}<span className="text-lg font-medium opacity-70 ml-1">/100</span>
              </div>
            </div>
          </div>

          {/* COMPONENTES CLAVE A TRABAJAR */}
          <div className={`${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl border border-white/80 shadow-lg p-6 flex-grow`}>
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-800 tracking-widest text-sm uppercase">Componentes Clave a Trabajar</h3>
            </div>
            <div className="flex flex-col gap-4">
              {topPeores.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <span className="text-amber-600 font-bold text-sm">{idx + 1}</span>
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-slate-800">{comp.nombre}</h4>
                    <div className="w-full h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${comp.puntaje}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-slate-900">{comp.puntaje}</span>
                    <span className="text-xs text-slate-500 ml-1">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FEEDBACK BOX */}
          <div className={`${isGenerando ? "bg-emerald-50" : "bg-emerald-50/70 backdrop-blur-md"} border border-emerald-500/30 rounded-2xl p-6 flex items-center gap-4 shadow-lg`}>
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-md">
              <ThumbsUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-emerald-900 font-bold text-lg leading-tight">
              {getMensajeFeedback()}
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-8">

          {/* PERFIL DE SALUD DETALLADO */}
          <div>
            <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
              <BarChartIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-slate-800 tracking-widest text-sm uppercase">PERFIL DE SALUD DETALLADO</h3>
            </div>

            <div className="flex flex-col gap-5">
              {componentesOrdenados.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-1/3 text-right">
                    <span className="text-sm font-bold text-slate-700">{comp.nombre}</span>
                  </div>
                  <div className="w-2/3 flex items-center gap-4">
                    <div className="flex-grow h-6 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${comp.puntaje}%`,
                          backgroundColor: getBarColor(comp.puntaje)
                        }}
                      ></div>
                    </div>
                    <div className="w-10 text-right">
                      <span className="font-black text-slate-900 text-lg">
                        {comp.puntaje}
                      </span>
                    </div>
                    {modoEdicion && (
                      <div className="w-20">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={comp.valor}
                          onChange={(e) => onScoreChange(comp.nombre, e.target.value)}
                          className="w-full text-center bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Valor"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EVOLUCIÓN CARD */}
          <div className={`${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl border border-white/80 shadow-lg p-6 flex flex-col items-center text-center relative overflow-hidden flex-grow`}>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Evolución de Salud</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Sigue tu progreso hacia tu meta de protección cardiovascular.
            </p>

            <div className="h-[180px] w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataProgreso} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis dataKey="etapa" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} dy={5} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#1e293b", fontSize: "12px" }} itemStyle={{ color: "#2563eb" }} />
                  <ReferenceLine y={paciente.metaScore} stroke="#2563eb" strokeDasharray="3 3" opacity={0.5} />
                  <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#2563eb" }} activeDot={{ r: 6, strokeWidth: 0 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <a href="https://pagina-caimeddd.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-auto">
              CONSULTA PLANES DE SALUD... <ExternalLink className="w-4 h-4" />
            </a>
          </div>

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

export default ReportPage1

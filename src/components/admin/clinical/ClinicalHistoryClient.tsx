"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Edit2, Download, Save, X } from "lucide-react"
import ReportPage1 from "./ReportPage1"
import ReportPage2 from "./ReportPage2"
import ReportPage3 from "./ReportPage3"
import { calcularEdad, recomputeAssessment } from "@/lib/clinical/scoring"
import { saveAssessment } from "@/lib/clinical/actions"
import { SCORES_INICIALES, ALERTAS_INICIALES, DATOS_INICIALES_PACIENTE } from "@/lib/clinical/constants"
import type { DatosPaciente, ComponenteScore, DatosAlertas, AlertaItem } from "@/lib/clinical/types"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

interface Props {
  userId: string
  initialAssessment: PatientAssessment | null
  clinicalProfile: PatientClinicalProfile | null
  evaluacionInicialScore: number | null
  initialMode?: "view" | "edit"
}

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>
    jspdf?: { jsPDF: new (orient: string, unit: string, format: string) => unknown }
  }
}

export default function ClinicalHistoryClient({
  userId,
  initialAssessment,
  clinicalProfile,
  evaluacionInicialScore,
  initialMode = "view",
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modoEdicion, setModoEdicion] = useState(initialMode === "edit")
  const [isGenerando, setIsGenerando] = useState(false)
  const page1Ref = useRef<HTMLDivElement>(null)
  const page2Ref = useRef<HTMLDivElement>(null)
  const page3Ref = useRef<HTMLDivElement>(null)

  const buildPaciente = (): DatosPaciente => ({
    ...DATOS_INICIALES_PACIENTE,
    nombre: [clinicalProfile?.primer_nombre, clinicalProfile?.primer_apellido].filter(Boolean).join(" ").trim(),
    primerNombre: clinicalProfile?.primer_nombre ?? "",
    segundoNombre: clinicalProfile?.segundo_nombre ?? "",
    primerApellido: clinicalProfile?.primer_apellido ?? "",
    segundoApellido: clinicalProfile?.segundo_apellido ?? "",
    documento: clinicalProfile?.documento ?? "",
    tipoDocumento: clinicalProfile?.tipo_documento ?? "CC",
    fechaNacimiento: clinicalProfile?.fecha_nacimiento
      ? (() => {
          const d = new Date(clinicalProfile.fecha_nacimiento!)
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        })()
      : "",
    sexo: clinicalProfile?.sexo ?? "",
    genero: clinicalProfile?.genero ?? "",
    telefono: clinicalProfile?.telefono ?? "",
    correo: clinicalProfile?.correo ?? "",
    regimenAfiliacion: clinicalProfile?.regimen_afiliacion ?? "",
    aseguradora: clinicalProfile?.aseguradora ?? "",
    prepagada: clinicalProfile?.prepagada ?? "No",
    planComplementario: clinicalProfile?.plan_complementario ?? "No",
    paisNacimiento: clinicalProfile?.pais_nacimiento ?? "Colombia",
    paisResidencia: clinicalProfile?.pais_residencia ?? "Colombia",
    departamentoResidencia: clinicalProfile?.departamento_residencia ?? "",
    municipioResidencia: clinicalProfile?.municipio_residencia ?? "",
    direccionResidencia: clinicalProfile?.direccion_residencia ?? "",
    contactoEmergenciaNombre: clinicalProfile?.contacto_emergencia_nombre ?? "",
    contactoEmergenciaParentesco: clinicalProfile?.contacto_emergencia_parentesco ?? "",
    contactoEmergenciaTelefono: clinicalProfile?.contacto_emergencia_telefono ?? "",
    scoreGlobal: initialAssessment?.score_global ?? 0,
    metaScore: initialAssessment?.meta_score ?? 0,
    nivel: initialAssessment?.nivel ?? "Rojo",
    fechaReporte: initialAssessment ? new Date(initialAssessment.created_at).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO"),
    evaluacionInicial: evaluacionInicialScore !== null ? String(evaluacionInicialScore) : "-",
  })

  const [paciente, setPaciente] = useState<DatosPaciente>(buildPaciente())
  const [componentes, setComponentes] = useState<ComponenteScore[]>(initialAssessment?.components ?? SCORES_INICIALES)
  const [alertas, setAlertas] = useState<DatosAlertas>(
    initialAssessment
      ? { criticas: initialAssessment.alertas_criticas, orientadoras: initialAssessment.alertas_orientadoras }
      : ALERTAS_INICIALES,
  )
  const [isSCA, setIsSCA] = useState(initialAssessment?.is_sca ?? false)
  const [isDM2, setIsDM2] = useState(initialAssessment?.is_dm2 ?? false)
  const [isPluripatologico, setIsPluripatologico] = useState(initialAssessment?.is_pluripatologico ?? false)
  const [isPocaExpectativa, setIsPocaExpectativa] = useState(initialAssessment?.is_poca_expectativa ?? false)
  const [edadCalculada, setEdadCalculada] = useState(0)

  useEffect(() => {
    setEdadCalculada(calcularEdad(paciente.fechaNacimiento))
  }, [paciente.fechaNacimiento])

  const valoresKey = componentes.map((c) => c.valor).join("|")

  useEffect(() => {
    const result = recomputeAssessment(componentes, {
      isSCA,
      isDM2,
      isPluripatologico,
      isPocaExpectativa,
      edad: edadCalculada,
    })
    setComponentes(result.components)
    setPaciente((prev) => ({ ...prev, scoreGlobal: result.scoreGlobal, nivel: result.nivel, metaScore: result.metaScore }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSCA, isDM2, isPluripatologico, isPocaExpectativa, edadCalculada, valoresKey])

  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const script = document.createElement("script")
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = (err) => reject(err)
        document.body.appendChild(script)
      })
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
    ]).catch((err) => console.error("Error cargando librerías de PDF", err))
  }, [])

  const handleScoreChange = (nombre: string, nuevoValor: string) => {
    setComponentes((prev) => prev.map((c) => (c.nombre === nombre ? { ...c, valor: nuevoValor } : c)))
  }

  const handleAddAlerta = (tipo: "criticas" | "orientadoras") => {
    const nuevaAlerta: AlertaItem = { id: Date.now(), marcador: "", accion: "" }
    setAlertas((prev) => ({ ...prev, [tipo]: [...prev[tipo], nuevaAlerta] }))
  }
  const handleRemoveAlerta = (tipo: "criticas" | "orientadoras", id: number) =>
    setAlertas((prev) => ({ ...prev, [tipo]: prev[tipo].filter((a) => a.id !== id) }))
  const handleUpdateAlerta = (tipo: "criticas" | "orientadoras", id: number, valor: string) =>
    setAlertas((prev) => ({ ...prev, [tipo]: prev[tipo].map((a) => (a.id === id ? { ...a, accion: valor } : a)) }))

  const handleSavePDF = async () => {
    if (!window.html2canvas || !window.jspdf) return
    setIsGenerando(true)
    await new Promise((r) => setTimeout(r, 150))
    try {
      const { jsPDF } = window.jspdf as { jsPDF: new (o: string, u: string, f: string) => unknown }
      const pdf = new jsPDF("p", "mm", "a4") as {
        internal: { pageSize: { getWidth: () => number } }
        addPage: () => void
        addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void
        getImageProperties: (d: string) => { width: number; height: number }
        save: (name: string) => void
      }
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const refs = [page1Ref, page2Ref, page3Ref]
      let firstPage = true
      for (const ref of refs) {
        if (ref.current) {
          if (!firstPage) pdf.addPage()
          const canvas = await window.html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
          const imgData = canvas.toDataURL("image/png")
          const imgProps = pdf.getImageProperties(imgData)
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight)
          firstPage = false
        }
      }
      const safeName = (paciente.nombre || "paciente").replace(/[^a-z0-9]/gi, "_").toLowerCase()
      pdf.save(`Reporte_CAIMED_${safeName}.pdf`)
    } catch (err) {
      console.error(err)
      alert("No se pudo generar el PDF en este dispositivo. Inténtalo desde un computador.")
    } finally {
      setIsGenerando(false)
    }
  }

  const handleSaveAssessment = () => {
    startTransition(async () => {
      try {
        await saveAssessment({
          user_id: userId,
          components: componentes,
          is_sca: isSCA,
          is_dm2: isDM2,
          is_pluripatologico: isPluripatologico,
          is_poca_expectativa: isPocaExpectativa,
          alertas_criticas: alertas.criticas,
          alertas_orientadoras: alertas.orientadoras,
        })
        setModoEdicion(false)
        router.refresh()
      } catch (err) {
        alert(`No se pudo guardar: ${(err as Error).message}`)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      <div className="w-full max-w-[1000px] mb-6 flex flex-wrap justify-end items-center gap-3 print:hidden">
        <button
          onClick={handleSavePDF}
          disabled={isGenerando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-sm font-bold shadow-sm disabled:opacity-50"
        >
          {isGenerando ? "Generando…" : (<><Download className="w-4 h-4" /> Exportar PDF</>)}
        </button>
        {modoEdicion ? (
          <>
            <button
              onClick={() => setModoEdicion(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-sm font-bold shadow-sm"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSaveAssessment}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isPending ? "Guardando…" : "Guardar como nueva evaluación"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setModoEdicion(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-sm font-bold shadow-sm"
          >
            <Edit2 className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      <div
        className={`w-full max-w-[1000px] shadow-2xl rounded-2xl overflow-hidden ${isGenerando ? "bg-white" : "bg-white/40 backdrop-blur-2xl"} border border-white/60 font-sans`}
      >
        <ReportPage1
          ref={page1Ref}
          paciente={paciente}
          setPaciente={setPaciente}
          componentes={componentes}
          modoEdicion={modoEdicion}
          edadCalculada={edadCalculada}
          isSCA={isSCA}
          setIsSCA={setIsSCA}
          isDM2={isDM2}
          setIsDM2={setIsDM2}
          isPluripatologico={isPluripatologico}
          setIsPluripatologico={setIsPluripatologico}
          isPocaExpectativa={isPocaExpectativa}
          setIsPocaExpectativa={setIsPocaExpectativa}
          isGenerando={isGenerando}
          onScoreChange={handleScoreChange}
        />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage2 ref={page2Ref} paciente={paciente} componentes={componentes} isGenerando={isGenerando} />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage3
          ref={page3Ref}
          paciente={paciente}
          alertas={alertas}
          modoEdicion={modoEdicion}
          isGenerando={isGenerando}
          onAddAlerta={handleAddAlerta}
          onRemoveAlerta={handleRemoveAlerta}
          onUpdateAlerta={handleUpdateAlerta}
        />
      </div>
    </div>
  )
}

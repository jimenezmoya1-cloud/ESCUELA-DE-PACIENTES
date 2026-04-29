"use client"

import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import ReportPage1 from "@/components/admin/clinical/ReportPage1"
import ReportPage2 from "@/components/admin/clinical/ReportPage2"
import ReportPage3 from "@/components/admin/clinical/ReportPage3"
import { calcularEdad } from "@/lib/clinical/scoring"
import { DATOS_INICIALES_PACIENTE } from "@/lib/clinical/constants"
import type { DatosPaciente } from "@/lib/clinical/types"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

interface Props {
  assessment: PatientAssessment
  profile: PatientClinicalProfile | null
  evaluacionInicialScore: number | null
}


export default function PatientReportView({ assessment, profile, evaluacionInicialScore }: Props) {
  const page1Ref = useRef<HTMLDivElement>(null)
  const page2Ref = useRef<HTMLDivElement>(null)
  const page3Ref = useRef<HTMLDivElement>(null)
  const [isGenerando, setIsGenerando] = useState(false)

  const fechaNacStr = profile?.fecha_nacimiento
    ? (() => {
        const d = new Date(profile.fecha_nacimiento!)
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      })()
    : ""
  const edadCalculada = calcularEdad(fechaNacStr)

  const paciente: DatosPaciente = {
    ...DATOS_INICIALES_PACIENTE,
    nombre: [profile?.primer_nombre, profile?.primer_apellido].filter(Boolean).join(" ").trim(),
    primerNombre: profile?.primer_nombre ?? "",
    primerApellido: profile?.primer_apellido ?? "",
    documento: profile?.documento ?? "",
    tipoDocumento: profile?.tipo_documento ?? "CC",
    fechaNacimiento: fechaNacStr,
    sexo: profile?.sexo ?? "",
    genero: profile?.genero ?? "",
    scoreGlobal: assessment.score_global,
    metaScore: assessment.meta_score,
    nivel: assessment.nivel,
    fechaReporte: new Date(assessment.created_at).toLocaleDateString("es-CO"),
    evaluacionInicial: evaluacionInicialScore !== null ? String(evaluacionInicialScore) : "-",
  }

  const handleSavePDF = async () => {
    setIsGenerando(true)
    await new Promise((r) => setTimeout(r, 150))
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ])
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const refs = [page1Ref, page2Ref, page3Ref]
      let firstPage = true
      for (const ref of refs) {
        if (ref.current) {
          if (!firstPage) pdf.addPage()
          const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
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

  const noop = () => {}
  const noopState = () => {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      <div className="w-full max-w-[1000px] mb-6 flex justify-end print:hidden">
        <button
          onClick={handleSavePDF}
          disabled={isGenerando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> {isGenerando ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

      <div
        className={`w-full max-w-[1000px] shadow-2xl rounded-2xl overflow-hidden ${isGenerando ? "bg-white" : "bg-white/40 backdrop-blur-2xl"} border border-white/60 font-sans`}
      >
        <ReportPage1
          ref={page1Ref}
          paciente={paciente}
          setPaciente={noopState as React.Dispatch<React.SetStateAction<DatosPaciente>>}
          componentes={assessment.components}
          modoEdicion={false}
          edadCalculada={edadCalculada}
          isSCA={assessment.is_sca}
          setIsSCA={noopState as React.Dispatch<React.SetStateAction<boolean>>}
          isDM2={assessment.is_dm2}
          setIsDM2={noopState as React.Dispatch<React.SetStateAction<boolean>>}
          isPluripatologico={assessment.is_pluripatologico}
          setIsPluripatologico={noopState as React.Dispatch<React.SetStateAction<boolean>>}
          isPocaExpectativa={assessment.is_poca_expectativa}
          setIsPocaExpectativa={noopState as React.Dispatch<React.SetStateAction<boolean>>}
          isGenerando={isGenerando}
          onScoreChange={noop}
        />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage2 ref={page2Ref} paciente={paciente} componentes={assessment.components} isGenerando={isGenerando} />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage3
          ref={page3Ref}
          paciente={paciente}
          alertas={{ criticas: assessment.alertas_criticas, orientadoras: assessment.alertas_orientadoras }}
          modoEdicion={false}
          isGenerando={isGenerando}
          onAddAlerta={noop}
          onRemoveAlerta={noop}
          onUpdateAlerta={noop}
        />
      </div>
    </div>
  )
}

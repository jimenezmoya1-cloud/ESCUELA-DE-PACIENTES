"use client"

import dynamic from "next/dynamic"

const PatientReportView = dynamic(() => import("./PatientReportView"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
      Cargando reporte…
    </div>
  ),
})

export default PatientReportView

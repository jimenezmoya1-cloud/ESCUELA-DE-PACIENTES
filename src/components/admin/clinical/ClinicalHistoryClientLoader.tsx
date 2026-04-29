"use client"

import dynamic from "next/dynamic"

const ClinicalHistoryClient = dynamic(() => import("./ClinicalHistoryClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
      Cargando reporte…
    </div>
  ),
})

export default ClinicalHistoryClient

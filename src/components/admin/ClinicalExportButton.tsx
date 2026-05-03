"use client"

import { useState } from "react"

type ConvenioOption = { code: string; name: string }
type StaffOption = { id: string; name: string }

interface Props {
  convenios: ConvenioOption[]
  staff: StaffOption[]
}

export default function ClinicalExportButton({ convenios, staff }: Props) {
  const [open, setOpen] = useState(false)
  const [convenio, setConvenio] = useState("todos")
  const [doctor, setDoctor] = useState("todos")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  function buildHref(): string {
    const params = new URLSearchParams()
    if (convenio !== "todos") params.set("convenio", convenio)
    if (doctor !== "todos") params.set("doctor", doctor)
    if (startDate) params.set("startDate", new Date(startDate).toISOString())
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      params.set("endDate", end.toISOString())
    }
    const qs = params.toString()
    return `/api/admin/export-clinical-excel${qs ? `?${qs}` : ""}`
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Exportar evaluaciones de salud
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-tertiary/15 bg-white p-4 shadow-sm w-full">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral">Exportar evaluaciones de salud</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-tertiary hover:text-neutral">
          Cerrar
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Convenio</span>
          <select
            value={convenio}
            onChange={(e) => setConvenio(e.target.value)}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            {convenios.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Médico responsable</span>
          <select
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Desde</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Hasta</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <a
          href={buildHref()}
          download="caimed-evaluaciones.xlsx"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Descargar
        </a>
      </div>
    </div>
  )
}

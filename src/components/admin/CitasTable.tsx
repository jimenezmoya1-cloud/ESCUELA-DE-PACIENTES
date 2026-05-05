"use client"

import { useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import { appointmentsToCsv } from "@/lib/scheduling/csv"
import CitaDrawerAdmin from "./CitaDrawerAdmin"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

export default function CitasTable({ rows }: { rows: AppointmentWithJoin[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)
  const [search, setSearch] = useState(params.get("buscar") ?? "")

  function applySearch() {
    const next = new URLSearchParams(params.toString())
    if (search) next.set("buscar", search)
    else next.delete("buscar")
    router.push(`${pathname}?${next.toString()}`)
  }

  function downloadCsv() {
    const csv = appointmentsToCsv(rows)
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `citas-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm w-72"
          />
          <button
            type="button"
            onClick={applySearch}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Buscar
          </button>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm font-medium text-neutral hover:bg-background disabled:opacity-50"
        >
          ⬇ Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tertiary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Fecha y hora</th>
              <th className="px-4 py-3 text-left font-medium">Paciente</th>
              <th className="px-4 py-3 text-left font-medium">Clínico</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Crédito</th>
              <th className="px-4 py-3 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-tertiary">Sin citas que coincidan.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-tertiary/10 hover:bg-background/50">
                  <td className="px-4 py-3 text-neutral capitalize whitespace-nowrap">
                    {formatHumanDateTimeBogota(r.starts_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral">{r.patient_name}</div>
                    <div className="text-xs text-tertiary">{r.patient_email}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral">{r.clinician_name}</td>
                  <td className="px-4 py-3 text-neutral">{STATUS_LABEL[r.status]}</td>
                  <td className="px-4 py-3 text-tertiary text-xs">
                    {r.credit_returned ? "Devuelto" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CitaDrawerAdmin
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={() => router.refresh()}
      />
    </div>
  )
}

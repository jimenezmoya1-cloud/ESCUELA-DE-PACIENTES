"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"

interface ClinicianOption {
  id: string
  name: string
}

interface Props {
  clinicians: ClinicianOption[]
}

export default function CitasFilters({ clinicians }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-tertiary/10 bg-white p-4">
      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Clínico</span>
        <select
          value={params.get("clinico") ?? ""}
          onChange={(e) => update("clinico", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {clinicians.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Estado</span>
        <select
          value={params.get("estado") ?? ""}
          onChange={(e) => update("estado", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="scheduled">Programada</option>
          <option value="completed">Completada</option>
          <option value="cancelled">Cancelada</option>
          <option value="no_show">No asistió</option>
        </select>
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Desde</span>
        <input
          type="date"
          value={params.get("desde") ?? ""}
          onChange={(e) => update("desde", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-medium text-tertiary mb-1">Hasta</span>
        <input
          type="date"
          value={params.get("hasta") ?? ""}
          onChange={(e) => update("hasta", e.target.value || null)}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
        />
      </label>

      {(params.toString() && (
        <button
          type="button"
          onClick={() => startTransition(() => router.push(pathname))}
          className="rounded-lg border border-tertiary/20 px-3 py-2 text-xs font-medium text-tertiary hover:bg-background"
        >
          Limpiar filtros
        </button>
      ))}

      {pending && <span className="text-xs text-tertiary">Aplicando...</span>}
    </div>
  )
}

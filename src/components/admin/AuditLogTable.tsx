"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

export interface AuditRow {
  id: string
  actor_id: string | null
  actor_name: string
  actor_email: string | null
  action: string
  target_type: string
  target_id: string
  metadata: any
  created_at: string
}

const ACTION_LABEL: Record<string, string> = {
  manual_payment: "Pago manual registrado",
  adjust_credit: "Ajuste de créditos",
  patient_booked_appointment: "Paciente agendó cita",
  admin_create_manual_appointment: "Admin creó cita manual",
  admin_cancel_appointment: "Admin canceló cita",
  admin_mark_completed: "Cita marcada completada",
  admin_mark_no_show: "Cita marcada no-show",
  admin_reschedule_appointment: "Admin reagendó cita",
  admin_reassign_clinician: "Admin reasignó clínico",
  admin_deactivate_clinician: "Admin desactivó clínico",
  clinician_auto_reassigned: "Sistema reasignó cita (auto)",
  clinician_orphaned_appointment: "Cita huérfana (clínico inactivo)",
}

const TARGET_LABEL: Record<string, string> = {
  appointment: "Cita",
  payment: "Pago",
  evaluation_credit: "Crédito",
  user: "Usuario",
}

interface Props {
  rows: AuditRow[]
  totalCount: number
  page: number
  pageSize: number
}

export default function AuditLogTable({ rows, totalCount, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  function gotoPage(p: number) {
    const next = new URLSearchParams(params.toString())
    next.set("page", String(p))
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-xl border border-tertiary/10 bg-white p-4">
        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Acción</span>
          <select
            value={params.get("action") ?? ""}
            onChange={(e) => setFilter("action", e.target.value || null)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {Object.keys(ACTION_LABEL).map((k) => (
              <option key={k} value={k}>{ACTION_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Tipo de objeto</span>
          <select
            value={params.get("target_type") ?? ""}
            onChange={(e) => setFilter("target_type", e.target.value || null)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.keys(TARGET_LABEL).map((k) => (
              <option key={k} value={k}>{TARGET_LABEL[k]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tertiary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cuándo</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Acción</th>
              <th className="px-4 py-3 text-left font-medium">Objeto</th>
              <th className="px-4 py-3 text-left font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-tertiary">
                  Sin entradas.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-tertiary/10">
                  <td className="px-4 py-3 text-neutral whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("es-CO", {
                      timeZone: "America/Bogota",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral">{r.actor_name}</div>
                    {r.actor_email && (
                      <div className="text-xs text-tertiary">{r.actor_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-neutral">
                    {ACTION_LABEL[r.action] ?? r.action}
                  </td>
                  <td className="px-4 py-3 text-neutral">
                    <div>{TARGET_LABEL[r.target_type] ?? r.target_type}</div>
                    <div className="text-xs text-tertiary font-mono">
                      {r.target_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-4 py-3 text-tertiary text-xs max-w-md">
                    <pre className="whitespace-pre-wrap break-words font-mono text-[10px]">
                      {JSON.stringify(r.metadata, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary">
            Página {page} de {totalPages} · {totalCount} entradas
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => gotoPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => gotoPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

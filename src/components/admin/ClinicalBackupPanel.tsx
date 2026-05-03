"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export interface BackupLogRow {
  id: string
  triggered_at: string
  triggered_by: "cron" | "manual"
  status: "ok" | "error"
  file_url: string | null
  rows_exported: number | null
  error_message: string | null
  duration_ms: number | null
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Props {
  initialLogs: BackupLogRow[]
  isAdmin: boolean
}

export default function ClinicalBackupPanel({ initialLogs, isAdmin }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  function handleForceBackup() {
    setFeedback(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/clinical-backup-now", { method: "POST" })
        const json = await res.json()
        if (!res.ok) {
          setFeedback({ kind: "error", text: json.error ?? "Backup falló" })
          return
        }
        setFeedback({
          kind: "ok",
          text: `Backup subido (${json.rowsExported} filas, ${Math.round(json.durationMs / 1000)}s).`,
        })
        router.refresh()
      } catch (err) {
        setFeedback({ kind: "error", text: (err as Error).message })
      }
    })
  }

  return (
    <div className="rounded-xl border border-tertiary/15 bg-white p-4 shadow-sm w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral">Backup automático a Drive</h3>
          <p className="text-xs text-tertiary">
            Cada noche a las 02:00 (hora Colombia) sube el Excel completo a la carpeta corporativa.
            Retención: últimos 90 días.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleForceBackup}
            disabled={pending}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
          >
            {pending ? "Subiendo…" : "Forzar backup ahora"}
          </button>
        )}
      </div>

      {feedback && (
        <p
          className={`mb-3 text-sm ${
            feedback.kind === "ok" ? "text-success" : "text-error"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-tertiary/10">
        <table className="w-full text-sm">
          <thead className="bg-background/60 text-left text-xs uppercase tracking-wide text-tertiary">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Filas</th>
              <th className="px-3 py-2">Duración</th>
              <th className="px-3 py-2">Archivo / Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tertiary/10">
            {initialLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-tertiary">
                  Aún no hay backups registrados.
                </td>
              </tr>
            ) : (
              initialLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(l.triggered_at)}</td>
                  <td className="px-3 py-2 capitalize">{l.triggered_by}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        l.status === "ok"
                          ? "bg-success/10 text-success"
                          : "bg-error/10 text-error"
                      }`}
                    >
                      {l.status === "ok" ? "OK" : "Error"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{l.rows_exported ?? "—"}</td>
                  <td className="px-3 py-2">{l.duration_ms ? `${Math.round(l.duration_ms / 1000)}s` : "—"}</td>
                  <td className="px-3 py-2">
                    {l.status === "ok" && l.file_url ? (
                      <a
                        href={l.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Abrir en Drive
                      </a>
                    ) : (
                      <span className="text-error text-xs">{l.error_message ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

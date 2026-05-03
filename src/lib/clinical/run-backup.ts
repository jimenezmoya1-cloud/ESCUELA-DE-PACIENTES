import { createAdminClient } from "@/lib/supabase/admin"
import { buildClinicalExcel, todayStamp } from "./build-clinical-excel"
import { uploadClinicalBackup, cleanupOldBackups } from "./drive-backup"

const RETENTION_DAYS = 90

export interface BackupResult {
  ok: boolean
  fileId?: string
  fileUrl?: string
  rowsExported: number
  durationMs: number
  errorMessage?: string
}

/**
 * Genera el Excel sin filtros y lo sube a Drive corporativo, luego registra
 * el resultado en backup_logs y limpia archivos viejos según retención.
 * Diseñado para ser invocado tanto por el cron como por el botón manual.
 */
export async function runClinicalBackup(triggeredBy: "cron" | "manual"): Promise<BackupResult> {
  const startedAt = Date.now()
  const supabase = createAdminClient() // bypassa RLS — necesitamos ver todo

  let rowsExported = 0
  let fileId: string | undefined
  let fileUrl: string | undefined
  let errorMessage: string | undefined
  let ok = false

  try {
    const result = await buildClinicalExcel(supabase, {})
    rowsExported = result.rowsExported

    const filename = `caimed-clinico-backup-${todayStamp()}.xlsx`
    const upload = await uploadClinicalBackup({ buffer: result.buffer, filename })
    fileId = upload.fileId
    fileUrl = upload.webViewLink

    // Limpieza best-effort. Si falla no marcamos el backup como error.
    try {
      const deleted = await cleanupOldBackups(RETENTION_DAYS)
      if (deleted > 0) console.log(`[run-backup] Limpieza: ${deleted} archivos viejos eliminados`)
    } catch (cleanupErr) {
      console.error("[run-backup] Limpieza falló (no crítico):", cleanupErr)
    }

    ok = true
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err)
    console.error("[run-backup] Falló:", err)
  }

  const durationMs = Date.now() - startedAt

  // Persistir log (best-effort)
  await supabase.from("backup_logs").insert({
    triggered_by: triggeredBy,
    status: ok ? "ok" : "error",
    file_url: fileUrl ?? null,
    file_id: fileId ?? null,
    rows_exported: rowsExported,
    error_message: errorMessage ?? null,
    duration_ms: durationMs,
  })

  return { ok, fileId, fileUrl, rowsExported, durationMs, errorMessage }
}

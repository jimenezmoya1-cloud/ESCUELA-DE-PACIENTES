import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runClinicalBackup } from "@/lib/clinical/run-backup"

// Endpoint para el botón "Forzar backup ahora" del panel admin.
// Solo admin puede invocarlo (no clinico) — la decisión de cuándo
// generar un backup ad-hoc es operativa, no clínica.

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()
  if (!profile?.is_active || profile.role !== "admin") {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 })
  }

  const result = await runClinicalBackup("manual")
  if (!result.ok) {
    return NextResponse.json({ error: result.errorMessage ?? "Backup falló" }, { status: 500 })
  }
  return NextResponse.json({
    ok: true,
    fileUrl: result.fileUrl,
    rowsExported: result.rowsExported,
    durationMs: result.durationMs,
  })
}

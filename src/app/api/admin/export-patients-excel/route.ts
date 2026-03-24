import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const convenioFilter = searchParams.get("convenio")

  let patientQuery = supabase
    .from("users")
    .select("id, name, email, cedula, convenio_code, registered_at, last_login_at, is_active, access_code_used, total_points")
    .eq("role", "patient")
    .order("registered_at", { ascending: false })

  if (convenioFilter && convenioFilter !== "todos") {
    patientQuery = patientQuery.eq("convenio_code", convenioFilter)
  }

  const [{ data: patients }, { data: modules }, { data: allCompletions }] = await Promise.all([
    patientQuery,
    supabase.from("modules").select("id, title, order").eq("is_published", true).order("order"),
    supabase.from("module_completions").select("user_id, module_id, completed_at"),
  ])

  if (!patients) return NextResponse.json({ error: "Sin datos" }, { status: 500 })

  // Mapa de completaciones por usuario
  const completionMap = new Map<string, Map<string, string>>()
  allCompletions?.forEach((c) => {
    if (!completionMap.has(c.user_id)) completionMap.set(c.user_id, new Map())
    completionMap.get(c.user_id)!.set(
      c.module_id,
      new Date(c.completed_at).toLocaleDateString("es-CO")
    )
  })

  // Hoja 1: Resumen de pacientes
  const summaryRows = patients.map((p) => {
    const completions = completionMap.get(p.id)
    const completedCount = completions?.size ?? 0
    const totalMods = modules?.length ?? 14
    const progress = totalMods > 0 ? Math.round((completedCount / totalMods) * 100) : 0

    return {
      "Nombre": p.name,
      "Cédula": p.cedula ?? "—",
      "Convenio": p.convenio_code ?? "—",
      "Email": p.email,
      "Código usado": p.access_code_used ?? "—",
      "Fecha registro": p.registered_at ? new Date(p.registered_at).toLocaleDateString("es-CO") : "—",
      "Último acceso": p.last_login_at ? new Date(p.last_login_at).toLocaleDateString("es-CO") : "—",
      "Módulos completados": completedCount,
      "Total módulos": totalMods,
      "Progreso %": `${progress}%`,
      "Puntos": p.total_points ?? 0,
      "Acceso": p.is_active ? "Activo" : "Suspendido",
    }
  })

  // Hoja 2: Progreso por módulo
  const moduleHeaders: Record<string, string | number> = {
    "Nombre": "", "Cédula": "", "Convenio": "",
  }
  modules?.forEach((m) => {
    moduleHeaders[`M${m.order}: ${m.title.slice(0, 30)}`] = ""
  })

  const moduleRows = patients.map((p) => {
    const completions = completionMap.get(p.id)
    const row: Record<string, string | number> = {
      "Nombre": p.name,
      "Cédula": p.cedula ?? "—",
      "Convenio": p.convenio_code ?? "—",
    }
    modules?.forEach((m) => {
      const key = `M${m.order}: ${m.title.slice(0, 30)}`
      row[key] = completions?.get(m.id) ?? "Pendiente"
    })
    return row
  })

  // Crear workbook
  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  ws1["!cols"] = [
    { wch: 25 }, { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen Pacientes")

  const ws2 = XLSX.utils.json_to_sheet(moduleRows)
  XLSX.utils.book_append_sheet(wb, ws2, "Progreso por Módulo")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const filename = `pacientes-caimed-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

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
    .select("id, name, email, cedula, convenio_code, registered_at, last_login_at, is_active, access_code_used, total_points, wants_salud_sexual")
    .eq("role", "patient")
    .order("registered_at", { ascending: false })

  if (convenioFilter && convenioFilter !== "todos") {
    patientQuery = patientQuery.eq("convenio_code", convenioFilter)
  }

  const [
    { data: patients },
    { data: modules },
    { data: allCompletions },
    { data: allQuizResponses },
    { data: allTaskSubmissions },
  ] = await Promise.all([
    patientQuery,
    supabase.from("modules").select("id, title, order").eq("is_published", true).order("order"),
    supabase.from("module_completions").select("user_id, module_id, completed_at"),
    supabase.from("quiz_responses").select("user_id, module_id, is_correct, answered_at"),
    supabase.from("task_submissions").select("user_id, module_id, submitted_at"),
  ])

  if (!patients) return NextResponse.json({ error: "Sin datos" }, { status: 500 })

  // ─── Build lookup maps ───────────────────────────────────────────────────────

  // Completions map: user_id → module_id → date string
  const completionMap = new Map<string, Map<string, string>>()
  allCompletions?.forEach((c) => {
    if (!completionMap.has(c.user_id)) completionMap.set(c.user_id, new Map())
    completionMap.get(c.user_id)!.set(c.module_id, new Date(c.completed_at).toLocaleDateString("es-CO"))
  })

  // Quiz map: user_id → { total, correct }
  const quizMap = new Map<string, { total: number; correct: number }>()
  allQuizResponses?.forEach((r) => {
    if (!quizMap.has(r.user_id)) quizMap.set(r.user_id, { total: 0, correct: 0 })
    const entry = quizMap.get(r.user_id)!
    entry.total++
    if (r.is_correct) entry.correct++
  })

  // Task map: user_id → count
  const taskMap = new Map<string, number>()
  allTaskSubmissions?.forEach((t) => {
    taskMap.set(t.user_id, (taskMap.get(t.user_id) ?? 0) + 1)
  })

  const totalMods = modules?.length ?? 14

  // ─── Hoja 1: Resumen de pacientes ────────────────────────────────────────────
  const summaryRows = patients.map((p) => {
    const completions = completionMap.get(p.id)
    const completedCount = completions?.size ?? 0
    const progress = totalMods > 0 ? Math.round((completedCount / totalMods) * 100) : 0
    const quiz = quizMap.get(p.id) ?? { total: 0, correct: 0 }
    const quizPct = quiz.total > 0 ? Math.round((quiz.correct / quiz.total) * 100) : 0

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
      "Quizzes respondidos": quiz.total,
      "Respuestas correctas": quiz.correct,
      "Precisión quizzes": quiz.total > 0 ? `${quizPct}%` : "—",
      "Tareas enviadas": taskMap.get(p.id) ?? 0,
      "Salud Sexual": p.wants_salud_sexual ? "Sí" : "No",
      "Acceso": p.is_active ? "Activo" : "Suspendido",
    }
  })

  // ─── Hoja 2: Progreso por módulo ─────────────────────────────────────────────
  const moduleRows = patients.map((p) => {
    const completions = completionMap.get(p.id)
    const row: Record<string, string | number> = {
      "Nombre": p.name,
      "Cédula": p.cedula ?? "—",
      "Convenio": p.convenio_code ?? "—",
    }
    modules?.forEach((m) => {
      row[`M${m.order}: ${m.title.slice(0, 28)}`] = completions?.get(m.id) ?? "Pendiente"
    })
    return row
  })

  // ─── Hoja 3: Resumen por convenio ────────────────────────────────────────────
  const convenioGroups = new Map<string, typeof patients>()
  for (const p of patients) {
    const key = p.convenio_code ?? "Sin convenio"
    if (!convenioGroups.has(key)) convenioGroups.set(key, [])
    convenioGroups.get(key)!.push(p)
  }

  const convenioRows = Array.from(convenioGroups.entries()).map(([convenio, group]) => {
    const totalPacientes = group.length
    const activos = group.filter((p) => p.is_active).length
    const completedAll = group.filter((p) => (completionMap.get(p.id)?.size ?? 0) >= totalMods).length
    const avgModules = totalPacientes > 0
      ? Math.round(group.reduce((sum, p) => sum + (completionMap.get(p.id)?.size ?? 0), 0) / totalPacientes * 10) / 10
      : 0
    const avgPoints = totalPacientes > 0
      ? Math.round(group.reduce((sum, p) => sum + (p.total_points ?? 0), 0) / totalPacientes)
      : 0
    const withSaludSexual = group.filter((p) => p.wants_salud_sexual).length
    const avgQuizPct = (() => {
      const eligible = group.filter((p) => (quizMap.get(p.id)?.total ?? 0) > 0)
      if (eligible.length === 0) return "—"
      const avg = eligible.reduce((sum, p) => {
        const q = quizMap.get(p.id)!
        return sum + (q.correct / q.total) * 100
      }, 0) / eligible.length
      return `${Math.round(avg)}%`
    })()

    return {
      "Convenio / Empresa": convenio,
      "Total pacientes": totalPacientes,
      "Activos": activos,
      "Suspendidos": totalPacientes - activos,
      "Completaron programa": completedAll,
      "% Completaron": totalPacientes > 0 ? `${Math.round((completedAll / totalPacientes) * 100)}%` : "—",
      "Promedio módulos completados": avgModules,
      "Promedio puntos": avgPoints,
      "Salud Sexual opt-in": withSaludSexual,
      "% Salud Sexual": totalPacientes > 0 ? `${Math.round((withSaludSexual / totalPacientes) * 100)}%` : "—",
      "Precisión quizzes promedio": avgQuizPct,
    }
  }).sort((a, b) => b["Total pacientes"] - a["Total pacientes"])

  // ─── Hoja 4: Participación (quizzes y tareas) ────────────────────────────────
  const engagementRows = patients.map((p) => {
    const quiz = quizMap.get(p.id) ?? { total: 0, correct: 0 }
    const tasks = taskMap.get(p.id) ?? 0
    const completedCount = completionMap.get(p.id)?.size ?? 0
    const quizPct = quiz.total > 0 ? `${Math.round((quiz.correct / quiz.total) * 100)}%` : "—"

    return {
      "Nombre": p.name,
      "Cédula": p.cedula ?? "—",
      "Convenio": p.convenio_code ?? "—",
      "Módulos completados": completedCount,
      "Quizzes respondidos": quiz.total,
      "Respuestas correctas": quiz.correct,
      "Precisión": quizPct,
      "Tareas enviadas": tasks,
      "Puntos totales": p.total_points ?? 0,
      "Salud Sexual": p.wants_salud_sexual ? "Sí" : "No",
    }
  })

  // ─── Build workbook ───────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.json_to_sheet(summaryRows)
  ws1["!cols"] = [
    { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 9 }, { wch: 9 }, { wch: 10 },
    { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
    { wch: 12 }, { wch: 10 },
  ]
  XLSX.utils.book_append_sheet(wb, ws1, "Resumen Pacientes")

  const ws2 = XLSX.utils.json_to_sheet(moduleRows)
  XLSX.utils.book_append_sheet(wb, ws2, "Progreso por Módulo")

  const ws3 = XLSX.utils.json_to_sheet(convenioRows)
  ws3["!cols"] = [
    { wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 11 }, { wch: 14 },
    { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, ws3, "Por Convenio")

  const ws4 = XLSX.utils.json_to_sheet(engagementRows)
  ws4["!cols"] = [
    { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(wb, ws4, "Participación")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const filename = `pacientes-caimed-${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}

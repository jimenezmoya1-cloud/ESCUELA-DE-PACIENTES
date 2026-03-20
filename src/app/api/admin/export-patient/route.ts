import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get("id")

  if (!patientId) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 })
  }

  const { data: patient } = await supabase
    .from("users")
    .select("*")
    .eq("id", patientId)
    .single()

  if (!patient) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
  }

  const { data: completions } = await supabase
    .from("module_completions")
    .select("*, modules(title, order)")
    .eq("user_id", patientId)
    .order("completed_at", { ascending: true })

  const { data: tasks } = await supabase
    .from("task_submissions")
    .select("*, modules(title)")
    .eq("user_id", patientId)

  // Generar CSV
  let csv = "Tipo,Módulo,Detalle,Fecha\n"

  csv += `Info,—,Nombre: ${patient.name},${patient.registered_at}\n`
  csv += `Info,—,Email: ${patient.email},\n`
  csv += `Info,—,Código: ${patient.access_code_used ?? "N/A"},\n`

  completions?.forEach((c: { module_id: string; completed_at: string; modules: { title: string; order: number } | null }) => {
    csv += `Completación,${c.modules?.title ?? ""},Módulo ${c.modules?.order ?? ""} completado,${c.completed_at}\n`
  })

  tasks?.forEach((t: { content: string; submitted_at: string; modules: { title: string } | null }) => {
    const content = t.content.replace(/"/g, '""').replace(/\n/g, " ")
    csv += `Tarea,${t.modules?.title ?? ""},"${content}",${t.submitted_at}\n`
  })

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${patient.name.toLowerCase().replace(/\s+/g, "-")}.csv"`,
    },
  })
}

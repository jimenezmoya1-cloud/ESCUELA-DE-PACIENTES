import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { data: codes } = await supabase
    .from("access_codes")
    .select("*, users:used_by_user_id(name)")
    .order("created_at", { ascending: false })

  let csv = "Código,Estado,Paciente,Fecha de uso,Creado\n"

  codes?.forEach((c) => {
    const name = (c.users as { name: string } | null)?.name ?? ""
    csv += `${c.code},${c.is_used ? "Usado" : "Activo"},${name},${c.used_at ?? ""},${c.created_at}\n`
  })

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="codigos-caimed.csv"',
    },
  })
}

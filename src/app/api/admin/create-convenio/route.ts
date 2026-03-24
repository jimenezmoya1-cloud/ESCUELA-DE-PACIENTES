import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 })

  const { code, name } = await req.json()
  if (!code?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "Código y nombre son requeridos." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("convenios").insert({
    code: code.trim().toUpperCase(),
    name: name.trim(),
    is_active: true,
  })

  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "Este código de convenio ya existe." : "Error al crear el convenio." },
      { status: error.code === "23505" ? 409 : 500 }
    )
  }

  return NextResponse.json({ success: true })
}

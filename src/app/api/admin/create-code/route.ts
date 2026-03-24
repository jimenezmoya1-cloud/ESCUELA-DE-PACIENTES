import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 })

  const { cedula, convenioCode } = await req.json()

  if (!cedula?.trim() || !convenioCode?.trim()) {
    return NextResponse.json({ error: "Cédula y convenio son requeridos." }, { status: 400 })
  }

  const code = `${convenioCode.trim().toUpperCase()}${cedula.trim()}`

  const admin = createAdminClient()

  // Verificar que no exista ya
  const { data: existing } = await admin
    .from("access_codes")
    .select("id")
    .eq("code", code)
    .single()

  if (existing) {
    return NextResponse.json({ error: `El código ${code} ya existe.` }, { status: 409 })
  }

  const { error } = await admin.from("access_codes").insert({
    code,
    cedula: cedula.trim(),
    convenio_code: convenioCode.trim().toUpperCase(),
    is_used: false,
    created_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: "Error al crear el código." }, { status: 500 })
  }

  return NextResponse.json({ code })
}

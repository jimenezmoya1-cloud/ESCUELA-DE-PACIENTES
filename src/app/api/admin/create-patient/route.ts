import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 })

  const body = await req.json()
  const cedula = String(body.cedula ?? "").trim()
  const name = String(body.name ?? "").trim()
  const convenioCode = body.convenioCode ? String(body.convenioCode).trim().toUpperCase() : null

  if (!cedula) return NextResponse.json({ error: "Cédula requerida." }, { status: 400 })
  if (!name) return NextResponse.json({ error: "Nombre requerido." }, { status: 400 })
  if (!/^\d+$/.test(cedula)) return NextResponse.json({ error: "Cédula debe ser numérica." }, { status: 400 })

  const admin = createAdminClient()

  // Evitar duplicados por cédula
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("cedula", cedula)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: "Ya existe un paciente con esa cédula." }, { status: 409 })
  }

  const placeholderEmail = `${cedula}@caimed.local`
  const code = `${convenioCode ?? "SC"}${cedula}`
  const randomPassword = `tmp_${cedula}_${Math.random().toString(36).slice(2, 12)}`

  // Crear usuario en auth con email confirmado para que pueda recibir login después
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: placeholderEmail,
    password: randomPassword,
    email_confirm: true,
    user_metadata: { name, role: "patient", placeholder: true },
  })
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? "Error creando cuenta." }, { status: 500 })
  }

  const newUserId = created.user.id

  const { error: insertErr } = await admin.from("users").insert({
    id: newUserId,
    name,
    email: placeholderEmail,
    role: "patient",
    cedula,
    convenio_code: convenioCode,
    access_code_used: code,
    registered_at: new Date().toISOString(),
    is_active: true,
  })
  if (insertErr) {
    // rollback auth user
    await admin.auth.admin.deleteUser(newUserId)
    return NextResponse.json({ error: `Error guardando perfil: ${insertErr.message}` }, { status: 500 })
  }

  // Registrar el código (si choca por unique, lo ignoramos: el usuario ya quedó creado)
  await admin.from("access_codes").insert({
    code,
    cedula,
    convenio_code: convenioCode,
    is_used: true,
    used_by_user_id: newUserId,
    used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ userId: newUserId, code })
}

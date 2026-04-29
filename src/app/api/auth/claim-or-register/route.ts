import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const cedula = String(body.cedula ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const password = String(body.password ?? "")
  const name = String(body.name ?? "").trim()
  const convenioCode = body.convenioCode ? String(body.convenioCode).trim().toUpperCase() : null

  if (!cedula || !/^\d+$/.test(cedula)) {
    return NextResponse.json({ error: "Cédula requerida y numérica." }, { status: 400 })
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Correo inválido." }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json({ error: "Nombre requerido." }, { status: 400 })
  }

  const admin = createAdminClient()

  // Buscar paciente pre-registrado por cédula
  const { data: existing } = await admin
    .from("users")
    .select("id, email, name, convenio_code")
    .eq("cedula", cedula)
    .maybeSingle()

  if (existing) {
    const isPlaceholder = existing.email.endsWith("@caimed.local")
    if (!isPlaceholder) {
      return NextResponse.json(
        { error: "Esta cédula ya está registrada. Inicie sesión con su correo." },
        { status: 409 },
      )
    }

    // Asegurar que el correo nuevo no esté tomado por otro usuario
    const { data: emailTaken } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", existing.id)
      .maybeSingle()
    if (emailTaken) {
      return NextResponse.json({ error: "Este correo ya está en uso." }, { status: 409 })
    }

    // Reclamar cuenta: actualizar email + password en auth y en users
    const { error: updErr } = await admin.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "patient", placeholder: false },
    })
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    const { error: profileErr } = await admin
      .from("users")
      .update({
        email,
        name: existing.name && existing.name.trim() ? existing.name : name,
        convenio_code: existing.convenio_code ?? convenioCode,
      })
      .eq("id", existing.id)
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    return NextResponse.json({ claimed: true, email })
  }

  // Crear cuenta nueva
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "patient" },
  })
  if (createErr || !created.user) {
    const msg = createErr?.message ?? "Error creando cuenta."
    const status = msg.toLowerCase().includes("registered") ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }

  const code = `${convenioCode ?? "SC"}${cedula}`

  const { error: profileErr } = await admin.from("users").insert({
    id: created.user.id,
    name,
    email,
    role: "patient",
    cedula,
    convenio_code: convenioCode,
    access_code_used: code,
    registered_at: new Date().toISOString(),
    is_active: true,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  await admin.from("access_codes").insert({
    code,
    cedula,
    convenio_code: convenioCode,
    is_used: true,
    used_by_user_id: created.user.id,
    used_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ claimed: false, email })
}

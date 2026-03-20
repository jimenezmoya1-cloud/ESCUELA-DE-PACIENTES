import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = "CAIMED-"
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Verificar rol admin
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const { quantity } = await request.json()
  const count = Math.min(Math.max(1, quantity || 5), 100)

  const codes: string[] = []
  const existingCodes = new Set<string>()

  // Obtener códigos existentes para evitar duplicados
  const { data: existing } = await supabase.from("access_codes").select("code")
  existing?.forEach((c) => existingCodes.add(c.code))

  while (codes.length < count) {
    const code = generateCode()
    if (!existingCodes.has(code)) {
      codes.push(code)
      existingCodes.add(code)
    }
  }

  // Insertar en batch
  const { error } = await supabase.from("access_codes").insert(
    codes.map((code) => ({ code, is_used: false }))
  )

  if (error) {
    return NextResponse.json({ error: "Error al generar códigos" }, { status: 500 })
  }

  return NextResponse.json({ codes })
}

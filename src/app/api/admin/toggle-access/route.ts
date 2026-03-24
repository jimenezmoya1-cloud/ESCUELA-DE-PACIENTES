import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") return NextResponse.json({ error: "Solo admins" }, { status: 403 })

  const { userId, isActive } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId)

  if (error) return NextResponse.json({ error: "Error al actualizar acceso." }, { status: 500 })

  return NextResponse.json({ success: true, isActive })
}

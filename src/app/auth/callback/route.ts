import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const explicitNext = searchParams.get("next")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Si el caller pidió un destino específico, respetarlo.
      if (explicitNext) {
        return NextResponse.redirect(`${origin}${explicitNext}`)
      }

      // Si no, decidir según el rol del usuario.
      const { data: { user } } = await supabase.auth.getUser()
      let destination = "/mi-camino"
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role, is_active")
          .eq("id", user.id)
          .single()
        if (profile?.is_active) {
          if (profile.role === "admin") destination = "/admin"
          else if (profile.role === "clinico") destination = "/admin/clinico/dashboard"
        }
      }
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Si falla, redirigir al login con error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}

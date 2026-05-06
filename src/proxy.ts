import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión de Supabase (esencial para mantener auth activo)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rutas públicas (no requieren auth)
  const publicRoutes = ["/login", "/registro", "/auth/callback", "/reset-password", "/api/auth", "/chequeo"]
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  // Si no hay usuario y la ruta NO es pública, redirigir a login
  if (!user && !isPublicRoute && pathname !== "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Si hay usuario y está en ruta de auth (login/registro), redirigir según rol.
  if (user && (pathname === "/login" || pathname === "/registro")) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, is_active")
      .eq("id", user.id)
      .single()

    let target = "/mi-camino"
    if (profile?.is_active) {
      if (profile.role === "admin") target = "/admin"
      else if (profile.role === "clinico") target = "/admin/clinico/dashboard"
    }

    const url = request.nextUrl.clone()
    url.pathname = target
    return NextResponse.redirect(url)
  }

  // Exponer la ruta actual al layout para que pueda restringir rutas por rol.
  supabaseResponse.headers.set("x-pathname", pathname)

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

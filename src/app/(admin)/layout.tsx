import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getCurrentProfile, isStaff, isClinico } from "@/lib/auth/profile"
import AdminShell from "@/components/admin/AdminShell"

export const dynamic = "force-dynamic"

// Rutas permitidas para clínicos
const CLINICO_ALLOWED_PREFIXES = ["/admin/pacientes", "/admin/clinico"]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (!isStaff(profile)) {
    redirect("/mi-camino")
  }

  // Enforcement de rutas para clinico
  if (isClinico(profile)) {
    const headersList = await headers()
    const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? ""
    const allowed = CLINICO_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
    if (!allowed && pathname !== "") {
      redirect("/admin/clinico/dashboard")
    }
  }

  return (
    <AdminShell profile={profile}>{children}</AdminShell>
  )
}

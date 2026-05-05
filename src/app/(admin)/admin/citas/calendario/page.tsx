import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { listAppointments } from "@/lib/scheduling/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import CitasFilters from "@/components/admin/CitasFilters"
import CitasCalendarPageClient from "@/components/admin/CitasCalendarPageClient"

export const dynamic = "force-dynamic"

interface SearchParams {
  clinico?: string
  estado?: string
  desde?: string         // YYYY-MM-DD
  hasta?: string
}

function bogotaDateToUtcIso(ymd: string, endOfDay: boolean): string {
  // Construye la representación local Bogota y la convierte a UTC ISO
  const [y, m, d] = ymd.split("-").map(Number)
  // Bogota = UTC-5; 00:00 Bogota = 05:00 UTC
  const utcDate = endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23 + 5, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d, 0 + 5, 0, 0, 0))
  return utcDate.toISOString()
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const sp = await searchParams

  const filters = {
    clinicianId: sp.clinico || null,
    status: (sp.estado as any) || null,
    startDate: sp.desde ? bogotaDateToUtcIso(sp.desde, false) : undefined,
    endDate: sp.hasta ? bogotaDateToUtcIso(sp.hasta, true) : undefined,
    limit: 500,
  }

  const [{ rows }, cliniciansResult] = await Promise.all([
    listAppointments(filters),
    createAdminClient()
      .from("users")
      .select("id, name")
      .eq("role", "clinico")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ])

  const clinicians = (cliniciansResult.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-4">
      <CitasFilters clinicians={clinicians} />
      <CitasCalendarPageClient appointments={rows} />
    </div>
  )
}

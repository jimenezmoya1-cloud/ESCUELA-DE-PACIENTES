import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { listAppointments } from "@/lib/scheduling/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import CitasFilters from "@/components/admin/CitasFilters"
import CitasTable from "@/components/admin/CitasTable"

export const dynamic = "force-dynamic"

interface SearchParams {
  clinico?: string
  estado?: string
  desde?: string
  hasta?: string
  buscar?: string
}

function bogotaDateToUtcIso(ymd: string, endOfDay: boolean): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const utcDate = endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23 + 5, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d, 0 + 5, 0, 0, 0))
  return utcDate.toISOString()
}

export default async function TablaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const sp = await searchParams

  const { rows } = await listAppointments({
    clinicianId: sp.clinico || null,
    status: (sp.estado as any) || null,
    startDate: sp.desde ? bogotaDateToUtcIso(sp.desde, false) : undefined,
    endDate: sp.hasta ? bogotaDateToUtcIso(sp.hasta, true) : undefined,
    searchPatient: sp.buscar,
    limit: 500,
  })

  const cliniciansResult = await createAdminClient()
    .from("users")
    .select("id, name")
    .eq("role", "clinico")
    .eq("is_active", true)
    .order("name", { ascending: true })
  const clinicians = (cliniciansResult.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="space-y-4">
      <CitasFilters clinicians={clinicians} />
      <CitasTable rows={rows} clinicians={clinicians} />
    </div>
  )
}

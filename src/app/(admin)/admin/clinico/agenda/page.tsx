import { redirect } from "next/navigation"
import { addDays, addMonths, startOfMonth } from "date-fns"
import { getCurrentProfile } from "@/lib/auth/profile"
import { listAppointmentsForClinician } from "@/lib/scheduling/admin"
import { getSchedulingConfig } from "@/lib/payments/config"
import AgendaClinicoShell from "@/components/admin/AgendaClinicoShell"

export const dynamic = "force-dynamic"

export default async function AgendaClinicoPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "clinico") redirect("/admin")

  // Cargar 60 días: 30 atrás + 30 adelante. Suficiente para semana / mes / lista.
  const now = new Date()
  const rangeStart = startOfMonth(addMonths(now, -1)).toISOString()
  const rangeEnd = addDays(now, 60).toISOString()

  const [appointments, config] = await Promise.all([
    listAppointmentsForClinician(profile.id, rangeStart, rangeEnd),
    getSchedulingConfig(),
  ])

  return (
    <AgendaClinicoShell
      appointments={appointments}
      teamsUrl={config.teamsMeetingUrl}
    />
  )
}

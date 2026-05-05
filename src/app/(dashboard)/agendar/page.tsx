import { redirect } from "next/navigation"
import { addDays } from "date-fns"
import { getCurrentProfile } from "@/lib/auth/profile"
import { getRemainingCreditsForPatient } from "@/lib/payments/credits"
import { getSchedulingConfig } from "@/lib/payments/config"
import { centsToCop } from "@/lib/payments/format"
import {
  computeAvailableSlots,
} from "@/lib/scheduling/slots"
import {
  getActiveAppointment,
  listPastAppointments,
} from "@/lib/scheduling/booking"
import { NO_AVAILABILITY_LOOKAHEAD_DAYS } from "@/lib/scheduling/constants"
import { getTeamsLinkInfo } from "@/lib/scheduling/teamsLink"
import EstadoSinCreditos from "@/components/dashboard/EstadoSinCreditos"
import SelectorSlot from "@/components/dashboard/SelectorSlot"
import CitaActiva from "@/components/dashboard/CitaActiva"

export const dynamic = "force-dynamic"

export default async function AgendarPage() {
  const profile = await getCurrentProfile()
  if (!profile || profile.role !== "patient") redirect("/login")

  const [credits, active, config] = await Promise.all([
    getRemainingCreditsForPatient(profile.id),
    getActiveAppointment(profile.id),
    getSchedulingConfig(),
  ])

  // Estado C — tiene cita activa
  if (active) {
    const teamsInfo = await getTeamsLinkInfo(active.starts_at)
    const past = await listPastAppointments(profile.id)
    return (
      <CitaActiva
        appointment={active}
        teamsInfo={teamsInfo}
        creditsRemaining={credits}
        pastAppointments={past}
      />
    )
  }

  // Estado A — sin créditos
  if (credits === 0) {
    return (
      <EstadoSinCreditos
        priceSingleCop={centsToCop(config.priceSingleCop)}
        pricePack3Cop={centsToCop(config.pricePack3Cop)}
      />
    )
  }

  // Estado B — con créditos, sin cita activa → selector
  const now = new Date()
  const rangeEnd = addDays(now, NO_AVAILABILITY_LOOKAHEAD_DAYS)
  const slotsByDay = await computeAvailableSlots(now, rangeEnd, now)

  return (
    <SelectorSlot creditsRemaining={credits} slotsByDay={slotsByDay} />
  )
}

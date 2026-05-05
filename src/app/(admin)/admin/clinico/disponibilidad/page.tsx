import { redirect } from "next/navigation"
import { getCurrentProfile, isStaff } from "@/lib/auth/profile"
import { getClinicianSchedules, getClinicianBlocks } from "@/lib/scheduling/schedules"
import HorarioBaseEditor from "@/components/admin/HorarioBaseEditor"
import BloqueosManager from "@/components/admin/BloqueosManager"

export const dynamic = "force-dynamic"

export default async function DisponibilidadPage() {
  const profile = await getCurrentProfile()
  if (!isStaff(profile) || profile?.role === "admin" /* admin no tiene horario propio */) {
    redirect("/admin")
  }
  const clinicianId = profile!.id

  const [schedules, blocks] = await Promise.all([
    getClinicianSchedules(clinicianId),
    getClinicianBlocks(clinicianId),
  ])

  return (
    <div className="space-y-10 p-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Mi disponibilidad</h1>
        <p className="text-sm text-tertiary">
          Configura las horas que estás disponible para evaluaciones de salud. Los pacientes podrán reservar slots dentro de estas franjas.
        </p>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-neutral">Horario base</h2>
          <p className="text-sm text-tertiary">Tus horas regulares de la semana. Los cambios se aplican inmediatamente.</p>
        </div>
        <HorarioBaseEditor clinicianId={clinicianId} initialSchedules={schedules} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium text-neutral">Bloqueos puntuales</h2>
          <p className="text-sm text-tertiary">
            Vacaciones, congresos, capacitaciones — días u horas específicas en las que NO atiendes. Restan de tu horario base.
          </p>
        </div>
        <BloqueosManager clinicianId={clinicianId} initialBlocks={blocks} />
      </section>
    </div>
  )
}

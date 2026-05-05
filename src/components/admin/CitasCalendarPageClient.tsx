"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import CitasCalendarView from "./CitasCalendarView"
import CitaDrawerAdmin from "./CitaDrawerAdmin"
import CrearCitaManualModal from "./CrearCitaManualModal"

interface ClinicianOption { id: string; name: string }

export default function CitasCalendarPageClient({
  appointments,
  clinicians,
}: {
  appointments: AppointmentWithJoin[]
  clinicians: ClinicianOption[]
}) {
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()

  function handleChanged() {
    setSelected(null)
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Crear cita manualmente
        </button>
      </div>
      <CitasCalendarView appointments={appointments} onSelectAppointment={setSelected} />
      <CitaDrawerAdmin
        appointment={selected}
        clinicians={clinicians}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
      <CrearCitaManualModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        clinicians={clinicians}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

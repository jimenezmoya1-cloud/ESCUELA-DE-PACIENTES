"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import CitasCalendarView from "./CitasCalendarView"
import CitaDrawerAdmin from "./CitaDrawerAdmin"

export default function CitasCalendarPageClient({ appointments }: { appointments: AppointmentWithJoin[] }) {
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)
  const router = useRouter()

  function handleChanged() {
    router.refresh()
  }

  return (
    <>
      <CitasCalendarView appointments={appointments} onSelectAppointment={setSelected} />
      <CitaDrawerAdmin
        appointment={selected}
        onClose={() => setSelected(null)}
        onChanged={handleChanged}
      />
    </>
  )
}

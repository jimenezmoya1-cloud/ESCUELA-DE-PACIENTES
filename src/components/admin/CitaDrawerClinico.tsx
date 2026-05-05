"use client"

import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

interface Props {
  appointment: AppointmentWithJoin | null
  teamsUrl: string
  onClose: () => void
}

export default function CitaDrawerClinico({ appointment, teamsUrl, onClose }: Props) {
  if (!appointment) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="border-b border-tertiary/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral">Detalle de la cita</h2>
          <button type="button" onClick={onClose} className="text-tertiary hover:text-neutral">✕</button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-tertiary">Cuándo</div>
            <div className="mt-1 text-base font-medium text-neutral capitalize">
              {formatHumanDateTimeBogota(appointment.starts_at)}
            </div>
            <div className="mt-1 inline-block rounded-full bg-tertiary/10 px-3 py-1 text-xs font-medium">
              {STATUS_LABEL[appointment.status]}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-tertiary">Paciente</div>
            <div className="mt-1 text-base font-medium text-neutral">{appointment.patient_name}</div>
            <div className="text-sm text-tertiary">{appointment.patient_email}</div>
          </div>

          {teamsUrl && appointment.status === "scheduled" && (
            <a
              href={teamsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-primary/90"
            >
              Unirme a Teams ahora
            </a>
          )}

          {appointment.cancellation_reason && (
            <div>
              <div className="text-xs uppercase tracking-wide text-tertiary">Razón de cancelación / nota</div>
              <div className="mt-1 text-sm text-neutral">{appointment.cancellation_reason}</div>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

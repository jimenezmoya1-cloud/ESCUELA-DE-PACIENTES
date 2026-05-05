"use client"

import { useState, useTransition } from "react"
import { markCompletedAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import CancelAppointmentModal from "./CancelAppointmentModal"
import MarkNoShowModal from "./MarkNoShowModal"
import RescheduleAppointmentModal from "./RescheduleAppointmentModal"
import ReassignClinicianModal from "./ReassignClinicianModal"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

interface ClinicianOption { id: string; name: string }

interface Props {
  appointment: AppointmentWithJoin | null
  clinicians: ClinicianOption[]
  onClose: () => void
  onChanged: () => void
}

export default function CitaDrawerAdmin({ appointment, clinicians, onClose, onChanged }: Props) {
  const [showCancel, setShowCancel] = useState(false)
  const [showNoShow, setShowNoShow] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!appointment) return null

  function handleComplete() {
    setError(null)
    startTransition(async () => {
      const res = await markCompletedAction(appointment!.id)
      if (res.ok) {
        onChanged()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  const isActionable = appointment.status === "scheduled"

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="border-b border-tertiary/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral">Detalle de la cita</h2>
          <button type="button" onClick={onClose} className="text-tertiary hover:text-neutral">✕</button>
        </div>

        <div className="px-6 py-4 space-y-6">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-tertiary">Cuándo</div>
            <div className="text-base font-medium text-neutral capitalize">
              {formatHumanDateTimeBogota(appointment.starts_at)}
            </div>
            <div className="inline-block rounded-full bg-tertiary/10 px-3 py-1 text-xs font-medium">
              {STATUS_LABEL[appointment.status]}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-tertiary">Paciente</div>
            <div className="text-base font-medium text-neutral">{appointment.patient_name}</div>
            <div className="text-sm text-tertiary">{appointment.patient_email}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-tertiary">Clínico asignado</div>
            <div className="text-base font-medium text-neutral">{appointment.clinician_name}</div>
          </div>

          {appointment.cancellation_reason && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-tertiary">Razón de cancelación / nota</div>
              <div className="text-sm text-neutral">{appointment.cancellation_reason}</div>
              {appointment.credit_returned && (
                <div className="text-xs text-green-700">✓ Crédito devuelto al paciente</div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {isActionable && (
            <div className="border-t border-tertiary/10 pt-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-tertiary">Acciones</div>
              <button
                type="button"
                onClick={handleComplete}
                disabled={pending}
                className="block w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Marcar como completada
              </button>
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                className="block w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Reagendar
              </button>
              <button
                type="button"
                onClick={() => setShowReassign(true)}
                className="block w-full rounded-lg border border-primary/30 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
              >
                Reasignar a otro clínico
              </button>
              <button
                type="button"
                onClick={() => setShowNoShow(true)}
                className="block w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Marcar no-show
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                className="block w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Cancelar cita
              </button>
            </div>
          )}
        </div>
      </aside>

      <CancelAppointmentModal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        appointmentId={appointment.id}
        startsAt={appointment.starts_at}
        onSuccess={onChanged}
      />
      <MarkNoShowModal
        open={showNoShow}
        onClose={() => setShowNoShow(false)}
        appointmentId={appointment.id}
        onSuccess={onChanged}
      />
      <RescheduleAppointmentModal
        open={showReschedule}
        onClose={() => setShowReschedule(false)}
        appointmentId={appointment.id}
        onSuccess={onChanged}
      />
      <ReassignClinicianModal
        open={showReassign}
        onClose={() => setShowReassign(false)}
        appointmentId={appointment.id}
        currentClinicianId={appointment.clinician_id}
        clinicians={clinicians}
        onSuccess={onChanged}
      />
    </>
  )
}

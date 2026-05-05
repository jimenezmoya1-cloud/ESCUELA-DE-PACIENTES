import type { Appointment } from "@/lib/scheduling/types"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"

const STATUS_LABEL: Record<Appointment["status"], { text: string; className: string }> = {
  scheduled: { text: "Programada", className: "bg-primary/10 text-primary" },
  completed: { text: "Completada", className: "bg-green-100 text-green-800" },
  cancelled: { text: "Cancelada", className: "bg-tertiary/10 text-tertiary" },
  no_show: { text: "No asistió", className: "bg-amber-100 text-amber-800" },
}

export default function EvaluacionesPasadas({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-tertiary/20 p-6 text-center text-sm text-tertiary">
        Aún no tienes evaluaciones pasadas.
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {appointments.map((a) => {
        const status = STATUS_LABEL[a.status]
        return (
          <li key={a.id} className="flex items-center justify-between rounded-xl border border-tertiary/10 bg-white px-4 py-3">
            <div>
              <div className="text-sm font-medium text-neutral capitalize">
                {formatHumanDateTimeBogota(a.starts_at)}
              </div>
              {a.cancellation_reason && (
                <div className="text-xs text-tertiary">{a.cancellation_reason}</div>
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
              {status.text}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

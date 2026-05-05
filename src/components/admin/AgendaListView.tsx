"use client"

import { useMemo } from "react"
import { isToday, isTomorrow, isThisWeek, isThisMonth, parseISO } from "date-fns"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_LABEL: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
}

function bucketFor(iso: string): "today" | "tomorrow" | "week" | "month" | "later" {
  const d = parseISO(iso)
  if (isToday(d)) return "today"
  if (isTomorrow(d)) return "tomorrow"
  if (isThisWeek(d, { weekStartsOn: 1 })) return "week"
  if (isThisMonth(d)) return "month"
  return "later"
}

const BUCKET_LABEL = {
  today: "Hoy",
  tomorrow: "Mañana",
  week: "Esta semana",
  month: "Este mes",
  later: "Próximamente",
}

interface Props {
  appointments: AppointmentWithJoin[]
  onSelect: (apt: AppointmentWithJoin) => void
}

export default function AgendaListView({ appointments, onSelect }: Props) {
  const grouped = useMemo(() => {
    const future = appointments
      .filter((a) => parseISO(a.starts_at).getTime() >= Date.now() - 60 * 60 * 1000)   // permite citas de la última hora
      .sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    const buckets: Record<keyof typeof BUCKET_LABEL, AppointmentWithJoin[]> = {
      today: [],
      tomorrow: [],
      week: [],
      month: [],
      later: [],
    }
    for (const a of future) buckets[bucketFor(a.starts_at)].push(a)
    return buckets
  }, [appointments])

  const orderedKeys = ["today", "tomorrow", "week", "month", "later"] as const

  if (orderedKeys.every((k) => grouped[k].length === 0)) {
    return (
      <div className="rounded-xl border border-dashed border-tertiary/30 p-8 text-center text-sm text-tertiary">
        No tienes citas programadas próximamente.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {orderedKeys.map((key) => {
        const list = grouped[key]
        if (list.length === 0) return null
        return (
          <section key={key} className="space-y-2">
            <h3 className="text-sm font-semibold text-tertiary uppercase tracking-wide">
              {BUCKET_LABEL[key]} ({list.length})
            </h3>
            <ul className="space-y-2">
              {list.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a)}
                    className="w-full flex items-center justify-between rounded-xl border border-tertiary/10 bg-white px-4 py-3 hover:bg-background"
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium text-neutral capitalize">
                        {formatHumanDateTimeBogota(a.starts_at)}
                      </div>
                      <div className="text-xs text-tertiary">{a.patient_name} · {a.patient_email}</div>
                    </div>
                    <span className="text-xs font-medium text-tertiary">{STATUS_LABEL[a.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

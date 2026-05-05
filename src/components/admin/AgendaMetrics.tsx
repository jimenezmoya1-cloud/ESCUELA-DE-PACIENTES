"use client"

import { useMemo } from "react"
import { isToday, isThisWeek, parseISO } from "date-fns"
import { formatHumanDateTimeBogota, msUntil } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

interface Props {
  appointments: AppointmentWithJoin[]
  teamsUrl: string
}

function formatRelative(ms: number): string {
  if (ms <= 0) return "ahora"
  const totalMin = Math.floor(ms / 60_000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `en ${days}d ${hours}h`
  if (hours > 0) return `en ${hours}h ${minutes}m`
  return `en ${minutes} min`
}

export default function AgendaMetrics({ appointments, teamsUrl }: Props) {
  const stats = useMemo(() => {
    const scheduled = appointments.filter((a) => a.status === "scheduled")
    const today = scheduled.filter((a) => isToday(parseISO(a.starts_at)))
    const week = scheduled.filter((a) => isThisWeek(parseISO(a.starts_at), { weekStartsOn: 1 }))
    const future = scheduled
      .filter((a) => parseISO(a.starts_at).getTime() > Date.now())
      .sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    return { todayCount: today.length, weekCount: week.length, next: future[0] ?? null }
  }, [appointments])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="rounded-xl border border-tertiary/10 bg-white p-4">
        <div className="text-xs uppercase text-tertiary">Hoy</div>
        <div className="mt-1 text-2xl font-bold text-neutral">{stats.todayCount}</div>
        <div className="text-xs text-tertiary">cita{stats.todayCount === 1 ? "" : "s"}</div>
      </div>
      <div className="rounded-xl border border-tertiary/10 bg-white p-4">
        <div className="text-xs uppercase text-tertiary">Esta semana</div>
        <div className="mt-1 text-2xl font-bold text-neutral">{stats.weekCount}</div>
        <div className="text-xs text-tertiary">cita{stats.weekCount === 1 ? "" : "s"}</div>
      </div>
      <div className="rounded-xl border border-tertiary/10 bg-white p-4">
        <div className="text-xs uppercase text-tertiary">Próxima cita</div>
        {stats.next ? (
          <>
            <div className="mt-1 text-sm font-medium text-neutral capitalize">
              {formatHumanDateTimeBogota(stats.next.starts_at)}
            </div>
            <div className="text-xs text-tertiary">{formatRelative(msUntil(stats.next.starts_at))}</div>
          </>
        ) : (
          <div className="mt-1 text-sm text-tertiary">Sin citas próximas</div>
        )}
      </div>
      <div className="rounded-xl border border-primary bg-primary/5 p-4 flex flex-col">
        <div className="text-xs uppercase text-primary">Microsoft Teams</div>
        {teamsUrl ? (
          <a
            href={teamsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-block rounded-lg bg-primary px-3 py-2 text-center text-sm font-medium text-white hover:bg-primary/90"
          >
            Unirme a Teams
          </a>
        ) : (
          <div className="mt-auto text-xs text-tertiary">El admin no ha configurado el link.</div>
        )}
      </div>
    </div>
  )
}

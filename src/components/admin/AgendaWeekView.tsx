"use client"

import { useMemo, useState } from "react"
import { addDays, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, format as fnsFormat, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { formatTimeBogota, utcIsoToBogotaDateKey } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

const STATUS_BG: Record<AppointmentWithJoin["status"], string> = {
  scheduled: "bg-primary/10 border-primary/30 text-primary",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-tertiary/10 border-tertiary/30 text-tertiary line-through",
  no_show: "bg-amber-100 border-amber-300 text-amber-800",
}

interface Props {
  appointments: AppointmentWithJoin[]
  onSelect: (apt: AppointmentWithJoin) => void
}

export default function AgendaWeekView({ appointments, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => new Date())
  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [cursor])

  const aptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithJoin[]>()
    for (const a of appointments) {
      const key = utcIsoToBogotaDateKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    for (const list of map.values()) {
      list.sort((x, y) => parseISO(x.starts_at).getTime() - parseISO(y.starts_at).getTime())
    }
    return map
  }, [appointments])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => setCursor((c) => addWeeks(c, -1))}
          className="rounded-lg px-3 py-1 text-sm hover:bg-background"
        >
          ←
        </button>
        <span className="text-sm font-medium text-neutral capitalize min-w-[180px] text-center">
          {fnsFormat(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })} – {fnsFormat(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}
        </span>
        <button
          type="button"
          onClick={() => setCursor((c) => addWeeks(c, 1))}
          className="rounded-lg px-3 py-1 text-sm hover:bg-background"
        >
          →
        </button>
        <button
          type="button"
          onClick={() => setCursor(new Date())}
          className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs hover:bg-background"
        >
          Hoy
        </button>
      </div>

      <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background">
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 text-center">
              <div className="text-xs uppercase text-tertiary">{fnsFormat(d, "EEE", { locale: es })}</div>
              <div className="text-sm font-medium text-neutral">{fnsFormat(d, "d MMM", { locale: es })}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((d) => {
            const list = aptsByDay.get(utcIsoToBogotaDateKey(d.toISOString())) ?? []
            return (
              <div key={d.toISOString()} className="border-r border-tertiary/10 last:border-r-0 p-2 space-y-1">
                {list.length === 0 ? (
                  <div className="text-xs text-tertiary/40 italic">—</div>
                ) : (
                  list.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className={`block w-full text-left rounded-md border px-2 py-1 text-xs ${STATUS_BG[a.status]} hover:opacity-80`}
                    >
                      <div className="font-medium">{formatTimeBogota(a.starts_at)}</div>
                      <div className="truncate">{a.patient_name}</div>
                    </button>
                  ))
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

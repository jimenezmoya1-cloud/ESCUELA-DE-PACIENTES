"use client"

import { useMemo, useState } from "react"
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, format as fnsFormat, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { BOGOTA_TZ } from "@/lib/scheduling/constants"
import { utcIsoToBogotaDateKey } from "@/lib/scheduling/format"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"

interface Props {
  appointments: AppointmentWithJoin[]
  onSelect: (apt: AppointmentWithJoin) => void
}

export default function AgendaMonthView({ appointments, onSelect }: Props) {
  const [cursor, setCursor] = useState(() => new Date())
  const days = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) })
  }, [cursor])

  const aptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentWithJoin[]>()
    for (const a of appointments) {
      const key = utcIsoToBogotaDateKey(a.starts_at)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    }
    return map
  }, [appointments])

  const firstDayOfWeek = (toZonedTime(days[0], BOGOTA_TZ).getDay() + 6) % 7

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={() => setCursor((c) => addMonths(c, -1))} className="rounded-lg px-3 py-1 text-sm hover:bg-background">←</button>
        <span className="text-sm font-medium text-neutral capitalize min-w-[160px] text-center">
          {fnsFormat(cursor, "MMMM yyyy", { locale: es })}
        </span>
        <button type="button" onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded-lg px-3 py-1 text-sm hover:bg-background">→</button>
        <button type="button" onClick={() => setCursor(new Date())} className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs hover:bg-background">Hoy</button>
      </div>

      <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
        <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background text-xs font-medium text-tertiary">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="px-2 py-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[110px]">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`pad-${i}`} className="border-r border-b border-tertiary/10" />
          ))}
          {days.map((d) => {
            const list = aptsByDay.get(utcIsoToBogotaDateKey(d.toISOString())) ?? []
            const today = isSameDay(d, new Date())
            return (
              <div key={d.toISOString()} className="border-r border-b border-tertiary/10 p-1 overflow-hidden">
                <div className={`text-xs font-medium ${today ? "text-primary" : "text-neutral"}`}>{fnsFormat(d, "d")}</div>
                <div className="space-y-0.5 mt-1">
                  {list.slice(0, 3).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onSelect(a)}
                      className="block w-full text-left truncate rounded px-1 py-0.5 text-[10px] bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {a.patient_name}
                    </button>
                  ))}
                  {list.length > 3 && (
                    <div className="text-[10px] text-tertiary">+{list.length - 3} más</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

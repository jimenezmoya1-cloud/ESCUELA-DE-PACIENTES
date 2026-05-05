"use client"

import { useState, useMemo } from "react"
import { addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format as fnsFormat, parseISO, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { BOGOTA_TZ } from "@/lib/scheduling/constants"
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
  onSelectAppointment: (apt: AppointmentWithJoin) => void
}

type Mode = "week" | "month"

export default function CitasCalendarView({ appointments, onSelectAppointment }: Props) {
  const [mode, setMode] = useState<Mode>("week")
  const [cursor, setCursor] = useState(() => new Date())

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-tertiary/20 p-1">
          <button
            type="button"
            onClick={() => setMode("week")}
            className={`px-3 py-1 text-xs font-medium rounded ${mode === "week" ? "bg-primary text-white" : "text-tertiary hover:bg-background"}`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setMode("month")}
            className={`px-3 py-1 text-xs font-medium rounded ${mode === "month" ? "bg-primary text-white" : "text-tertiary hover:bg-background"}`}
          >
            Mes
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => mode === "week" ? addWeeks(c, -1) : addMonths(c, -1))}
            className="rounded-lg px-3 py-1 text-sm hover:bg-background"
          >
            ←
          </button>
          <span className="text-sm font-medium text-neutral capitalize min-w-[180px] text-center">
            {mode === "week"
              ? `${fnsFormat(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM", { locale: es })} – ${fnsFormat(endOfWeek(cursor, { weekStartsOn: 1 }), "d MMM yyyy", { locale: es })}`
              : fnsFormat(cursor, "MMMM yyyy", { locale: es })}
          </span>
          <button
            type="button"
            onClick={() => setCursor((c) => mode === "week" ? addWeeks(c, 1) : addMonths(c, 1))}
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
      </div>

      {mode === "week" ? (
        <WeekGrid cursor={cursor} appointments={appointments} onSelect={onSelectAppointment} />
      ) : (
        <MonthGrid cursor={cursor} appointments={appointments} onSelect={onSelectAppointment} />
      )}
    </div>
  )
}

function WeekGrid({ cursor, appointments, onSelect }: { cursor: Date; appointments: AppointmentWithJoin[]; onSelect: (a: AppointmentWithJoin) => void }) {
  const days = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end: addDays(start, 6) })
  }, [cursor])

  // Apt's grouped per day (Bogota date key)
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
          const key = utcIsoToBogotaDateKey(d.toISOString())
          const list = aptsByDay.get(key) ?? []
          return (
            <div key={d.toISOString()} className="border-r border-tertiary/10 last:border-r-0 p-2 space-y-1">
              {list.length === 0 ? (
                <div className="text-xs text-tertiary/40 italic">Sin citas</div>
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
                    <div className="truncate text-[10px] opacity-70">{a.clinician_name}</div>
                  </button>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthGrid({ cursor, appointments, onSelect }: { cursor: Date; appointments: AppointmentWithJoin[]; onSelect: (a: AppointmentWithJoin) => void }) {
  const days = useMemo(() => {
    const start = startOfMonth(cursor)
    const end = endOfMonth(cursor)
    return eachDayOfInterval({ start, end })
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

  // Padding inicial: cuántos días desde el lunes hasta el día 1
  const firstDayOfWeek = (toZonedTime(days[0], BOGOTA_TZ).getDay() + 6) % 7

  return (
    <div className="rounded-xl border border-tertiary/10 bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-tertiary/10 bg-background text-xs font-medium text-tertiary">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[100px]">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} className="border-r border-b border-tertiary/10" />
        ))}
        {days.map((d) => {
          const key = utcIsoToBogotaDateKey(d.toISOString())
          const list = aptsByDay.get(key) ?? []
          const today = isSameDay(d, new Date())
          return (
            <div key={d.toISOString()} className="border-r border-b border-tertiary/10 p-1 overflow-hidden">
              <div className={`text-xs font-medium ${today ? "text-primary" : "text-neutral"}`}>
                {fnsFormat(d, "d")}
              </div>
              <div className="space-y-0.5 mt-1">
                {list.slice(0, 2).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onSelect(a)}
                    className={`block w-full text-left truncate rounded px-1 py-0.5 text-[10px] ${STATUS_BG[a.status]}`}
                  >
                    {formatTimeBogota(a.starts_at)} {a.patient_name}
                  </button>
                ))}
                {list.length > 2 && (
                  <div className="text-[10px] text-tertiary">+{list.length - 2} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

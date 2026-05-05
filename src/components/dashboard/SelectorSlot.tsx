"use client"

import { useState, useMemo, useTransition } from "react"
import { addMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format as fnsFormat } from "date-fns"
import { es } from "date-fns/locale"
import { bookSlotAction } from "@/app/(dashboard)/agendar/actions"
import type { SlotsByDay } from "@/lib/scheduling/types"
import {
  formatHumanDateTimeBogota,
  formatTimeBogota,
  formatMonthBogota,
  utcIsoToBogotaDateKey,
} from "@/lib/scheduling/format"

interface Props {
  creditsRemaining: number
  slotsByDay: SlotsByDay
}

export default function SelectorSlot({ creditsRemaining, slotsByDay }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [confirmSlot, setConfirmSlot] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [bookedId, setBookedId] = useState<string | null>(null)

  // Días del mes actual
  const monthDays = useMemo(() => {
    const start = startOfMonth(monthCursor)
    const end = endOfMonth(monthCursor)
    return eachDayOfInterval({ start, end })
  }, [monthCursor])

  const daysWithSlots = useMemo(() => {
    return new Set(Object.keys(slotsByDay))
  }, [slotsByDay])

  function handleConfirm() {
    if (!confirmSlot) return
    setError(null)
    startTransition(async () => {
      const res = await bookSlotAction(confirmSlot)
      if (res.ok) {
        setBookedId(res.appointmentId)
        // Refrescar la página para que aparezca Estado C
        window.location.reload()
      } else {
        setError(res.error)
        setConfirmSlot(null)
      }
    })
  }

  if (Object.keys(slotsByDay).length === 0) {
    return (
      <div className="space-y-6 max-w-3xl">
        <header>
          <h1 className="text-2xl font-semibold text-neutral mb-1">Agenda tu evaluación de salud</h1>
          <p className="text-sm text-tertiary">Tienes {creditsRemaining} evaluación{creditsRemaining === 1 ? "" : "es"} disponible{creditsRemaining === 1 ? "" : "s"}.</p>
        </header>
        <div className="rounded-xl border border-dashed border-tertiary/30 p-12 text-center">
          <p className="text-lg font-medium text-neutral">Por ahora no hay disponibilidad</p>
          <p className="mt-2 text-sm text-tertiary">Vuelve a revisar pronto. Estamos abriendo más horarios.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Agenda tu evaluación de salud</h1>
        <p className="text-sm text-tertiary">
          Tienes <strong className="text-neutral">{creditsRemaining}</strong> evaluación
          {creditsRemaining === 1 ? "" : "es"} disponible{creditsRemaining === 1 ? "" : "s"}.
          Elige el día y la hora que mejor te funcione.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Calendario */}
        <div className="rounded-2xl border border-tertiary/10 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setMonthCursor((m) => addMonths(m, -1))}
              className="rounded-lg px-3 py-1 text-sm hover:bg-background"
            >
              ← Mes anterior
            </button>
            <h2 className="text-lg font-medium text-neutral capitalize">
              {formatMonthBogota(monthCursor.toISOString())}
            </h2>
            <button
              type="button"
              onClick={() => setMonthCursor((m) => addMonths(m, 1))}
              className="rounded-lg px-3 py-1 text-sm hover:bg-background"
            >
              Mes siguiente →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-tertiary mb-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="py-1 font-medium">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {/* Padding inicial: cuántos días desde el lunes hasta el día 1 */}
            {Array.from({ length: ((getDay(monthDays[0]) + 6) % 7) }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {monthDays.map((day) => {
              const key = utcIsoToBogotaDateKey(day.toISOString())
              const hasSlots = daysWithSlots.has(key)
              const isSelected = selectedDay === key
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!hasSlots}
                  onClick={() => setSelectedDay(key)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-white"
                      : hasSlots
                      ? "bg-primary/5 text-primary hover:bg-primary/10"
                      : "text-tertiary/40 cursor-not-allowed"
                  }`}
                >
                  {fnsFormat(day, "d")}
                  {hasSlots && !isSelected && (
                    <span className="block w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Panel de slots */}
        <div className="rounded-2xl border border-tertiary/10 bg-white p-6">
          {!selectedDay ? (
            <div className="py-8 text-center text-sm text-tertiary">
              Selecciona un día con disponibilidad para ver los horarios.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-neutral capitalize">
                {fnsFormat(new Date(selectedDay + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })}
              </div>
              <div className="space-y-1.5">
                {(slotsByDay[selectedDay] ?? []).map((slot) => (
                  <button
                    key={slot.starts_at}
                    type="button"
                    onClick={() => setConfirmSlot(slot.starts_at)}
                    className="w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm font-medium text-neutral hover:bg-primary hover:border-primary hover:text-white transition-colors"
                  >
                    {formatTimeBogota(slot.starts_at)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmSlot && !bookedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral mb-2">Confirmar tu evaluación</h2>
            <p className="text-sm text-tertiary mb-4">
              <strong className="text-neutral capitalize">{formatHumanDateTimeBogota(confirmSlot)}</strong>
            </p>
            <p className="text-sm text-tertiary mb-6">
              Tu evaluación será online por Microsoft Teams. Recibirás el link 24 horas antes de tu cita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmSlot(null)}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {pending ? "Reservando..." : "Confirmar reserva"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

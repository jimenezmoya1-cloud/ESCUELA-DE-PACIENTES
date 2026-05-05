"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Appointment } from "@/lib/scheduling/types"
import type { TeamsLinkInfo } from "@/lib/scheduling/teamsLink"
import { formatHumanDateTimeBogota, msUntil } from "@/lib/scheduling/format"
import EvaluacionesPasadas from "./EvaluacionesPasadas"

interface Props {
  appointment: Appointment
  teamsInfo: TeamsLinkInfo
  creditsRemaining: number
  pastAppointments: Appointment[]
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "ahora"
  const totalMin = Math.floor(ms / (60 * 1000))
  const days = Math.floor(totalMin / (60 * 24))
  const hours = Math.floor((totalMin % (60 * 24)) / 60)
  const minutes = totalMin % 60
  if (days > 0) return `en ${days}d ${hours}h`
  if (hours > 0) return `en ${hours}h ${minutes}m`
  return `en ${minutes} min`
}

export default function CitaActiva({ appointment, teamsInfo, creditsRemaining, pastAppointments }: Props) {
  const [countdown, setCountdown] = useState(formatCountdown(msUntil(appointment.starts_at)))
  const [unlocked, setUnlocked] = useState(teamsInfo.unlocked)

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(formatCountdown(msUntil(appointment.starts_at)))
      // Re-evaluar unlock cada minuto
      setUnlocked(Date.now() >= new Date(teamsInfo.unlocksAtIso).getTime())
    }, 60_000)
    return () => clearInterval(id)
  }, [appointment.starts_at, teamsInfo.unlocksAtIso])

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Tu evaluación de salud</h1>
        <p className="text-sm text-tertiary">Detalles y link de la videollamada.</p>
      </header>

      {/* Card principal de la cita */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-white p-6 space-y-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-primary">Próxima evaluación</div>
          <div className="mt-1 text-xl font-semibold text-neutral capitalize">
            {formatHumanDateTimeBogota(appointment.starts_at)}
          </div>
          <div className="mt-1 text-sm text-tertiary">{countdown}</div>
        </div>

        {unlocked && teamsInfo.url ? (
          <a
            href={teamsInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-white hover:bg-primary/90"
          >
            Unirme por Teams
          </a>
        ) : (
          <div className="rounded-lg bg-background px-4 py-3 text-center text-sm text-tertiary">
            El link de Teams se habilitará 24 horas antes de tu cita.
          </div>
        )}

        <p className="text-xs text-tertiary">
          ¿Necesitas reagendar o cancelar?{" "}
          <Link href="/mensajes" className="underline hover:text-primary">
            Envía un mensaje al administrador
          </Link>
          .
        </p>
      </div>

      {/* Créditos restantes */}
      {creditsRemaining > 0 && (
        <div className="rounded-xl border border-tertiary/10 bg-white p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral">
              Te queda{creditsRemaining === 1 ? "" : "n"}{" "}
              <strong>{creditsRemaining}</strong> evaluación
              {creditsRemaining === 1 ? "" : "es"} más.
            </div>
            <div className="text-xs text-tertiary">Puedes agendar la siguiente cuando quieras.</div>
          </div>
          {/* No se puede agendar otra mientras haya una activa según el flujo del spec.
              El botón vuelve a /agendar pero el server le mostrará Estado C otra vez.
              Cuando complete o cancele esta cita, podrá agendar la próxima. */}
        </div>
      )}

      {/* Histórico */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-neutral">Evaluaciones pasadas</h2>
        <EvaluacionesPasadas appointments={pastAppointments} />
      </section>
    </div>
  )
}

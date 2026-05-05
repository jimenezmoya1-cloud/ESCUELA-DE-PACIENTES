import { parseISO } from "date-fns"
import { getSchedulingConfig } from "@/lib/payments/config"

export interface TeamsLinkInfo {
  /** Si el paciente puede ver/usar el link ahora */
  unlocked: boolean
  /** URL del Teams (vacía si no configurada) */
  url: string
  /** Cuándo se desbloquea (ISO) — útil para mostrar countdown */
  unlocksAtIso: string
}

/**
 * Dado el inicio de una cita, decide si el paciente ya puede ver el link.
 * Regla: 24h antes de starts_at.
 */
export async function getTeamsLinkInfo(appointmentStartsAt: string): Promise<TeamsLinkInfo> {
  const config = await getSchedulingConfig()
  const startMs = parseISO(appointmentStartsAt).getTime()
  const unlocksAt = new Date(startMs - 24 * 60 * 60 * 1000)
  const unlocked = Date.now() >= unlocksAt.getTime()
  return {
    unlocked,
    url: config.teamsMeetingUrl,
    unlocksAtIso: unlocksAt.toISOString(),
  }
}

import { parseISO, addMinutes } from "date-fns"
import { toZonedTime, fromZonedTime, format as tzFormat } from "date-fns-tz"
import { es } from "date-fns/locale"
import { BOGOTA_TZ, SLOT_DURATION_MIN } from "./constants"

/** Convierte ISO UTC → "YYYY-MM-DD" en Bogota TZ. Útil como key de día. */
export function utcIsoToBogotaDateKey(iso: string): string {
  return tzFormat(toZonedTime(parseISO(iso), BOGOTA_TZ), "yyyy-MM-dd", { timeZone: BOGOTA_TZ })
}

/** Convierte "YYYY-MM-DD HH:mm" Bogota → ISO UTC */
export function bogotaToUtcIso(dateBogota: string, timeBogota: string): string {
  // dateBogota="2026-05-10", timeBogota="10:00"
  const local = `${dateBogota}T${timeBogota.length === 5 ? timeBogota : timeBogota.slice(0, 5)}:00`
  return fromZonedTime(local, BOGOTA_TZ).toISOString()
}

/** Format human-friendly en Bogota TZ. Ej: "jueves 8 mayo, 10:30 AM" */
export function formatHumanDateTimeBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "EEEE d MMM, h:mm a", { timeZone: BOGOTA_TZ, locale: es })
}

/** Format de hora corta. Ej: "10:30 AM" */
export function formatTimeBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "h:mm a", { timeZone: BOGOTA_TZ })
}

/** Format fecha corta. Ej: "jueves 8 mayo 2026" */
export function formatDateBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "EEEE d MMM yyyy", { timeZone: BOGOTA_TZ, locale: es })
}

/** Format mes completo. Ej: "Mayo 2026" */
export function formatMonthBogota(iso: string): string {
  const zoned = toZonedTime(parseISO(iso), BOGOTA_TZ)
  return tzFormat(zoned, "MMMM yyyy", { timeZone: BOGOTA_TZ, locale: es })
}

/** Hora de fin del slot dado el ISO de inicio. */
export function slotEndIso(startIso: string): string {
  return addMinutes(parseISO(startIso), SLOT_DURATION_MIN).toISOString()
}

/** Devuelve el inicio del día (00:00 Bogota) en UTC ISO, dado un ISO de cualquier hora. */
export function startOfDayBogotaIso(iso: string): string {
  const dateKey = utcIsoToBogotaDateKey(iso)
  return bogotaToUtcIso(dateKey, "00:00")
}

/** Devuelve el final del día (23:59:59.999 Bogota) en UTC ISO. */
export function endOfDayBogotaIso(iso: string): string {
  const dateKey = utcIsoToBogotaDateKey(iso)
  return fromZonedTime(`${dateKey}T23:59:59.999`, BOGOTA_TZ).toISOString()
}

/** Diferencia en milisegundos entre `target` y `now`. Negativo si target ya pasó. */
export function msUntil(targetIso: string): number {
  return parseISO(targetIso).getTime() - Date.now()
}

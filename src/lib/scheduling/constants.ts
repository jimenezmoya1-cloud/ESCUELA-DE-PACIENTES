/** Constantes operativas del agendamiento (decisiones del spec). */

export const SLOT_DURATION_MIN = 30
export const BUFFER_MIN = 10                 // tiempo libre entre citas
export const MIN_NOTICE_HOURS = 24            // anticipación mínima del paciente
export const BOGOTA_TZ = "America/Bogota"

/** Rango (en días) que el selector del paciente examina hacia adelante para "no hay disponibilidad" */
export const NO_AVAILABILITY_LOOKAHEAD_DAYS = 90

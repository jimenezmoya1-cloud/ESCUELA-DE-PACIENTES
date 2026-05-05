import { formatHumanDateTimeBogota } from "./format"
import type { AppointmentWithJoin } from "./admin"

/**
 * Convierte filas de citas a un string CSV. Maneja escape de comas y comillas.
 * Pure function — no I/O.
 */
export function appointmentsToCsv(rows: AppointmentWithJoin[]): string {
  const headers = [
    "Fecha y hora",
    "Paciente",
    "Email",
    "Clínico",
    "Estado",
    "Crédito devuelto",
    "Razón cancelación",
  ]

  const lines = [headers.map(csvCell).join(",")]
  for (const r of rows) {
    lines.push(
      [
        formatHumanDateTimeBogota(r.starts_at),
        r.patient_name,
        r.patient_email,
        r.clinician_name,
        r.status,
        r.credit_returned ? "sí" : "no",
        r.cancellation_reason ?? "",
      ]
        .map(csvCell)
        .join(","),
    )
  }
  return lines.join("\n")
}

/** Escapa comillas y envuelve en comillas si la celda contiene `,`, `"` o newline. */
function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "")
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

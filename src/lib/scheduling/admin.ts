import { createAdminClient } from "@/lib/supabase/admin"
import type { Appointment, AppointmentStatus } from "./types"

/** Una cita enriquecida con datos de paciente y clínico para vistas admin. */
export interface AppointmentWithJoin extends Appointment {
  patient_name: string
  patient_email: string
  clinician_name: string
}

export interface ListAppointmentsFilters {
  clinicianId?: string | null
  status?: AppointmentStatus | null
  startDate?: string                    // ISO UTC, lower bound (inclusive)
  endDate?: string                      // ISO UTC, upper bound (inclusive)
  searchPatient?: string                // matches name or email
  limit?: number
  offset?: number
}

/** Query principal del admin. Devuelve filas con joins. */
export async function listAppointments(
  filters: ListAppointmentsFilters = {},
): Promise<{ rows: AppointmentWithJoin[]; total: number }> {
  const admin = createAdminClient()
  const limit = filters.limit ?? 100
  const offset = filters.offset ?? 0

  let query = admin
    .from("appointments")
    .select(
      "*, patient:users!patient_id(name, email), clinician:users!clinician_id(name)",
      { count: "exact" },
    )
    .order("starts_at", { ascending: true })
    .range(offset, offset + limit - 1)

  if (filters.clinicianId) query = query.eq("clinician_id", filters.clinicianId)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.startDate) query = query.gte("starts_at", filters.startDate)
  if (filters.endDate) query = query.lte("starts_at", filters.endDate)

  const { data, error, count } = await query
  if (error) throw new Error(`Error listando citas: ${error.message}`)

  let rows: AppointmentWithJoin[] = (data ?? []).map((row: any) => ({
    ...row,
    patient_name: row.patient?.name ?? "(sin nombre)",
    patient_email: row.patient?.email ?? "",
    clinician_name: row.clinician?.name ?? "(sin clínico)",
    patient: undefined,
    clinician: undefined,
  }))

  // Filtro de búsqueda en memoria (suficiente para Plan 3; Plan 5 puede mover a SQL si crece)
  if (filters.searchPatient) {
    const q = filters.searchPatient.toLowerCase()
    rows = rows.filter(
      (r) => r.patient_name.toLowerCase().includes(q) || r.patient_email.toLowerCase().includes(q),
    )
  }

  return { rows, total: filters.searchPatient ? rows.length : (count ?? 0) }
}

/** Trae una cita con todo el join, para el drawer de detalle. */
export async function getAppointmentDetail(appointmentId: string): Promise<AppointmentWithJoin | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("appointments")
    .select(
      "*, patient:users!patient_id(name, email), clinician:users!clinician_id(name)",
    )
    .eq("id", appointmentId)
    .maybeSingle()
  if (error) throw new Error(`Error leyendo cita: ${error.message}`)
  if (!data) return null
  const row = data as any
  return {
    ...row,
    patient_name: row.patient?.name ?? "(sin nombre)",
    patient_email: row.patient?.email ?? "",
    clinician_name: row.clinician?.name ?? "(sin clínico)",
    patient: undefined,
    clinician: undefined,
  }
}

/** Lista las citas asignadas al clínico autenticado, en un rango. */
export async function listAppointmentsForClinician(
  clinicianId: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<AppointmentWithJoin[]> {
  const result = await listAppointments({
    clinicianId,
    startDate: rangeStart,
    endDate: rangeEnd,
    limit: 500,
  })
  return result.rows
}

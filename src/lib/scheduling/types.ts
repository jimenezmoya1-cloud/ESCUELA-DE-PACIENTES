export type AppointmentStatus = "scheduled" | "completed" | "cancelled" | "no_show"

export interface ScheduleEntry {
  id: string
  clinician_id: string
  weekday: number              // 0=domingo, 1=lunes, ..., 6=sábado
  start_time: string           // "HH:MM:SS" o "HH:MM"
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BlockEntry {
  id: string
  clinician_id: string
  start_at: string             // ISO timestamptz
  end_at: string
  reason: string | null
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  clinician_id: string
  starts_at: string            // ISO timestamptz UTC
  ends_at: string
  status: AppointmentStatus
  credit_id: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  credit_returned: boolean
  reminder_24h_sent_at: string | null
  reminder_1h_sent_at: string | null
  created_at: string
  updated_at: string
}

/** Slot disponible computado al vuelo. Sin clinician_id porque el paciente no debe verlo. */
export interface AvailableSlot {
  starts_at: string            // ISO UTC
  ends_at: string              // starts_at + 30 min
}

/** Mapa día → slots disponibles, para pintar el grid del paciente. */
export interface SlotsByDay {
  [dateBogotaIso: string]: AvailableSlot[]   // key formato "YYYY-MM-DD" en Bogota TZ
}

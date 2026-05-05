import { describe, it, expect } from "vitest"
import { appointmentsToCsv } from "../csv"
import type { AppointmentWithJoin } from "../admin"

const baseRow: AppointmentWithJoin = {
  id: "1",
  patient_id: "p1",
  clinician_id: "c1",
  starts_at: "2026-05-11T13:00:00.000Z",        // 8:00 AM Bogota
  ends_at: "2026-05-11T13:30:00.000Z",
  status: "scheduled",
  credit_id: "cr1",
  cancelled_by: null,
  cancelled_at: null,
  cancellation_reason: null,
  credit_returned: false,
  reminder_24h_sent_at: null,
  reminder_1h_sent_at: null,
  created_at: "2026-05-01T12:00:00.000Z",
  updated_at: "2026-05-01T12:00:00.000Z",
  patient_name: "María Pérez",
  patient_email: "maria@example.com",
  clinician_name: "Dra. López",
}

describe("appointmentsToCsv", () => {
  it("renders a header row plus one data row", () => {
    const csv = appointmentsToCsv([baseRow])
    const lines = csv.split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain("Paciente")
  })

  it("escapes commas in cell values", () => {
    const row: AppointmentWithJoin = {
      ...baseRow,
      patient_name: "Pérez, María",
    }
    const csv = appointmentsToCsv([row])
    expect(csv).toContain('"Pérez, María"')
  })

  it("escapes double quotes by doubling them", () => {
    const row: AppointmentWithJoin = {
      ...baseRow,
      cancellation_reason: 'Paciente dijo "no puedo"',
    }
    const csv = appointmentsToCsv([row])
    expect(csv).toContain('"Paciente dijo ""no puedo"""')
  })

  it("renders empty cell for null values", () => {
    const csv = appointmentsToCsv([baseRow])
    // cancellation_reason is null in baseRow → emits ""
    const dataLine = csv.split("\n")[1]
    expect(dataLine.endsWith(",")).toBe(true)
  })

  it("includes 'sí'/'no' for credit_returned", () => {
    const csv1 = appointmentsToCsv([{ ...baseRow, credit_returned: true }])
    const csv2 = appointmentsToCsv([{ ...baseRow, credit_returned: false }])
    expect(csv1.split("\n")[1]).toContain(",sí,")
    expect(csv2.split("\n")[1]).toContain(",no,")
  })
})

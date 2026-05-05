"use client"

import { useState, useTransition } from "react"
import { createManualAppointmentAction } from "@/app/(admin)/admin/citas/calendario/actions"
import { bogotaToUtcIso } from "@/lib/scheduling/format"
import PatientAutocomplete, { type PatientLite } from "./PatientAutocomplete"

interface ClinicianOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  clinicians: ClinicianOption[]
  onSuccess: () => void
}

export default function CrearCitaManualModal({ open, onClose, clinicians, onSuccess }: Props) {
  const [patient, setPatient] = useState<PatientLite | null>(null)
  const [clinicianId, setClinicianId] = useState<string>("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("08:00")
  const [consumeCredit, setConsumeCredit] = useState(true)
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setPatient(null)
    setClinicianId("")
    setDate("")
    setTime("08:00")
    setConsumeCredit(true)
    setNote("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!patient) return setError("Selecciona un paciente")
    if (!clinicianId) return setError("Selecciona un clínico")
    if (!date) return setError("Selecciona una fecha")

    const startsAtIso = bogotaToUtcIso(date, time)
    startTransition(async () => {
      const res = await createManualAppointmentAction({
        patientId: patient.id,
        clinicianId,
        startsAtIso,
        consumeCredit,
        note: note.trim(),
      })
      if (res.ok) {
        reset()
        onSuccess()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Crear cita manualmente</h2>
        <p className="mb-4 text-sm text-tertiary">
          Asigna un paciente a un clínico específico. Útil para citas coordinadas por fuera del flujo normal del paciente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Paciente</label>
            <div className="mt-1">
              <PatientAutocomplete value={patient} onChange={setPatient} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Clínico</label>
            <select
              value={clinicianId}
              onChange={(e) => setClinicianId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Selecciona un clínico…</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-neutral">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={consumeCredit}
              onChange={(e) => setConsumeCredit(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>Consumir un crédito del paciente.</strong>{" "}
              <span className="text-tertiary">Desmarca si la cita es cortesía/no debe descontar créditos.</span>
            </span>
          </label>

          <div>
            <label className="text-sm font-medium text-neutral">Nota / razón</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Ej: paciente solicitó por teléfono, cita coordinada con convenio X"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? "Creando..." : "Crear cita"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

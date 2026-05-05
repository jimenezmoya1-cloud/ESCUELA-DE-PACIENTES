"use client"

import { useState, useTransition } from "react"
import { registerManualPayment } from "@/app/(admin)/admin/citas/pagos/actions"
import PatientAutocomplete, { type PatientLite } from "./PatientAutocomplete"
import type { Plan } from "@/lib/payments/types"

interface Props {
  open: boolean
  onClose: () => void
  defaultPriceSingle: number     // pesos enteros, ej. 80000
  defaultPricePack3: number      // pesos enteros, ej. 168000
  onSuccess: () => void
}

export default function RegistrarPagoManualModal({
  open,
  onClose,
  defaultPriceSingle,
  defaultPricePack3,
  onSuccess,
}: Props) {
  const [patient, setPatient] = useState<PatientLite | null>(null)
  const [plan, setPlan] = useState<Plan>("single")
  const [amount, setAmount] = useState<string>(String(defaultPriceSingle))
  const [notes, setNotes] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handlePlanChange(newPlan: Plan) {
    setPlan(newPlan)
    setAmount(String(newPlan === "single" ? defaultPriceSingle : defaultPricePack3))
  }

  function reset() {
    setPatient(null)
    setPlan("single")
    setAmount(String(defaultPriceSingle))
    setNotes("")
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!patient) {
      setError("Selecciona un paciente")
      return
    }
    startTransition(async () => {
      const res = await registerManualPayment({
        patientId: patient.id,
        plan,
        amountCop: Number(amount) || 0,
        notes,
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
        <h2 className="text-lg font-semibold text-neutral mb-1">Registrar pago manual</h2>
        <p className="mb-6 text-sm text-tertiary">
          Para pagos por transferencia, consignación o cualquier vía fuera de la pasarela. Otorga créditos al paciente inmediatamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Paciente</label>
            <div className="mt-1">
              <PatientAutocomplete value={patient} onChange={setPatient} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Plan</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePlanChange("single")}
                className={`rounded-lg border px-3 py-2 text-left ${
                  plan === "single" ? "border-primary bg-primary/5" : "border-tertiary/20"
                }`}
              >
                <div className="text-sm font-medium text-neutral">1 evaluación</div>
                <div className="text-xs text-tertiary">${defaultPriceSingle.toLocaleString("es-CO")}</div>
              </button>
              <button
                type="button"
                onClick={() => handlePlanChange("pack3")}
                className={`rounded-lg border px-3 py-2 text-left ${
                  plan === "pack3" ? "border-primary bg-primary/5" : "border-tertiary/20"
                }`}
              >
                <div className="text-sm font-medium text-neutral">3 evaluaciones</div>
                <div className="text-xs text-tertiary">${defaultPricePack3.toLocaleString("es-CO")}</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Monto cobrado (COP)</label>
            <div className="mt-1 flex rounded-lg border border-tertiary/20">
              <span className="flex items-center px-3 text-sm text-tertiary">$</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-r-lg px-2 py-2 text-sm focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-tertiary">
              Pre-llenado con el precio del plan. Editable si cobraste un monto distinto.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Nota / referencia</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Transferencia Bancolombia, ref 123456 — 12/05/2026"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              required
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
              {pending ? "Registrando..." : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

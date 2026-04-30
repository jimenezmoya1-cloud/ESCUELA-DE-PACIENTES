"use client"

import { useState, useTransition } from "react"
import { createStaff, type CreateStaffInput } from "@/app/(admin)/admin/personal/actions"

export default function InviteStaffForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [form, setForm] = useState<CreateStaffInput>({
    fullName: "",
    email: "",
    password: "",
    profession: "medico",
    specialty: "",
    medicalRegistration: "",
    professionalIdCard: "",
  })

  function update<K extends keyof CreateStaffInput>(key: K, value: CreateStaffInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await createStaff(form)
      if (!result.ok) {
        setError(result.error)
      } else {
        setSuccess(`Cuenta creada. Comparte el correo y la contraseña con ${form.fullName.trim()}.`)
        setForm({ fullName: "", email: "", password: "", profession: "medico", specialty: "", medicalRegistration: "", professionalIdCard: "" })
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        Crear clínico
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-tertiary/10 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral">Nombre completo *</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Correo *</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-medium text-neutral">Contraseña inicial *</span>
          <input
            type="text"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-tertiary">Compártela con el clínico para su primer ingreso.</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Profesión *</span>
          <select
            value={form.profession}
            onChange={(e) => update("profession", e.target.value as CreateStaffInput["profession"])}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="medico">Médico/a</option>
            <option value="enfermero">Enfermero/a</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Especialidad (opcional)</span>
          <input
            type="text"
            value={form.specialty ?? ""}
            onChange={(e) => update("specialty", e.target.value)}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Registro médico (opcional)</span>
          <input
            type="text"
            value={form.medicalRegistration ?? ""}
            onChange={(e) => update("medicalRegistration", e.target.value)}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Tarjeta profesional (opcional)</span>
          <input
            type="text"
            value={form.professionalIdCard ?? ""}
            onChange={(e) => update("professionalIdCard", e.target.value)}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear cuenta"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

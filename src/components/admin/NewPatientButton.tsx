"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, X } from "lucide-react"

interface Convenio {
  code: string
  name: string
}

export default function NewPatientButton({ convenios }: { convenios: Convenio[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [cedula, setCedula] = useState("")
  const [convenioCode, setConvenioCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const generatedCode = cedula.trim()
    ? `${convenioCode || "SC"}${cedula.trim()}`
    : ""

  function reset() {
    setName("")
    setCedula("")
    setConvenioCode("")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/create-patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedula.trim(),
          name: name.trim(),
          convenioCode: convenioCode || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear el paciente.")
        return
      }
      reset()
      setOpen(false)
      router.push(`/admin/pacientes/${data.userId}/historia-clinica?mode=new`)
      router.refresh()
    } catch {
      setError("Error de conexión. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        <UserPlus className="h-4 w-4" />
        Nuevo paciente
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral">Nuevo paciente</h2>
                <p className="text-xs text-tertiary">
                  El código se genera automáticamente con cédula y convenio.
                </p>
              </div>
              <button
                onClick={() => { setOpen(false); reset() }}
                className="rounded-lg p-1 text-tertiary hover:bg-background"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-tertiary">
                  Número de cédula *
                </label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej: 11875625"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-tertiary/30 px-3 py-2.5 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-tertiary">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="w-full rounded-lg border border-tertiary/30 px-3 py-2.5 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-tertiary">
                  Convenio (opcional)
                </label>
                <select
                  value={convenioCode}
                  onChange={(e) => setConvenioCode(e.target.value)}
                  className="w-full rounded-lg border border-tertiary/30 bg-white px-3 py-2.5 text-sm text-neutral focus:border-secondary focus:outline-none"
                >
                  <option value="">Sin convenio</option>
                  {convenios.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {generatedCode && (
                <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2.5">
                  <span className="text-xs text-tertiary">Código generado:</span>
                  <span className="font-mono text-sm font-bold text-primary">{generatedCode}</span>
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset() }}
                  className="rounded-lg border border-tertiary/30 px-4 py-2 text-sm text-tertiary hover:bg-background"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !cedula.trim() || !name.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "Creando..." : "Crear y abrir historia clínica"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

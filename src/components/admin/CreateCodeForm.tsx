"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Convenio {
  code: string
  name: string
}

export default function CreateCodeForm({ convenios }: { convenios: Convenio[] }) {
  const [cedula, setCedula] = useState("")
  const [convenioCode, setConvenioCode] = useState(convenios[0]?.code ?? "")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ code: string } | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()

  const generatedCode = convenioCode && cedula.trim()
    ? `${convenioCode}${cedula.trim()}`
    : ""

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch("/api/admin/create-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: cedula.trim(), convenioCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Error al crear el código.")
        return
      }

      setResult(data)
      setCedula("")
      router.refresh()
    } catch {
      setError("Error de conexión. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold text-neutral">Crear código de acceso</h2>
      <p className="mb-4 text-xs text-tertiary">
        El código se genera automáticamente: <span className="font-mono font-medium">CONVENIO + CÉDULA</span>
      </p>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Convenio</label>
            <select
              value={convenioCode}
              onChange={(e) => setConvenioCode(e.target.value)}
              className="w-full rounded-lg border border-tertiary/30 bg-white px-3 py-2.5 text-sm text-neutral focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            >
              {convenios.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Número de cédula</label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 11875625"
              required
              className="w-full rounded-lg border border-tertiary/30 px-3 py-2.5 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
            />
          </div>
        </div>

        {generatedCode && (
          <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-2.5">
            <span className="text-xs text-tertiary">Código que se creará:</span>
            <span className="font-mono text-sm font-bold text-primary">{generatedCode}</span>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
        )}

        {result && (
          <div className="flex items-center gap-3 rounded-lg bg-success/10 border border-success/20 px-4 py-3">
            <svg className="h-5 w-5 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-medium text-success">Código creado exitosamente</p>
              <p className="font-mono text-base font-bold text-neutral">{result.code}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !cedula.trim() || !convenioCode}
          className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {loading ? "Creando..." : "Crear código"}
        </button>
      </form>
    </div>
  )
}

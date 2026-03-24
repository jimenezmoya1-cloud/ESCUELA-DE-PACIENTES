"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Convenio {
  id: string
  code: string
  name: string
  is_active: boolean
}

export default function ConvenioManager({ convenios }: { convenios: Convenio[] }) {
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/create-convenio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name: name.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Error al crear el convenio.")
        return
      }

      setSuccess(`Convenio ${code.toUpperCase()} creado exitosamente.`)
      setCode("")
      setName("")
      router.refresh()
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  async function toggleConvenio(convenioId: string, currentActive: boolean) {
    await fetch("/api/admin/toggle-convenio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ convenioId, isActive: !currentActive }),
    })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Crear convenio */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-neutral">Agregar nuevo convenio</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-tertiary">
                Código del convenio
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                placeholder="Ej: SURA, COLSANITAS"
                maxLength={20}
                required
                className="w-full rounded-lg border border-tertiary/30 px-3 py-2.5 font-mono text-sm uppercase text-neutral placeholder:normal-case placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
              />
              <p className="mt-0.5 text-xs text-tertiary">Sin espacios, mayúsculas. Este prefijo se usa en los códigos de acceso.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-tertiary">
                Nombre completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Seguros SURA Colombia"
                required
                className="w-full rounded-lg border border-tertiary/30 px-3 py-2.5 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary/20"
              />
            </div>
          </div>

          {error && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
          {success && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{success}</p>}

          <button
            type="submit"
            disabled={loading || !code.trim() || !name.trim()}
            className="rounded-lg bg-secondary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear convenio"}
          </button>
        </form>
      </div>

      {/* Lista de convenios */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="border-b border-tertiary/10 px-5 py-4">
          <h2 className="font-semibold text-neutral">Convenios registrados</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tertiary/10 bg-background/50">
              <th className="px-4 py-3 text-left font-medium text-tertiary">Código</th>
              <th className="px-4 py-3 text-left font-medium text-tertiary">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-tertiary">Estado</th>
              <th className="px-4 py-3 text-left font-medium text-tertiary">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-tertiary/10">
            {convenios.map((conv) => (
              <tr key={conv.id} className="hover:bg-background/30">
                <td className="px-4 py-3 font-mono font-bold text-primary">{conv.code}</td>
                <td className="px-4 py-3 text-neutral">{conv.name}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    conv.is_active ? "bg-success/10 text-success" : "bg-tertiary/10 text-tertiary"
                  }`}>
                    {conv.is_active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleConvenio(conv.id, conv.is_active)}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                      conv.is_active
                        ? "text-error hover:bg-error/10"
                        : "text-success hover:bg-success/10"
                    }`}
                  >
                    {conv.is_active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Convenio { code: string; name: string }

export default function RegistroPage() {
  const [cedula, setCedula] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [hasConvenio, setHasConvenio] = useState(false)
  const [convenioCode, setConvenioCode] = useState("")
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from("convenios").select("code, name").eq("is_active", true).order("code")
      .then(({ data }) => setConvenios(data ?? []))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/claim-or-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedula.trim(),
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          convenioCode: hasConvenio ? convenioCode || null : null,
        }),
      })
      const text = await res.text()
      let data: { error?: string } = {}
      try { data = JSON.parse(text) } catch { /* HTML response */ }
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}: no se pudo registrar.`)
        return
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInErr) {
        setError("Cuenta creada, pero no se pudo iniciar sesión. Intente desde la pantalla de login.")
        return
      }

      router.push("/mi-camino")
      router.refresh()
    } catch {
      setError("Ocurrió un error inesperado. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-1 text-xl font-semibold text-neutral">Crear cuenta</h2>
      <p className="mb-6 text-sm text-tertiary">
        Ingrese su número de documento para iniciar.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-tertiary">
            Número de documento *
          </label>
          <input
            type="text"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 11875625"
            required
            inputMode="numeric"
            className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-lg font-mono tracking-wide text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-tertiary">Nombre completo *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            required
            className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-tertiary">Correo electrónico *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="juan@ejemplo.com"
            required
            className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-tertiary">Contraseña *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
          />
        </div>

        {/* Convenio sutil */}
        <div className="rounded-lg border border-tertiary/15 bg-background/50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={hasConvenio}
              onChange={(e) => {
                setHasConvenio(e.target.checked)
                if (!e.target.checked) setConvenioCode("")
              }}
              className="mt-0.5 h-4 w-4 rounded border-tertiary/30 text-primary focus:ring-primary"
            />
            <div className="text-sm">
              <span className="text-neutral">¿Viene de algún convenio?</span>
              <p className="text-xs text-tertiary">
                Si su empresa o aseguradora tiene convenio con CAIMED, indíquelo aquí.
              </p>
            </div>
          </label>
          {hasConvenio && (
            <div className="mt-3">
              <select
                value={convenioCode}
                onChange={(e) => setConvenioCode(e.target.value)}
                required
                className="w-full rounded-lg border border-tertiary/30 bg-white px-3 py-2.5 text-sm text-neutral focus:border-secondary focus:outline-none"
              >
                <option value="">Seleccione su convenio...</option>
                {convenios.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !cedula.trim() || !name.trim() || !email.trim() || password.length < 8 || (hasConvenio && !convenioCode)}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>

        <p className="text-center text-sm text-tertiary">
          ¿Ya tiene cuenta?{" "}
          <Link href="/login" className="text-secondary hover:underline">Iniciar sesión</Link>
        </p>
      </form>
    </div>
  )
}

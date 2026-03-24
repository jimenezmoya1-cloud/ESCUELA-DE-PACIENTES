"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Step = "code" | "form"

interface Convenio { code: string; name: string }

export default function RegistroPage() {
  const [step, setStep] = useState<Step>("code")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const [convenioCode, setConvenioCode] = useState("")
  const [cedula, setCedula] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from("convenios").select("code, name").eq("is_active", true).order("code")
      .then(({ data }) => {
        setConvenios(data ?? [])
        if (data && data.length > 0) setConvenioCode(data[0].code)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const generatedCode = convenioCode && cedula.trim()
    ? `${convenioCode}${cedula.trim()}`
    : ""

  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const codeToValidate = (code || generatedCode).trim().toUpperCase()

    try {
      const { data, error: fetchError } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", codeToValidate)
        .single()

      if (fetchError || !data) {
        setError("El código ingresado no es válido o no existe.")
        return
      }
      if (data.is_used) {
        setError("Este código ya fue utilizado.")
        return
      }

      // Autocompletar cedula y convenio desde el código validado
      if (data.cedula) setCedula(data.cedula)
      if (data.convenio_code) setConvenioCode(data.convenio_code)
      setCode(codeToValidate)
      setStep("form")
    } catch {
      setError("Ocurrió un error al validar el código. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: "patient" } },
      })

      if (authError) {
        setError(authError.message.includes("already registered")
          ? "Este correo electrónico ya está registrado."
          : "Error al crear la cuenta. Intente de nuevo.")
        return
      }
      if (!authData.user) {
        setError("Error inesperado al crear la cuenta.")
        return
      }

      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        name,
        email,
        role: "patient",
        cedula: cedula.trim() || null,
        convenio_code: convenioCode || null,
        access_code_used: code,
        registered_at: new Date().toISOString(),
      })

      if (profileError) {
        setError("Error al crear el perfil. Contacte al administrador.")
        return
      }

      await supabase.from("access_codes").update({
        is_used: true,
        used_by_user_id: authData.user.id,
        used_at: new Date().toISOString(),
      }).eq("code", code)

      router.push("/mi-camino")
    } catch {
      setError("Ocurrió un error inesperado. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold text-neutral">
        {step === "code" ? "Ingrese su código de acceso" : "Complete su registro"}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">{error}</div>
      )}

      {step === "code" ? (
        <form onSubmit={handleValidateCode} className="space-y-5">
          {/* Opción 1: convenio + cédula */}
          {convenios.length > 0 && (
            <div className="space-y-3 rounded-lg bg-background p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
                Opción 1 — Ingrese convenio y cédula
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-tertiary">Convenio</label>
                  <select
                    value={convenioCode}
                    onChange={(e) => setConvenioCode(e.target.value)}
                    className="w-full rounded-lg border border-tertiary/30 bg-white px-3 py-2.5 text-sm text-neutral focus:border-secondary focus:outline-none"
                  >
                    {convenios.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
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
                    className="w-full rounded-lg border border-tertiary/30 px-3 py-2.5 text-sm text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none"
                  />
                </div>
              </div>
              {generatedCode && (
                <div className="flex items-center gap-2 text-xs text-tertiary">
                  <span>Código generado:</span>
                  <span className="font-mono font-bold text-primary">{generatedCode}</span>
                </div>
              )}
            </div>
          )}

          {/* Opción 2: código directo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
              Opción 2 — Ingrese el código directamente
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: BMG11875625"
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 font-mono text-neutral placeholder:font-sans placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
            <p className="text-xs text-tertiary">
              Este código fue proporcionado por su médico o coordinador de CAIMED.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || (!code.trim() && !generatedCode)}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Validando..." : "Validar código"}
          </button>
          <p className="text-center text-sm text-tertiary">
            ¿Ya tiene cuenta?{" "}
            <Link href="/login" className="text-secondary hover:underline">Iniciar sesión</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="rounded-lg bg-background px-3 py-2 text-sm text-tertiary">
            Código validado: <span className="font-mono font-medium text-primary">{code}</span>
            {convenioCode && (
              <span className="ml-3 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                {convenioCode}
              </span>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Nombre completo</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez" required
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Correo electrónico</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@ejemplo.com" required
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-tertiary">Contraseña</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" required minLength={8}
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name || !email || password.length < 8}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
          <button type="button" onClick={() => setStep("code")}
            className="w-full text-center text-sm text-tertiary hover:text-secondary">
            ← Usar otro código
          </button>
        </form>
      )}
    </div>
  )
}

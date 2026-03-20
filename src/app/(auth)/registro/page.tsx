"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Step = "code" | "form"

export default function RegistroPage() {
  const [step, setStep] = useState<Step>("code")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleValidateCode(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error: fetchError } = await supabase
        .from("access_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .single()

      if (fetchError || !data) {
        setError("El código ingresado no es válido.")
        return
      }

      if (data.is_used) {
        setError("Este código ya fue utilizado.")
        return
      }

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
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: "patient",
          },
        },
      })

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("Este correo electrónico ya está registrado.")
        } else {
          setError("Error al crear la cuenta. Intente de nuevo.")
        }
        return
      }

      if (!authData.user) {
        setError("Error inesperado al crear la cuenta.")
        return
      }

      // 2. Crear perfil en tabla users
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        name,
        email,
        role: "patient",
        access_code_used: code.trim().toUpperCase(),
        registered_at: new Date().toISOString(),
      })

      if (profileError) {
        setError("Error al crear el perfil. Contacte al administrador.")
        return
      }

      // 3. Marcar código como usado
      await supabase
        .from("access_codes")
        .update({
          is_used: true,
          used_by_user_id: authData.user.id,
          used_at: new Date().toISOString(),
        })
        .eq("code", code.trim().toUpperCase())

      // 4. Redirigir al dashboard
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
        <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {step === "code" ? (
        <form onSubmit={handleValidateCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-tertiary">
              Código de acceso
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CAIMED-XXXX"
              required
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
            <p className="mt-1 text-xs text-tertiary">
              Este código fue proporcionado por su médico o coordinador de CAIMED.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Validando..." : "Validar código"}
          </button>
          <p className="text-center text-sm text-tertiary">
            ¿Ya tiene cuenta?{" "}
            <Link href="/login" className="text-secondary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="rounded-lg bg-background px-3 py-2 text-sm text-tertiary">
            Código validado: <span className="font-mono font-medium text-primary">{code.toUpperCase()}</span>
          </div>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-tertiary">
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              required
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-tertiary">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@ejemplo.com"
              required
              className="w-full rounded-lg border border-tertiary/30 px-4 py-3 text-neutral placeholder:text-tertiary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-tertiary">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
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
          <button
            type="button"
            onClick={() => setStep("code")}
            className="w-full text-center text-sm text-tertiary hover:text-secondary"
          >
            ← Usar otro código
          </button>
        </form>
      )}
    </div>
  )
}

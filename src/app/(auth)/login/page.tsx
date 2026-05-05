"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes("Email not confirmed")) {
          setError("Debe confirmar su correo electrónico antes de ingresar.")
        } else {
          setError("Correo o contraseña incorrectos.")
        }
        return
      }

      // Actualizar last_login_at y obtener rol en una sola query
      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", data.user.id)
          .select("role")
          .single()

        if (profile?.role === "admin") {
          router.push("/admin")
        } else if (profile?.role === "clinico") {
          router.push("/admin/clinico/dashboard")
        } else {
          router.push("/mi-camino")
        }
      }
    } catch {
      setError("Ocurrió un error. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      if (resetError) {
        setError("No se pudo enviar el correo de recuperación. Verifique su email.")
        return
      }

      setResetSent(true)
    } catch {
      setError("Ocurrió un error. Intente de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (resetSent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <svg className="h-8 w-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-semibold text-neutral">Revise su correo</h2>
        <p className="mb-6 text-sm text-tertiary">
          Enviamos un enlace de recuperación a <strong>{email}</strong>.
          Revise su bandeja de entrada y siga las instrucciones.
        </p>
        <button
          onClick={() => { setResetMode(false); setResetSent(false) }}
          className="text-sm text-secondary hover:underline"
        >
          Volver al inicio de sesión
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold text-neutral">
        {resetMode ? "Recuperar contraseña" : "Iniciar sesión"}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={resetMode ? handleResetPassword : handleLogin} className="space-y-4">
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
            className="w-full rounded-lg border border-white/60 bg-white/70 px-4 py-3 text-neutral shadow-inner placeholder:text-tertiary/50 transition-all duration-200 focus:border-secondary focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-secondary/30"
          />
        </div>

        {!resetMode && (
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-tertiary">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Su contraseña"
              required
              className="w-full rounded-lg border border-white/60 bg-white/70 px-4 py-3 text-neutral shadow-inner placeholder:text-tertiary/50 transition-all duration-200 focus:border-secondary focus:bg-white/90 focus:outline-none focus:ring-2 focus:ring-secondary/30"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || (!resetMode && !password)}
          className="w-full rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-3 font-medium text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
        >
          {loading
            ? resetMode ? "Enviando..." : "Ingresando..."
            : resetMode ? "Enviar enlace de recuperación" : "Iniciar sesión"
          }
        </button>

        <div className="flex flex-col items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => { setResetMode(!resetMode); setError("") }}
            className="text-secondary hover:underline"
          >
            {resetMode ? "Volver al inicio de sesión" : "¿Olvidó su contraseña?"}
          </button>

          {!resetMode && (
            <p className="text-tertiary">
              ¿Tiene un código de acceso?{" "}
              <Link href="/registro" className="text-secondary hover:underline">
                Registrarse
              </Link>
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

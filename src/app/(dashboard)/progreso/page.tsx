import { createClient } from "@/lib/supabase/server"
import { getModulesWithStatus, calculateProgress, formatDate } from "@/lib/modules"

export default async function ProgresoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single()

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("is_published", true)
    .order("order", { ascending: true })

  const { data: completions } = await supabase
    .from("module_completions")
    .select("*")
    .eq("user_id", user!.id)

  const modulesWithStatus = getModulesWithStatus(
    modules ?? [],
    completions ?? [],
    profile?.registered_at ?? new Date().toISOString()
  )

  const totalModules = modules?.length ?? 0
  const completedCount = completions?.length ?? 0
  const unlockedCount = modulesWithStatus.filter(
    (m) => m.status !== "locked_next" && m.status !== "locked_future"
  ).length
  const progress = calculateProgress(totalModules, completedCount)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral">Mi Progreso</h1>
        <p className="mt-1 text-sm text-tertiary">
          Registrado desde el {formatDate(profile?.registered_at ?? "")}
        </p>
      </div>

      {/* Resumen de progreso */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Completados</p>
          <p className="mt-1 text-3xl font-bold text-primary">
            {completedCount}<span className="text-lg text-tertiary">/{totalModules}</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Desbloqueados</p>
          <p className="mt-1 text-3xl font-bold text-secondary">{unlockedCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Progreso general</p>
          <p className="mt-1 text-3xl font-bold text-success">{progress}%</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-tertiary">Progreso del programa</span>
          <span className="font-medium text-neutral">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary to-success transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Detalle por módulo */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-tertiary/10 px-5 py-4">
          <h2 className="font-semibold text-neutral">Detalle por módulo</h2>
        </div>
        <div className="divide-y divide-tertiary/10">
          {modulesWithStatus.map((mod) => (
            <div key={mod.id} className="flex items-center gap-4 px-5 py-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  mod.status === "completed"
                    ? "bg-success/10 text-success"
                    : mod.status === "current"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-tertiary/10 text-tertiary"
                }`}
              >
                {mod.status === "completed" ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  mod.order
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  mod.status === "locked_next" || mod.status === "locked_future"
                    ? "text-tertiary"
                    : "text-neutral"
                }`}>
                  {mod.title}
                </p>
                {mod.completed_at && (
                  <p className="text-xs text-tertiary">
                    Completado el {formatDate(mod.completed_at)}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  mod.status === "completed"
                    ? "bg-success/10 text-success"
                    : mod.status === "current"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-tertiary/10 text-tertiary"
                }`}
              >
                {mod.status === "completed"
                  ? "Completado"
                  : mod.status === "current"
                    ? "Disponible"
                    : "Bloqueado"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

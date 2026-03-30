import { createClient } from "@/lib/supabase/server"
import { buildPersonalizedRoute, getModulesWithStatus, getModulesToUnlock, calculateProgress, formatDate } from "@/lib/modules"
import CircularProgress from "@/components/ui/CircularProgress"

export default async function ProgresoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user!.id)
    .single()

  // Get all published modules
  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("is_published", true)
    .order("order", { ascending: true })

  // Get patient's selected components
  const { data: patientComponents } = await supabase
    .from("patient_components")
    .select("*")
    .eq("patient_id", user!.id)
    .order("priority_order", { ascending: true })

  // Build personalized route
  const routeModules = buildPersonalizedRoute(
    modules ?? [],
    patientComponents ?? []
  )

  // Get unlocks
  const { data: existingUnlocks } = await supabase
    .from("patient_module_unlocks")
    .select("*")
    .eq("patient_id", user!.id)

  // Auto-unlock on page load
  const newUnlockIds = getModulesToUnlock(
    routeModules,
    existingUnlocks ?? [],
    profile?.registered_at ?? new Date().toISOString()
  )
  if (newUnlockIds.length > 0) {
    for (const moduleId of newUnlockIds) {
      await supabase.from("patient_module_unlocks").upsert({
        patient_id: user!.id,
        module_id: moduleId,
        unlocked_at: new Date().toISOString(),
      }, { onConflict: "patient_id,module_id" })
    }
  }

  const { data: allUnlocks } = await supabase
    .from("patient_module_unlocks")
    .select("*")
    .eq("patient_id", user!.id)

  const { data: completions } = await supabase
    .from("module_completions")
    .select("*")
    .eq("user_id", user!.id)

  // Get submodule counts per module
  const submoduleCounts: Record<string, { total: number; completed: number }> = {}
  for (const mod of routeModules) {
    const { count: totalSubs } = await supabase
      .from("submodules")
      .select("*", { count: "exact", head: true })
      .eq("module_id", mod.id)

    const { data: subIds } = await supabase
      .from("submodules")
      .select("id")
      .eq("module_id", mod.id)

    let completedSubs = 0
    if (subIds && subIds.length > 0) {
      const { count: compCount } = await supabase
        .from("submodule_completions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .in("submodule_id", subIds.map((s) => s.id))
      completedSubs = compCount ?? 0
    }

    submoduleCounts[mod.id] = { total: totalSubs ?? 0, completed: completedSubs }
  }

  const modulesWithStatus = getModulesWithStatus(
    routeModules,
    completions ?? [],
    allUnlocks ?? [],
    submoduleCounts,
  )

  const totalModules = routeModules.length
  const completedCount = completions?.length ?? 0
  const unlockedCount = modulesWithStatus.filter(
    (m) => m.status !== "locked_next" && m.status !== "locked_future"
  ).length
  const progress = calculateProgress(totalModules, completedCount)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#212B52]">Mi Progreso</h1>
        <p className="mt-1 text-base text-tertiary">
          Registrado desde el {formatDate(profile?.registered_at ?? "")}
        </p>
      </div>

      {/* Resumen de progreso */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Completados</p>
          <p className="mt-1 text-3xl font-bold text-[#06559F]">
            {completedCount}<span className="text-lg text-tertiary">/{totalModules}</span>
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Desbloqueados</p>
          <p className="mt-1 text-3xl font-bold text-[#1E8DCE]">{unlockedCount}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Progreso general</p>
          <p className="mt-1 text-3xl font-bold text-[#58AE33]">{progress}%</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mb-8 rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-tertiary">Progreso del programa</span>
          <span className="font-medium text-[#212B52]">{progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #06559F, #1E8DCE)"
            }}
          />
        </div>
      </div>

      {/* Detalle por módulo */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-tertiary/10 px-5 py-4">
          <h2 className="font-semibold text-[#212B52]">Tu ruta personalizada</h2>
        </div>
        <div className="divide-y divide-tertiary/10">
          {modulesWithStatus.map((mod, idx) => (
            <div key={mod.id} className="flex items-center gap-4 px-5 py-3">
              {/* Circular progress */}
              <CircularProgress
                percent={mod.progress_percent}
                size={40}
                strokeWidth={3.5}
                isCompleted={mod.status === "completed"}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  mod.status === "locked_next" || mod.status === "locked_future"
                    ? "text-tertiary"
                    : "text-[#212B52]"
                }`}>
                  {idx + 1}. {mod.title}
                </p>
                {mod.completed_at && (
                  <p className="text-xs text-tertiary">
                    Completado el {formatDate(mod.completed_at)}
                  </p>
                )}
                {mod.submodules_total > 0 && mod.status !== "locked_next" && mod.status !== "locked_future" && (
                  <p className="text-xs text-[#1E8DCE]">
                    {mod.submodules_completed}/{mod.submodules_total} secciones
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  mod.status === "completed"
                    ? "bg-[#58AE33]/10 text-[#58AE33]"
                    : mod.status === "current"
                      ? "bg-[#06559F]/10 text-[#06559F]"
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

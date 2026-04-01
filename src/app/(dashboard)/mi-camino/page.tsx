import { createClient } from "@/lib/supabase/server"
import { buildPersonalizedRoute, getModulesWithStatus, getModulesToUnlock } from "@/lib/modules"
import MiCaminoClient from "@/components/dashboard/MiCaminoClient"

export default async function MiCaminoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("users")
    .select("registered_at, has_selected_components, wants_salud_sexual")
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

  // Build personalized route (with sexual health opt-in)
  const routeModules = buildPersonalizedRoute(
    modules ?? [],
    patientComponents ?? [],
    profile?.wants_salud_sexual ?? false
  )

  // Get existing unlocks
  const { data: existingUnlocks } = await supabase
    .from("patient_module_unlocks")
    .select("*")
    .eq("patient_id", user!.id)

  // Get completions
  const { data: completions } = await supabase
    .from("module_completions")
    .select("*")
    .eq("user_id", user!.id)

  // Check and perform new unlocks (with completion-based logic)
  const newUnlockIds = getModulesToUnlock(
    routeModules,
    existingUnlocks ?? [],
    profile?.registered_at ?? new Date().toISOString(),
    completions ?? [],
    (existingUnlocks ?? []).map((u) => u.module_id)
  )

  // Save new unlocks to DB
  if (newUnlockIds.length > 0) {
    for (const moduleId of newUnlockIds) {
      await supabase.from("patient_module_unlocks").upsert({
        patient_id: user!.id,
        module_id: moduleId,
        unlocked_at: new Date().toISOString(),
      }, { onConflict: "patient_id,module_id" })
    }
  }

  // Get all unlocks (including just-created)
  const { data: allUnlocks } = await supabase
    .from("patient_module_unlocks")
    .select("*")
    .eq("patient_id", user!.id)

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

    submoduleCounts[mod.id] = {
      total: totalSubs ?? 0,
      completed: completedSubs,
    }
  }

  const modulesWithStatus = getModulesWithStatus(
    routeModules,
    completions ?? [],
    allUnlocks ?? [],
    submoduleCounts,
  )

  // Check if Module 1 is completed but components not yet selected
  const module1 = modulesWithStatus.find((_, i) => i === 0)
  const module1Completed = module1?.status === "completed"
  const needsComponentSelection = module1Completed && !profile?.has_selected_components

  // Encontrar la siguiente tarea pendiente
  const currentModule = modulesWithStatus.find((m) => m.status === "current")

  return (
    <MiCaminoClient
      modulesWithStatus={modulesWithStatus}
      currentModule={currentModule ?? null}
      needsComponentSelection={needsComponentSelection}
      patientId={user!.id}
      userEmail={user?.email || ""}
    />
  )
}

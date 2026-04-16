import { createClient } from "@/lib/supabase/server"
import { buildPersonalizedRoute, getModulesWithStatus, getModulesToUnlock } from "@/lib/modules"
import MiCaminoClient from "@/components/dashboard/MiCaminoClient"

export default async function MiCaminoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile, modules, components, unlocks and completions all in parallel
  const [
    { data: profile },
    { data: modules },
    { data: patientComponents },
    { data: existingUnlocks },
    { data: completions },
  ] = await Promise.all([
    supabase.from("users")
      .select("registered_at, has_selected_components, wants_salud_sexual, gender, takes_chronic_medication")
      .eq("id", user!.id)
      .single(),
    supabase.from("modules")
      .select("*")
      .eq("is_published", true)
      .order("order", { ascending: true }),
    supabase.from("patient_components")
      .select("*")
      .eq("patient_id", user!.id)
      .order("priority_order", { ascending: true }),
    supabase.from("patient_module_unlocks")
      .select("*")
      .eq("patient_id", user!.id),
    supabase.from("module_completions")
      .select("*")
      .eq("user_id", user!.id),
  ])

  // Build personalized route
  const routeModules = buildPersonalizedRoute(
    modules ?? [],
    patientComponents ?? [],
    profile?.wants_salud_sexual ?? false,
    profile?.gender ?? null,
    profile?.takes_chronic_medication ?? null
  )

  // Calculate and persist new unlocks
  const newUnlockIds = getModulesToUnlock(
    routeModules,
    existingUnlocks ?? [],
    profile?.registered_at ?? new Date().toISOString(),
    completions ?? [],
    (existingUnlocks ?? []).map((u) => u.module_id)
  )

  if (newUnlockIds.length > 0) {
    // Batch upsert instead of sequential loop
    await supabase.from("patient_module_unlocks").upsert(
      newUnlockIds.map((moduleId) => ({
        patient_id: user!.id,
        module_id: moduleId,
        unlocked_at: new Date().toISOString(),
      })),
      { onConflict: "patient_id,module_id" }
    )
  }

  // Get all unlocks (including just-created) — single query
  const { data: allUnlocks } = await supabase
    .from("patient_module_unlocks")
    .select("*")
    .eq("patient_id", user!.id)

  // ─── Batch submodule counts (2 queries instead of 3×N) ───────────────────
  const moduleIds = routeModules.map((m) => m.id)

  const [{ data: allSubmodules }, { data: allSubCompletions }] = await Promise.all([
    moduleIds.length > 0
      ? supabase.from("submodules").select("id, module_id").in("module_id", moduleIds)
      : Promise.resolve({ data: [] }),
    (async () => {
      // We need submodule ids first; run in sequence only if modules exist
      if (moduleIds.length === 0) return { data: [] }
      const { data: subs } = await supabase
        .from("submodules")
        .select("id")
        .in("module_id", moduleIds)
      const subIds = (subs ?? []).map((s) => s.id)
      if (subIds.length === 0) return { data: [] }
      return supabase
        .from("submodule_completions")
        .select("submodule_id")
        .eq("user_id", user!.id)
        .in("submodule_id", subIds)
    })(),
  ])

  // Build counts map in memory
  const completedSubSet = new Set((allSubCompletions ?? []).map((c) => c.submodule_id))
  const submoduleCounts: Record<string, { total: number; completed: number }> = {}
  for (const mod of routeModules) {
    const subs = (allSubmodules ?? []).filter((s) => s.module_id === mod.id)
    submoduleCounts[mod.id] = {
      total: subs.length,
      completed: subs.filter((s) => completedSubSet.has(s.id)).length,
    }
  }

  const modulesWithStatus = getModulesWithStatus(
    routeModules,
    completions ?? [],
    allUnlocks ?? [],
    submoduleCounts,
  )

  // Show selector once ever — as soon as user first arrives, regardless of module progress
  const needsComponentSelection = !profile?.has_selected_components
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

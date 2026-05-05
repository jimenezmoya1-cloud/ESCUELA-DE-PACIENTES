import { createClient } from "@/lib/supabase/server"
import { buildAutoRoute, getModulesAllUnlocked } from "@/lib/modules"
import MiCaminoClient from "@/components/dashboard/MiCaminoClient"

interface AssessmentComponent {
  nombre: string
  puntaje: number
}

export default async function MiCaminoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const [
    { data: clinicalProfile },
    { data: latestAssessment },
    { data: modules },
    { data: completions },
    { count: assessmentCount },
  ] = await Promise.all([
    supabase
      .from("patient_clinical_profile")
      .select("sexo")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("patient_assessments")
      .select("components, raw_questionnaire")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("modules")
      .select("*")
      .eq("is_published", true)
      .order("order", { ascending: true }),
    supabase
      .from("module_completions")
      .select("*")
      .eq("user_id", userId),
    supabase
      .from("patient_assessments")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
  ])

  const assessmentComponents = (latestAssessment?.components ?? []) as AssessmentComponent[]
  const takesChronicMedication =
    (latestAssessment?.raw_questionnaire as { takesMeds?: string } | null)?.takesMeds !== "false" &&
    assessmentComponents.some((c) => c.nombre === "Adherencia a medicamentos")

  const isFirstAssessment = (assessmentCount ?? 0) <= 1

  const { route: routeModules, pathCount } = buildAutoRoute(
    modules ?? [],
    assessmentComponents,
    clinicalProfile?.sexo ?? null,
    takesChronicMedication,
    isFirstAssessment,
  )

  // Submodule counts
  const moduleIds = routeModules.map((m) => m.id)
  const [{ data: allSubmodules }, { data: allSubCompletions }] = await Promise.all([
    moduleIds.length > 0
      ? supabase.from("submodules").select("id, module_id").in("module_id", moduleIds)
      : Promise.resolve({ data: [] as { id: string; module_id: string }[] }),
    (async () => {
      if (moduleIds.length === 0) return { data: [] as { submodule_id: string }[] }
      const { data: subs } = await supabase
        .from("submodules")
        .select("id")
        .in("module_id", moduleIds)
      const subIds = (subs ?? []).map((s) => s.id)
      if (subIds.length === 0) return { data: [] as { submodule_id: string }[] }
      const { data } = await supabase
        .from("submodule_completions")
        .select("submodule_id")
        .eq("user_id", userId)
        .in("submodule_id", subIds)
      return { data: data ?? [] }
    })(),
  ])

  const completedSubSet = new Set((allSubCompletions ?? []).map((c) => c.submodule_id))
  const submoduleCounts: Record<string, { total: number; completed: number }> = {}
  for (const mod of routeModules) {
    const subs = (allSubmodules ?? []).filter((s) => s.module_id === mod.id)
    submoduleCounts[mod.id] = {
      total: subs.length,
      completed: subs.filter((s) => completedSubSet.has(s.id)).length,
    }
  }

  const modulesWithStatus = getModulesAllUnlocked(routeModules, completions ?? [], submoduleCounts)

  const pathModules = modulesWithStatus.slice(0, pathCount)
  const libraryModules = modulesWithStatus.slice(pathCount)

  return (
    <MiCaminoClient
      pathModules={pathModules}
      libraryModules={libraryModules}
      hasAssessment={!!latestAssessment}
      userEmail={user?.email || ""}
    />
  )
}

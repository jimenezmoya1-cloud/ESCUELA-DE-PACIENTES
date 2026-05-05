import { createClient } from "@/lib/supabase/server"
import { buildAutoRoute, getModulesAllUnlocked } from "@/lib/modules"
import MiCaminoClient from "@/components/dashboard/MiCaminoClient"
import WelcomeHub, { type WelcomeAction } from "@/components/ui/WelcomeHub"
import { Calendar, FileHeart, BookOpen, MessageCircle, Trophy } from "lucide-react"

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
    { data: profileRow },
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
    supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .maybeSingle(),
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

  const iconCls = "h-6 w-6"
  const iconStroke = 1.75
  const patientActions: WelcomeAction[] = [
    {
      href: "/agendar",
      label: "Agendar evaluación",
      description: "Reserva tu próxima cita",
      icon: <Calendar className={iconCls} strokeWidth={iconStroke} />,
      accent: "primary",
    },
    {
      href: "/mi-historia-clinica",
      label: "Mi evaluación de salud",
      description: latestAssessment ? "Ver resultados y reportes" : "Aún no tienes evaluaciones",
      icon: <FileHeart className={iconCls} strokeWidth={iconStroke} />,
      accent: "secondary",
    },
    {
      href: "/comunidad",
      label: "Comunidad",
      description: "Conecta con otros pacientes",
      icon: <MessageCircle className={iconCls} strokeWidth={iconStroke} />,
      accent: "secondary",
    },
    {
      href: "/recompensas",
      label: "Mis recompensas",
      description: "Logros y badges",
      icon: <Trophy className={iconCls} strokeWidth={iconStroke} />,
      accent: "warning",
    },
    {
      href: "/progreso",
      label: "Mi progreso",
      description: "Tu avance en la escuela",
      icon: <BookOpen className={iconCls} strokeWidth={iconStroke} />,
      accent: "success",
    },
  ]

  return (
    <>
      <WelcomeHub
        name={profileRow?.name ?? "Paciente"}
        roleLabel="Escuela de pacientes"
        subtitle="¿Qué quieres hacer hoy?"
        actions={patientActions}
      />
      <MiCaminoClient
        pathModules={pathModules}
        libraryModules={libraryModules}
        hasAssessment={!!latestAssessment}
        userEmail={user?.email || ""}
      />
    </>
  )
}

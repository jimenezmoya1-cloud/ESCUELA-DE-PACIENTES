import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { formatDate, calculateProgress, getModulesWithStatus, buildPersonalizedRoute } from "@/lib/modules"
import AdminMessageThread from "@/components/admin/AdminMessageThread"

export default async function PacienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user: adminUser } } = await supabase.auth.getUser()

  // Obtener paciente
  const { data: patient } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single()

  if (!patient) notFound()

  // Obtener módulos
  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .eq("is_published", true)
    .order("order", { ascending: true })

  // Get patient's selected components
  const { data: patientComponents } = await supabase
    .from("patient_components")
    .select("*")
    .eq("patient_id", id)
    .order("priority_order", { ascending: true })

  // Build personalized route
  const routeModules = buildPersonalizedRoute(
    modules ?? [],
    patientComponents ?? []
  )

  // Completaciones
  const { data: completions } = await supabase
    .from("module_completions")
    .select("*")
    .eq("user_id", id)

  // Get unlocks
  const { data: unlocks } = await supabase
    .from("patient_module_unlocks")
    .select("*")
    .eq("patient_id", id)

  // Get submodule counts
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
        .eq("user_id", id)
        .in("submodule_id", subIds.map((s) => s.id))
      completedSubs = compCount ?? 0
    }
    submoduleCounts[mod.id] = { total: totalSubs ?? 0, completed: completedSubs }
  }

  const modulesWithStatus = getModulesWithStatus(
    routeModules,
    completions ?? [],
    unlocks ?? [],
    submoduleCounts,
  )

  const progress = calculateProgress(modules?.length ?? 0, completions?.length ?? 0)

  // Quiz responses
  const { data: quizResponses } = await supabase
    .from("quiz_responses")
    .select("*, modules(title)")
    .eq("user_id", id)
    .order("answered_at", { ascending: false })

  // Task submissions
  const { data: taskSubmissions } = await supabase
    .from("task_submissions")
    .select("*, modules(title)")
    .eq("user_id", id)
    .order("submitted_at", { ascending: false })

  // Sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", id)
    .order("started_at", { ascending: false })
    .limit(20)

  // Mensajes
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
    .order("sent_at", { ascending: true })

  // Tiempo total estimado
  const totalMinutes = sessions?.reduce((acc, s) => {
    if (s.ended_at) {
      const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
      return acc + diff / 1000 / 60
    }
    return acc
  }, 0) ?? 0

  return (
    <div>
      <a
        href="/admin/pacientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Volver a pacientes
      </a>

      {/* Encabezado del paciente */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral">{patient.name}</h1>
            <p className="text-tertiary">{patient.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/admin/pacientes/${id}/historia-clinica`}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Historia clínica →
            </a>
            <ExportButton patientId={id} patientName={patient.name} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-tertiary">Registro</p>
            <p className="font-medium text-neutral">{formatDate(patient.registered_at)}</p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Último acceso</p>
            <p className="font-medium text-neutral">
              {patient.last_login_at ? formatDate(patient.last_login_at) : "Nunca"}
            </p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Código usado</p>
            <p className="font-mono text-sm font-medium text-neutral">
              {patient.access_code_used ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-tertiary">Tiempo en plataforma</p>
            <p className="font-medium text-neutral">
              {totalMinutes > 60
                ? `${Math.round(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`
                : `${Math.round(totalMinutes)}m`}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-tertiary">Progreso</span>
            <span className="font-medium text-neutral">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-gradient-to-r from-secondary to-success"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Módulos */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Módulos ({completions?.length ?? 0}/{modules?.length ?? 0})</h2>
          </div>
          <div className="divide-y divide-tertiary/10">
            {modulesWithStatus.map((mod) => (
              <div key={mod.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    mod.status === "completed"
                      ? "bg-success/10 text-success"
                      : mod.status === "current"
                        ? "bg-secondary/10 text-secondary"
                        : "bg-tertiary/10 text-tertiary"
                  }`}
                >
                  {mod.status === "completed" ? "✓" : mod.order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral truncate">{mod.title}</p>
                  {mod.completed_at && (
                    <p className="text-xs text-tertiary">{formatDate(mod.completed_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mensajes */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Mensajes</h2>
          </div>
          <AdminMessageThread
            messages={messages ?? []}
            patientId={id}
            adminId={adminUser!.id}
          />
        </div>
      </div>

      {/* Tareas enviadas */}
      {taskSubmissions && taskSubmissions.length > 0 && (
        <div className="mt-6 rounded-xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Tareas enviadas</h2>
          </div>
          <div className="divide-y divide-tertiary/10">
            {taskSubmissions.map((ts: { id: string; content: string; submitted_at: string; modules: { title: string } | null }) => (
              <div key={ts.id} className="px-5 py-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral">
                    {ts.modules?.title ?? "Módulo"}
                  </p>
                  <p className="text-xs text-tertiary">{formatDate(ts.submitted_at)}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-tertiary">{ts.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Respuestas de quiz */}
      {quizResponses && quizResponses.length > 0 && (
        <div className="mt-6 rounded-xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Respuestas de evaluaciones</h2>
          </div>
          <div className="divide-y divide-tertiary/10">
            {quizResponses.map((qr: { id: string; question_id: string; answer: unknown; is_correct: boolean | null; answered_at: string; modules: { title: string } | null }) => (
              <div key={qr.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    qr.is_correct
                      ? "bg-success/10 text-success"
                      : "bg-error/10 text-error"
                  }`}
                >
                  {qr.is_correct ? "✓" : "✗"}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-neutral">{qr.modules?.title ?? "Quiz"}</p>
                  <p className="text-xs text-tertiary">{formatDate(qr.answered_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExportButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  return (
    <a
      href={`/api/admin/export-patient?id=${patientId}`}
      download={`reporte-${patientName.toLowerCase().replace(/\s+/g, "-")}.csv`}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
    >
      Exportar CSV
    </a>
  )
}

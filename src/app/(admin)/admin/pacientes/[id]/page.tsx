import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Calendar, Mail, Tag, Clock, FileHeart, Plus, Download, Coins } from "lucide-react"
import { formatDate, calculateProgress, getModulesWithStatus, buildPersonalizedRoute } from "@/lib/modules"
import AdminMessageThread from "@/components/admin/AdminMessageThread"
import UserAccessToggle from "@/components/admin/UserAccessToggle"
import PatientTabs, { type PatientTab } from "@/components/admin/PatientTabs"
import { getRemainingCreditsForPatient } from "@/lib/payments/credits"

function isPatientTab(value: string | undefined): value is PatientTab {
  return value === "escuela" || value === "admin" || value === "clinico"
}

export default async function PacienteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams
  const activeTab: PatientTab = isPatientTab(tab) ? tab : "escuela"

  const supabase = await createClient()
  const { data: { user: adminUser } } = await supabase.auth.getUser()

  const { data: patient } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single()

  if (!patient) notFound()

  return (
    <div>
      <Link
        href="/admin/pacientes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a pacientes
      </Link>

      {/* Header del paciente con glass */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-primary p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white ring-1 ring-white/30 backdrop-blur-md">
              {patient.name.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{patient.name}</h1>
              <p className="truncate text-sm text-white/80">{patient.email}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {patient.convenio_code && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/30 backdrop-blur-md">
                    <Tag className="h-3 w-3" />
                    {patient.convenio_code}
                  </span>
                )}
                {patient.cedula && (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 font-mono text-xs text-white ring-1 ring-white/30 backdrop-blur-md">
                    {patient.cedula}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Link
              href={`/admin/pacientes/${id}/historia-clinica?mode=new`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-transform hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              Nueva evaluación
            </Link>
            <a
              href={`/api/admin/export-patient?id=${id}`}
              download={`reporte-${patient.name.toLowerCase().replace(/\s+/g, "-")}.csv`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <Download className="h-4 w-4" />
              CSV
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <PatientTabs active={activeTab} patientId={id} />

      {/* Tab content */}
      {activeTab === "escuela" && <EscuelaTab patientId={id} adminId={adminUser!.id} />}
      {activeTab === "admin" && <AdminTab patient={patient} />}
      {activeTab === "clinico" && <ClinicoTab patientId={id} patientName={patient.name} />}
    </div>
  )
}

/* ---------------------------------- ESCUELA ---------------------------------- */
async function EscuelaTab({ patientId, adminId }: { patientId: string; adminId: string }) {
  const supabase = await createClient()

  const [
    { data: modules },
    { data: patientComponents },
    { data: completions },
    { data: unlocks },
    { data: quizResponses },
    { data: taskSubmissions },
    { data: messages },
  ] = await Promise.all([
    supabase.from("modules").select("*").eq("is_published", true).order("order", { ascending: true }),
    supabase.from("patient_components").select("*").eq("patient_id", patientId).order("priority_order", { ascending: true }),
    supabase.from("module_completions").select("*").eq("user_id", patientId),
    supabase.from("patient_module_unlocks").select("*").eq("patient_id", patientId),
    supabase.from("quiz_responses").select("*, modules(title)").eq("user_id", patientId).order("answered_at", { ascending: false }),
    supabase.from("task_submissions").select("*, modules(title)").eq("user_id", patientId).order("submitted_at", { ascending: false }),
    supabase.from("messages").select("*").or(`from_user_id.eq.${patientId},to_user_id.eq.${patientId}`).order("sent_at", { ascending: true }),
  ])

  const routeModules = buildPersonalizedRoute(modules ?? [], patientComponents ?? [])

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
        .eq("user_id", patientId)
        .in("submodule_id", subIds.map((s) => s.id))
      completedSubs = compCount ?? 0
    }
    submoduleCounts[mod.id] = { total: totalSubs ?? 0, completed: completedSubs }
  }

  const modulesWithStatus = getModulesWithStatus(routeModules, completions ?? [], unlocks ?? [], submoduleCounts)
  const progress = calculateProgress(modules?.length ?? 0, completions?.length ?? 0)

  return (
    <div className="space-y-6">
      {/* Progress card */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold text-neutral">Progreso general</p>
          <span className="text-2xl font-bold text-secondary tabular-nums">{progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary to-success transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-tertiary">
          {completions?.length ?? 0} de {modules?.length ?? 0} módulos completados
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Módulos */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">
              Módulos ({completions?.length ?? 0}/{modules?.length ?? 0})
            </h2>
          </div>
          <div className="max-h-96 divide-y divide-tertiary/10 overflow-y-auto">
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral">{mod.title}</p>
                  {mod.completed_at && (
                    <p className="text-xs text-tertiary">{formatDate(mod.completed_at)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mensajes */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Mensajes</h2>
          </div>
          <AdminMessageThread messages={messages ?? []} patientId={patientId} adminId={adminId} />
        </div>
      </div>

      {/* Tareas */}
      {taskSubmissions && taskSubmissions.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Tareas enviadas</h2>
          </div>
          <div className="divide-y divide-tertiary/10">
            {taskSubmissions.map((ts: { id: string; content: string; submitted_at: string; modules: { title: string } | null }) => (
              <div key={ts.id} className="px-5 py-4">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-medium text-neutral">{ts.modules?.title ?? "Módulo"}</p>
                  <p className="text-xs text-tertiary">{formatDate(ts.submitted_at)}</p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-tertiary">{ts.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quizzes */}
      {quizResponses && quizResponses.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Respuestas de evaluaciones</h2>
          </div>
          <div className="divide-y divide-tertiary/10">
            {quizResponses.map((qr: { id: string; question_id: string; answer: unknown; is_correct: boolean | null; answered_at: string; modules: { title: string } | null }) => (
              <div key={qr.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    qr.is_correct ? "bg-success/10 text-success" : "bg-error/10 text-error"
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

/* -------------------------------- ADMINISTRATIVO ------------------------------- */
async function AdminTab({ patient }: { patient: { id: string; name: string; email: string; cedula: string | null; convenio_code: string | null; registered_at: string; last_login_at: string | null; access_code_used: string | null; is_active: boolean | null } }) {
  const supabase = await createClient()

  const [{ data: sessions }, credits] = await Promise.all([
    supabase
      .from("sessions")
      .select("started_at, ended_at")
      .eq("user_id", patient.id)
      .order("started_at", { ascending: false })
      .limit(50),
    getRemainingCreditsForPatient(patient.id).catch(() => 0),
  ])

  const totalMinutes = (sessions ?? []).reduce((acc, s) => {
    if (s.ended_at) {
      const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()
      return acc + diff / 1000 / 60
    }
    return acc
  }, 0)

  const tiempoFormatted =
    totalMinutes > 60
      ? `${Math.round(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`
      : `${Math.round(totalMinutes)}m`

  return (
    <div className="space-y-6">
      {/* Datos de cuenta */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-neutral">Datos de cuenta</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DataField icon={Calendar} label="Registro" value={formatDate(patient.registered_at)} />
          <DataField icon={Clock} label="Último acceso" value={patient.last_login_at ? formatDate(patient.last_login_at) : "Nunca"} />
          <DataField icon={Tag} label="Código usado" value={patient.access_code_used ?? "—"} mono />
          <DataField icon={Mail} label="Email" value={patient.email} />
        </div>
      </div>

      {/* Créditos */}
      <div className="rounded-2xl bg-gradient-to-br from-warning/10 via-white to-white p-6 shadow-sm ring-1 ring-warning/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Coins className="h-5 w-5 text-warning" />
              <h2 className="font-semibold text-neutral">Créditos de evaluación</h2>
            </div>
            <p className="text-sm text-tertiary">Disponibles para agendar citas con clínico</p>
          </div>
          <span className="text-3xl font-bold text-warning tabular-nums">{credits}</span>
        </div>
        <Link
          href="/admin/citas/pagos"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Gestionar créditos y pagos →
        </Link>
      </div>

      {/* Acceso y actividad */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-neutral">Acceso</h2>
          <p className="mb-3 text-sm text-tertiary">
            Permite o suspende el acceso del paciente a la plataforma.
          </p>
          <UserAccessToggle
            userId={patient.id}
            initialActive={patient.is_active ?? true}
            patientName={patient.name}
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-neutral">Tiempo en plataforma</h2>
          <p className="text-3xl font-bold text-secondary tabular-nums">{tiempoFormatted}</p>
          <p className="mt-1 text-sm text-tertiary">{sessions?.length ?? 0} sesiones registradas</p>
        </div>
      </div>
    </div>
  )
}

function DataField({ icon: Icon, label, value, mono }: { icon: typeof Calendar; label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs text-tertiary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={`text-sm font-medium text-neutral ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  )
}

/* ----------------------------------- CLÍNICO ---------------------------------- */
async function ClinicoTab({ patientId, patientName }: { patientId: string; patientName: string }) {
  const supabase = await createClient()

  const [{ data: assessments }, { data: appointments }] = await Promise.all([
    supabase
      .from("patient_assessments")
      .select("id, created_at, score_global, nivel")
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, clinician_id")
      .eq("patient_id", patientId)
      .order("starts_at", { ascending: false })
      .limit(10),
  ])

  const upcoming = (appointments ?? []).filter(
    (a: { starts_at: string; status: string }) => a.status === "scheduled" && new Date(a.starts_at) >= new Date()
  )
  const past = (appointments ?? []).filter(
    (a: { starts_at: string; status: string }) => !(a.status === "scheduled" && new Date(a.starts_at) >= new Date())
  )

  // Get clinician names
  const clinicianIds = Array.from(new Set((appointments ?? []).map((a: { clinician_id: string | null }) => a.clinician_id).filter(Boolean))) as string[]
  const { data: clinicians } = clinicianIds.length > 0
    ? await supabase.from("users").select("id, name").in("id", clinicianIds)
    : { data: [] as { id: string; name: string }[] }
  const clinicianMap = new Map((clinicians ?? []).map((c) => [c.id, c.name]))

  return (
    <div className="space-y-6">
      {/* CTA principal: nueva evaluación */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <FileHeart className="h-8 w-8 shrink-0 text-white/90" strokeWidth={1.5} />
            <div>
              <h2 className="text-lg font-bold">Evaluación de salud</h2>
              <p className="text-sm text-white/80">
                {assessments && assessments.length > 0
                  ? `${assessments.length} evaluación(es) registrada(s)`
                  : `${patientName} aún no tiene evaluaciones`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/pacientes/${patientId}/historia-clinica?mode=new`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-transform hover:scale-105"
            >
              <Plus className="h-4 w-4" />
              Nueva evaluación
            </Link>
            {assessments && assessments.length > 0 && (
              <Link
                href={`/admin/pacientes/${patientId}/historia-clinica`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/25"
              >
                Ver todas
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Línea de tiempo */}
      {assessments && assessments.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-tertiary/10 px-5 py-4">
            <h2 className="font-semibold text-neutral">Últimas evaluaciones</h2>
          </div>
          <div className="divide-y divide-tertiary/10">
            {assessments.map((a: { id: string; created_at: string; score_global: number; nivel: string }) => (
              <Link
                key={a.id}
                href={`/admin/pacientes/${patientId}/historia-clinica?report=${a.id}`}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-background/40"
              >
                <Calendar className="h-4 w-4 shrink-0 text-tertiary" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral">{formatDate(a.created_at)}</p>
                </div>
                <span className="font-bold text-neutral tabular-nums">{a.score_global}/100</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                    a.nivel === "Verde"
                      ? "bg-success/10 text-success"
                      : a.nivel === "Amarillo"
                        ? "bg-warning/10 text-warning"
                        : "bg-error/10 text-error"
                  }`}
                >
                  {a.nivel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Citas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AppointmentList title="Próximas citas" items={upcoming} clinicianMap={clinicianMap} emptyMsg="Sin citas programadas." />
        <AppointmentList title="Citas pasadas" items={past} clinicianMap={clinicianMap} emptyMsg="Sin historial de citas." />
      </div>
    </div>
  )
}

function AppointmentList({
  title,
  items,
  clinicianMap,
  emptyMsg,
}: {
  title: string
  items: { id: string; starts_at: string; status: string; clinician_id: string | null }[]
  clinicianMap: Map<string, string>
  emptyMsg: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-tertiary/10 px-5 py-4">
        <h2 className="font-semibold text-neutral">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-tertiary">{emptyMsg}</p>
      ) : (
        <div className="divide-y divide-tertiary/10">
          {items.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3">
              <Calendar className="h-4 w-4 shrink-0 text-tertiary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral">
                  {new Date(a.starts_at).toLocaleString("es-CO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {a.clinician_id && clinicianMap.get(a.clinician_id) && (
                  <p className="truncate text-xs text-tertiary">{clinicianMap.get(a.clinician_id)}</p>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  a.status === "scheduled"
                    ? "bg-secondary/10 text-secondary"
                    : a.status === "completed"
                      ? "bg-success/10 text-success"
                      : a.status === "cancelled"
                        ? "bg-error/10 text-error"
                        : "bg-tertiary/10 text-tertiary"
                }`}
              >
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

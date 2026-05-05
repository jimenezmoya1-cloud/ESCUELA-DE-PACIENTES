import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import WelcomeHub, { type WelcomeAction } from "@/components/ui/WelcomeHub"
import DashboardAlerts from "@/components/admin/DashboardAlerts"
import {
  Users,
  Calendar,
  Building2,
  Tag,
  BookOpen,
  UserCheck,
  Settings,
  MessageCircle,
} from "lucide-react"

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ convenio?: string }>
}) {
  const { convenio } = await searchParams
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Base query filtrada por convenio
  let patientQuery = supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient")
  if (convenio && convenio !== "todos") patientQuery = patientQuery.eq("convenio_code", convenio)

  const [
    { count: totalPatients },
    { count: activeWeek },
    { count: activeMonth },
    { count: totalCompletions },
    { count: totalModules },
    { count: unansweredMessages },
    { data: convenios },
    { data: allPatients },
    { data: allCompletions },
    { data: taskSubs },
    { data: quizResps },
    { data: modules },
  ] = await Promise.all([
    patientQuery,
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient")
      .gte("last_login_at", sevenDaysAgo.toISOString())
      .then((r) => convenio && convenio !== "todos"
        ? supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient").eq("convenio_code", convenio).gte("last_login_at", sevenDaysAgo.toISOString())
        : r),
    supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "patient")
      .gte("last_login_at", thirtyDaysAgo.toISOString()),
    supabase.from("module_completions").select("*", { count: "exact", head: true }),
    supabase.from("modules").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("messages").select("*", { count: "exact", head: true }).is("read_at", null),
    supabase.from("convenios").select("code, name").eq("is_active", true).order("code"),
    supabase.from("users").select("id, name, convenio_code, registered_at, is_active").eq("role", "patient"),
    supabase.from("module_completions").select("user_id, module_id"),
    supabase.from("task_submissions").select("user_id"),
    supabase.from("quiz_responses").select("user_id"),
    supabase.from("modules").select("id, title, order").eq("is_published", true).order("order"),
  ])

  // KPIs calculados
  const suspendedCount = allPatients?.filter((p) => !p.is_active).length ?? 0
  const completionsByModule = new Map<string, number>()
  allCompletions?.forEach((c) => {
    completionsByModule.set(c.module_id, (completionsByModule.get(c.module_id) ?? 0) + 1)
  })

  let mostCompletedTitle = "—"
  let mostCompletedCount = 0
  completionsByModule.forEach((count, moduleId) => {
    if (count > mostCompletedCount) {
      mostCompletedCount = count
      mostCompletedTitle = modules?.find((m) => m.id === moduleId)?.title ?? "—"
    }
  })

  const avgProgress = totalPatients && totalModules && totalPatients > 0
    ? Math.round(((totalCompletions ?? 0) / ((totalPatients ?? 1) * (totalModules ?? 1))) * 100)
    : 0

  const uniqueTaskUsers = new Set(taskSubs?.map((t) => t.user_id)).size
  const uniqueQuizUsers = new Set(quizResps?.map((q) => q.user_id)).size

  // Pacientes nuevos esta semana
  const newThisWeek = allPatients?.filter(
    (p) => new Date(p.registered_at) >= sevenDaysAgo
  ).length ?? 0

  // Por convenio stats
  const byConvenio = new Map<string, number>()
  allPatients?.forEach((p) => {
    const c = p.convenio_code ?? "Sin convenio"
    byConvenio.set(c, (byConvenio.get(c) ?? 0) + 1)
  })

  // Progreso por módulo (% de pacientes que lo completaron)
  const moduleProgress = modules?.map((mod) => ({
    title: mod.title.length > 28 ? mod.title.slice(0, 28) + "…" : mod.title,
    order: mod.order,
    count: completionsByModule.get(mod.id) ?? 0,
    pct: totalPatients && totalPatients > 0
      ? Math.round(((completionsByModule.get(mod.id) ?? 0) / totalPatients) * 100)
      : 0,
  })) ?? []

  const iconCls = "h-6 w-6"
  const iconStroke = 1.75
  const adminActions: WelcomeAction[] = [
    { href: "/admin/pacientes", label: "Pacientes", description: `${totalPatients ?? 0} registrados`, icon: <Users className={iconCls} strokeWidth={iconStroke} />, accent: "primary" },
    { href: "/admin/citas", label: "Citas", description: "Agenda y pagos", icon: <Calendar className={iconCls} strokeWidth={iconStroke} />, accent: "secondary" },
    { href: "/admin/convenios", label: "Convenios", description: "Empresas aliadas", icon: <Building2 className={iconCls} strokeWidth={iconStroke} />, accent: "secondary" },
    { href: "/admin/codigos", label: "Códigos de acceso", description: "Crear y gestionar", icon: <Tag className={iconCls} strokeWidth={iconStroke} />, accent: "success" },
    { href: "/admin/contenido", label: "Contenido", description: "Módulos y lecciones", icon: <BookOpen className={iconCls} strokeWidth={iconStroke} />, accent: "primary" },
    { href: "/admin/personal", label: "Personal", description: "Equipo clínico y admin", icon: <UserCheck className={iconCls} strokeWidth={iconStroke} />, accent: "warning" },
    { href: "/admin/blog", label: "Blog", description: "Moderar publicaciones", icon: <MessageCircle className={iconCls} strokeWidth={iconStroke} />, accent: "secondary", badge: unansweredMessages ?? 0 },
    { href: "/admin/configuracion", label: "Configuración", description: "Ajustes del sistema", icon: <Settings className={iconCls} strokeWidth={iconStroke} />, accent: "primary" },
  ]

  return (
    <div>
      <WelcomeHub
        name={profile?.name ?? "Admin"}
        roleLabel="Administrador"
        subtitle="¿Qué quieres hacer hoy?"
        actions={adminActions}
      />

      <DashboardAlerts />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-neutral">Resumen</h2>

        {/* Filtro por convenio */}
        <form method="GET" className="flex items-center gap-2">
          <select
            name="convenio"
            defaultValue={convenio ?? "todos"}
            className="rounded-lg border border-tertiary/30 bg-white px-3 py-2 text-sm text-neutral focus:border-secondary focus:outline-none"
          >
            <option value="todos">Todos los convenios</option>
            {convenios?.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-white hover:bg-secondary/90">
            Filtrar
          </button>
        </form>
      </div>

      {/* KPIs principales */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Pacientes registrados" value={totalPatients ?? 0} color="primary" icon="users" />
        <MetricCard label="Nuevos esta semana" value={newThisWeek} color="secondary" icon="plus" />
        <MetricCard label="Activos (7 días)" value={activeWeek ?? 0} color="secondary" icon="activity" />
        <MetricCard label="Accesos suspendidos" value={suspendedCount} color={suspendedCount > 0 ? "error" : "tertiary"} icon="lock" />
      </div>

      {/* KPIs secundarios */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Activos (30 días)" value={activeMonth ?? 0} color="secondary" icon="calendar" />
        <MetricCard label="Progreso global" value={avgProgress} suffix="%" color="success" icon="chart" />
        <MetricCard label="Con tareas enviadas" value={uniqueTaskUsers} color="primary" icon="pencil" />
        <MetricCard label="Mensajes sin leer" value={unansweredMessages ?? 0} color={unansweredMessages && unansweredMessages > 0 ? "error" : "tertiary"} icon="message" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Módulo más completado */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 font-semibold text-neutral">Módulo más completado</p>
          <p className="text-lg font-bold text-secondary">{mostCompletedTitle}</p>
          {mostCompletedCount > 0 && (
            <p className="mt-0.5 text-sm text-tertiary">{mostCompletedCount} completaciones</p>
          )}
          <div className="mt-3 text-sm text-tertiary">
            Pacientes con quizzes: <span className="font-semibold text-neutral">{uniqueQuizUsers}</span>
          </div>
        </div>

        {/* Por convenio */}
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-3 font-semibold text-neutral">Pacientes por convenio</p>
          <div className="space-y-3">
            {Array.from(byConvenio.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => {
                const pct = totalPatients ? Math.round((count / totalPatients) * 100) : 0
                return (
                  <div key={code}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="truncate font-mono text-xs font-bold text-primary" title={code}>
                        {code}
                      </span>
                      <span className="shrink-0 text-xs text-tertiary tabular-nums">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-secondary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            {byConvenio.size === 0 && (
              <p className="text-sm text-tertiary">Sin datos aún.</p>
            )}
          </div>
        </div>
      </div>

      {/* Progreso por módulo */}
      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <p className="mb-4 font-semibold text-neutral">Completación por módulo</p>
        <div className="space-y-3">
          {moduleProgress.map((mod) => (
            <div key={mod.order}>
              <div className="mb-1 flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-tertiary">{mod.order}</span>
                <span className="flex-1 truncate text-xs text-neutral" title={mod.title}>{mod.title}</span>
                <span className="shrink-0 text-xs text-tertiary tabular-nums">{mod.count} ({mod.pct}%)</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${mod.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

function MetricCard({
  label, value, color, suffix = "", icon,
}: {
  label: string; value: number; color: string; suffix?: string; icon?: string
}) {
  const colorClasses: Record<string, string> = {
    primary: "text-primary", secondary: "text-secondary",
    success: "text-success", error: "text-error", tertiary: "text-tertiary",
  }
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-tertiary">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${colorClasses[color] ?? "text-neutral"}`}>
        {value}{suffix}
      </p>
    </div>
  )
}

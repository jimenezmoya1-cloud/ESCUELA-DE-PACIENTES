import { createClient } from "@/lib/supabase/server"

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Total pacientes
  const { count: totalPatients } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient")

  // Pacientes activos últimos 7 días
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const { count: activeWeek } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient")
    .gte("last_login_at", sevenDaysAgo.toISOString())

  // Pacientes activos últimos 30 días
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { count: activeMonth } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "patient")
    .gte("last_login_at", thirtyDaysAgo.toISOString())

  // Total módulos completados
  const { count: totalCompletions } = await supabase
    .from("module_completions")
    .select("*", { count: "exact", head: true })

  // Total módulos publicados
  const { count: totalModules } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true)

  // Módulo más completado
  const { data: topModule } = await supabase
    .from("module_completions")
    .select("module_id, modules(title)")
    .limit(100)

  const moduleCounts = new Map<string, { count: number; title: string }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topModule?.forEach((mc: any) => {
    const existing = moduleCounts.get(mc.module_id)
    if (existing) {
      existing.count++
    } else {
      moduleCounts.set(mc.module_id, {
        count: 1,
        title: mc.modules?.title ?? "Desconocido",
      })
    }
  })

  let mostCompletedModule = "—"
  let maxCount = 0
  moduleCounts.forEach((val) => {
    if (val.count > maxCount) {
      maxCount = val.count
      mostCompletedModule = val.title
    }
  })

  // Mensajes sin responder
  const { count: unansweredMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .is("read_at", null)
    .neq("from_user_id", (await supabase.auth.getUser()).data.user!.id)

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral">Dashboard</h1>

      {/* Métricas principales */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Pacientes registrados"
          value={totalPatients ?? 0}
          color="primary"
        />
        <MetricCard
          label="Activos (7 días)"
          value={activeWeek ?? 0}
          color="secondary"
        />
        <MetricCard
          label="Activos (30 días)"
          value={activeMonth ?? 0}
          color="secondary"
        />
        <MetricCard
          label="Mensajes sin leer"
          value={unansweredMessages ?? 0}
          color={unansweredMessages && unansweredMessages > 0 ? "error" : "tertiary"}
        />
      </div>

      {/* Métricas de progreso */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Total completaciones</p>
          <p className="mt-1 text-2xl font-bold text-neutral">{totalCompletions ?? 0}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Tasa de completación</p>
          <p className="mt-1 text-2xl font-bold text-success">
            {totalPatients && totalModules && totalPatients > 0
              ? Math.round(((totalCompletions ?? 0) / ((totalPatients ?? 1) * (totalModules ?? 1))) * 100)
              : 0}%
          </p>
          <p className="mt-0.5 text-xs text-tertiary">completados / desbloqueados</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-tertiary">Módulo más completado</p>
          <p className="mt-1 text-lg font-semibold text-neutral">{mostCompletedModule}</p>
          {maxCount > 0 && (
            <p className="text-xs text-tertiary">{maxCount} completaciones</p>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <a
          href="/admin/pacientes"
          className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-neutral">Ver pacientes</p>
            <p className="text-xs text-tertiary">Gestionar perfiles y progreso</p>
          </div>
        </a>
        <a
          href="/admin/codigos"
          className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-neutral">Códigos de acceso</p>
            <p className="text-xs text-tertiary">Generar y gestionar códigos</p>
          </div>
        </a>
        <a
          href="/admin/contenido"
          className="flex items-center gap-3 rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
            <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-neutral">Gestión de contenido</p>
            <p className="text-xs text-tertiary">Módulos y lecciones</p>
          </div>
        </a>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  const colorClasses: Record<string, string> = {
    primary: "text-primary",
    secondary: "text-secondary",
    success: "text-success",
    error: "text-error",
    tertiary: "text-tertiary",
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-tertiary">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${colorClasses[color] ?? "text-neutral"}`}>
        {value}
      </p>
    </div>
  )
}

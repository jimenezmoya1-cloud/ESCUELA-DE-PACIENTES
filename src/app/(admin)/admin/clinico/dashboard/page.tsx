import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { computeDashboard, type DashboardFilters } from "@/lib/clinical/dashboard-aggregations"
import TrendChart from "@/components/admin/clinical/TrendChart"

export const dynamic = "force-dynamic"

interface SearchParams {
  convenio?: string
  doctor?: string
  startDate?: string
  endDate?: string
}

function localDateToISO(ymd: string, endOfDay: boolean): string {
  const [y, m, d] = ymd.split("-").map(Number)
  const date = endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0)
  return date.toISOString()
}

export default async function ClinicoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const filters: DashboardFilters = {
    convenio: sp.convenio ?? null,
    doctor: sp.doctor ?? null,
    startDate: sp.startDate ? localDateToISO(sp.startDate, false) : null,
    endDate: sp.endDate ? localDateToISO(sp.endDate, true) : null,
  }

  const supabase = await createClient()
  const data = await computeDashboard(supabase, filters)

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Dashboard clínico</h1>
        <p className="text-sm text-tertiary">
          Métricas agregadas sobre la última evaluación de salud de cada paciente.{" "}
          {data.kpis.totalAssessments} evaluaciones · {data.kpis.totalPatients} pacientes en cohorte filtrada.
        </p>
      </header>

      {/* Filtros globales */}
      <form
        method="GET"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl bg-white p-4 shadow-sm border border-tertiary/10"
      >
        <label className="block">
          <span className="text-xs font-medium text-tertiary block mb-1">Convenio</span>
          <select
            name="convenio"
            defaultValue={sp.convenio ?? "todos"}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            {data.resolvedFilters.convenios.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-tertiary block mb-1">Médico responsable</span>
          <select
            name="doctor"
            defaultValue={sp.doctor ?? "todos"}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          >
            <option value="todos">Todos</option>
            {data.resolvedFilters.staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-tertiary block mb-1">Desde</span>
          <input
            type="date"
            name="startDate"
            defaultValue={sp.startDate ?? ""}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-tertiary block mb-1">Hasta</span>
          <input
            type="date"
            name="endDate"
            defaultValue={sp.endDate ?? ""}
            className="w-full rounded-lg border border-tertiary/20 bg-white px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            Aplicar
          </button>
          <Link
            href="/admin/clinico/dashboard"
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm text-tertiary hover:bg-background"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {/* Banda 1 — KPIs */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tertiary mb-3">Cohorte</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Pacientes"
            value={data.kpis.totalPatients.toString()}
            sub={`${data.kpis.newPatientsThisMonth} nuevos este mes`}
          />
          <KpiCard
            label="Con evaluación"
            value={data.kpis.patientsWithAssessment.toString()}
            sub={`${data.kpis.totalAssessments} evaluaciones totales`}
          />
          <KpiCard
            label="Sin seguimiento >6 meses"
            value={data.kpis.patientsWithoutAssessmentInLast6Months.toString()}
            accent="warn"
          />
          <KpiCard
            label="Convenios activos"
            value={data.kpis.byConvenio.length.toString()}
            sub={topConvenioLabel(data.kpis.byConvenio)}
          />
        </div>
      </section>

      {/* Banda 2 — Tarjetas componentes */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tertiary mb-3">Componentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {data.cards.map((c) => (
            <div
              key={c.key}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                c.hasData ? "border-tertiary/15" : "border-tertiary/10 opacity-70"
              }`}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-tertiary mb-1">{c.title}</h3>
              <div className="text-2xl font-bold text-neutral mb-1">{c.hasData ? c.primary : "—"}</div>
              {c.secondary && c.hasData && <p className="text-xs text-tertiary mb-2">{c.secondary}</p>}
              {c.distributions && c.hasData && (
                <ul className="space-y-1 mt-2">
                  {c.distributions.map((d) => (
                    <li key={d.label} className="flex items-center justify-between text-xs">
                      <span className="text-tertiary truncate pr-2">{d.label}</span>
                      <span className="text-neutral font-medium">
                        {d.count} ({d.percent}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!c.hasData && <p className="text-xs text-tertiary italic">Sin datos en la cohorte filtrada</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Banda 3 — Tendencias */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tertiary mb-3">
          Tendencias (12 meses)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.trends.map((t) => (
            <TrendChart key={t.key} trend={t} />
          ))}
        </div>
      </section>

      {/* Banda 4 — Alertas */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tertiary mb-3">
          Alertas accionables
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.alerts.map((a) => (
            <div key={a.key} className="rounded-xl border border-tertiary/15 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral">{a.title}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.items.length === 0 ? "bg-success/10 text-success" : "bg-error/10 text-error"
                  }`}
                >
                  {a.items.length}
                </span>
              </div>
              <p className="text-xs text-tertiary mb-3">{a.description}</p>
              {a.items.length === 0 ? (
                <p className="text-xs text-tertiary italic">Sin pacientes en alerta</p>
              ) : (
                <ul className="space-y-1 max-h-60 overflow-y-auto">
                  {a.items.map((item) => (
                    <li
                      key={`${item.patientId}-${item.assessmentId}`}
                      className="flex items-center justify-between text-xs border-b border-tertiary/5 last:border-0 py-1.5"
                    >
                      <Link
                        href={`/admin/pacientes/${item.patientId}/historia-clinica`}
                        className="text-primary hover:underline truncate pr-2"
                      >
                        {item.patientName}
                      </Link>
                      <span className="text-tertiary whitespace-nowrap">{item.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "warn" }) {
  const textColor = accent === "warn" ? "text-error" : "text-neutral"
  return (
    <div className="rounded-xl bg-white border border-tertiary/15 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-tertiary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      {sub && <p className="text-xs text-tertiary mt-1">{sub}</p>}
    </div>
  )
}

function topConvenioLabel(byConvenio: { code: string | null; name: string; count: number }[]): string {
  if (byConvenio.length === 0) return "—"
  const top = byConvenio[0]
  return `${top.name}: ${top.count}`
}

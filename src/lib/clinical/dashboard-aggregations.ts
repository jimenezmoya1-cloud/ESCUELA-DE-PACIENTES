import type { SupabaseClient } from "@supabase/supabase-js"

// ============================================================================
// Agregaciones para el dashboard clínico (/admin/clinico/dashboard).
// Toma la cohorte filtrada de pacientes/evaluaciones y computa KPIs,
// distribuciones por los 14 componentes, tendencias mes a mes y listas de
// alertas accionables. Diseñado para correr en server component (sin cache,
// recálculo en cada visita).
// ============================================================================

type RawAssessment = Record<string, string | undefined>

export interface DashboardFilters {
  convenio?: string | null
  doctor?: string | null
  startDate?: string | null
  endDate?: string | null
}

export interface CohortKPIs {
  totalPatients: number
  patientsWithAssessment: number
  patientsWithoutAssessmentInLast6Months: number
  newPatientsThisMonth: number
  totalAssessments: number
  byConvenio: { code: string | null; name: string; count: number }[]
}

export interface ComponentDistribution {
  label: string
  count: number
  percent: number
}

export interface ComponentCard {
  key: string
  title: string
  primary: string // texto principal (ej: "7.2 %")
  secondary?: string // texto secundario (% en meta, etc.)
  distributions?: ComponentDistribution[] // bullets opcionales
  hasData: boolean
}

export interface MonthlyPoint {
  month: string // "2026-04"
  monthLabel: string // "Abr 2026"
  value: number | null // null = sin datos ese mes
  count?: number // # evaluaciones
}

export interface MonthlyTrend {
  key: string
  title: string
  yLabel: string
  points: MonthlyPoint[]
}

export interface AlertItem {
  patientId: string
  patientName: string
  assessmentId: string
  createdAt: string
  detail: string
}

export interface AlertList {
  key: string
  title: string
  description: string
  items: AlertItem[]
}

export interface DashboardData {
  filters: DashboardFilters
  resolvedFilters: {
    convenios: { code: string; name: string }[]
    staff: { id: string; name: string }[]
  }
  kpis: CohortKPIs
  cards: ComponentCard[]
  trends: MonthlyTrend[]
  alerts: AlertList[]
}

// Helpers numéricos -----------------------------------------------------------

function n(s: string | undefined): number | null {
  if (s === undefined || s === null || s === "") return null
  const v = Number(s)
  return Number.isFinite(v) ? v : null
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  const s = values.reduce((a, b) => a + b, 0)
  return s / values.length
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

function roundTo(value: number | null, decimals = 1): string {
  if (value === null) return "—"
  const factor = Math.pow(10, decimals)
  return (Math.round(value * factor) / factor).toString()
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function monthLabelEs(d: Date): string {
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return `${meses[d.getMonth()]} ${d.getFullYear()}`
}

function lastNMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ key: monthKey(d), label: monthLabelEs(d) })
  }
  return out
}

// Categorización IMC ----------------------------------------------------------
function imcCategory(imc: number): string {
  if (imc < 18.5) return "Bajo peso"
  if (imc < 25) return "Normal"
  if (imc < 30) return "Sobrepeso"
  if (imc < 35) return "Obesidad I"
  if (imc < 40) return "Obesidad II"
  return "Obesidad III"
}

// Etiquetas de componentes ---------------------------------------------------
const ACCESO_LABELS: Record<number, string> = { 1: "Sí (total)", 2: "Parcial", 3: "No" }
const NICOTINA_LABELS: Record<number, string> = {
  1: "No fumador",
  2: "Ex >5a",
  3: "Ex 1-5a",
  4: "Ex <1a",
  5: "Fumador",
  6: "Vapeador",
}

// ============================================================================
// Computación principal
// ============================================================================
export async function computeDashboard(
  supabase: SupabaseClient,
  filters: DashboardFilters,
): Promise<DashboardData> {
  // Catálogos para los selects de filtros
  const [{ data: conveniosRaw }, { data: staffRaw }] = await Promise.all([
    supabase.from("convenios").select("code, name").eq("is_active", true).order("code"),
    supabase
      .from("users")
      .select("id, name")
      .in("role", ["admin", "clinico"])
      .eq("is_active", true)
      .order("name"),
  ])

  // Pacientes
  let patientQuery = supabase
    .from("users")
    .select("id, name, convenio_code, registered_at")
    .eq("role", "patient")

  if (filters.convenio && filters.convenio !== "todos") {
    patientQuery = patientQuery.eq("convenio_code", filters.convenio)
  }

  const { data: patients } = await patientQuery
  const patientList = patients ?? []
  const patientIds = patientList.map((p) => p.id)
  const patientNameById = new Map(patientList.map((p) => [p.id, p.name as string]))

  // Evaluaciones
  let assessmentQuery = supabase
    .from("patient_assessments")
    .select("id, user_id, created_by, created_at, raw_questionnaire")
    .in("user_id", patientIds.length > 0 ? patientIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })

  if (filters.doctor && filters.doctor !== "todos") {
    assessmentQuery = assessmentQuery.eq("created_by", filters.doctor)
  }
  if (filters.startDate) assessmentQuery = assessmentQuery.gte("created_at", filters.startDate)
  if (filters.endDate) assessmentQuery = assessmentQuery.lte("created_at", filters.endDate)

  const { data: assessmentsRaw } = await assessmentQuery
  const assessments = assessmentsRaw ?? []

  // Última evaluación por paciente (para KPIs y alertas que se basan en "estado actual")
  const latestByPatient = new Map<string, (typeof assessments)[0]>()
  for (const a of assessments) {
    const prev = latestByPatient.get(a.user_id)
    if (!prev || new Date(a.created_at) > new Date(prev.created_at)) {
      latestByPatient.set(a.user_id, a)
    }
  }

  // ---------- KPIs cohorte ----------
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const patientsWithAssessment = latestByPatient.size
  const patientsWithoutRecent = patientList.filter((p) => {
    const last = latestByPatient.get(p.id)
    if (!last) return true
    return new Date(last.created_at) < sixMonthsAgo
  }).length
  const newPatientsThisMonth = patientList.filter((p) => new Date(p.registered_at) >= startOfMonth).length

  // Distribución por convenio
  const convenioCounts = new Map<string | null, number>()
  for (const p of patientList) {
    convenioCounts.set(p.convenio_code, (convenioCounts.get(p.convenio_code) ?? 0) + 1)
  }
  const convenioByCode = new Map((conveniosRaw ?? []).map((c) => [c.code, c.name]))
  const byConvenio = Array.from(convenioCounts.entries())
    .map(([code, count]) => ({
      code,
      name: code ? convenioByCode.get(code) ?? code : "Sin convenio",
      count,
    }))
    .sort((a, b) => b.count - a.count)

  const kpis: CohortKPIs = {
    totalPatients: patientList.length,
    patientsWithAssessment,
    patientsWithoutAssessmentInLast6Months: patientsWithoutRecent,
    newPatientsThisMonth,
    totalAssessments: assessments.length,
    byConvenio,
  }

  // ---------- Tarjetas de los 14 componentes ----------
  // Para cada paciente con evaluación, usamos la ÚLTIMA evaluación.
  const latestAssessments = Array.from(latestByPatient.values())
  const latestRaws = latestAssessments.map((a) => (a.raw_questionnaire ?? {}) as RawAssessment)

  const cards: ComponentCard[] = []

  // 1. HbA1c
  {
    const values = latestRaws.map((r) => n(r.glucosa)).filter((v): v is number => v !== null)
    const enMeta = values.filter((v) => v < 7).length
    const desctrl = values.filter((v) => v > 9).length
    cards.push({
      key: "hba1c",
      title: "HbA1c",
      primary: `${roundTo(avg(values))} %`,
      secondary: `${pct(enMeta, values.length)}% en meta · ${pct(desctrl, values.length)}% descontrolados`,
      distributions: [
        { label: "<7% (meta)", count: enMeta, percent: pct(enMeta, values.length) },
        { label: "7–9%", count: values.filter((v) => v >= 7 && v <= 9).length, percent: pct(values.filter((v) => v >= 7 && v <= 9).length, values.length) },
        { label: ">9% (descontrol)", count: desctrl, percent: pct(desctrl, values.length) },
      ],
      hasData: values.length > 0,
    })
  }

  // 2. Perfil lipídico
  {
    const ldl = latestRaws.map((r) => n(r.colesterol)).filter((v): v is number => v !== null)
    const hdl = latestRaws.map((r) => n(r.hdl)).filter((v): v is number => v !== null)
    const tg = latestRaws.map((r) => n(r.triglicéridos)).filter((v): v is number => v !== null)
    const total = latestRaws.map((r) => n(r.colesterol_total)).filter((v): v is number => v !== null)
    cards.push({
      key: "lipidos",
      title: "Perfil lipídico",
      primary: `LDL ${roundTo(avg(ldl), 0)} · HDL ${roundTo(avg(hdl), 0)}`,
      secondary: `TG ${roundTo(avg(tg), 0)} · Total ${roundTo(avg(total), 0)} (mg/dL)`,
      hasData: ldl.length + hdl.length + tg.length + total.length > 0,
    })
  }

  // 3. Presión arterial
  {
    const sis = latestRaws.map((r) => n(r.presion_arterial)).filter((v): v is number => v !== null)
    const dia = latestRaws.map((r) => n(r.pad)).filter((v): v is number => v !== null)
    const controlados = sis.filter((v) => v < 130).length
    cards.push({
      key: "presion",
      title: "Presión arterial",
      primary: `${roundTo(avg(sis), 0)} / ${roundTo(avg(dia), 0)} mmHg`,
      secondary: sis.length > 0 ? `${pct(controlados, sis.length)}% controlada (<130)` : undefined,
      distributions: [
        { label: "<120 (óptima)", count: sis.filter((v) => v < 120).length, percent: pct(sis.filter((v) => v < 120).length, sis.length) },
        { label: "120–129", count: sis.filter((v) => v >= 120 && v <= 129).length, percent: pct(sis.filter((v) => v >= 120 && v <= 129).length, sis.length) },
        { label: "≥130 (HTA)", count: sis.filter((v) => v >= 130).length, percent: pct(sis.filter((v) => v >= 130).length, sis.length) },
      ],
      hasData: sis.length > 0,
    })
  }

  // 4. IMC
  {
    const imcValues = latestRaws.map((r) => n(r.peso)).filter((v): v is number => v !== null)
    const buckets = new Map<string, number>()
    for (const v of imcValues) {
      const cat = imcCategory(v)
      buckets.set(cat, (buckets.get(cat) ?? 0) + 1)
    }
    cards.push({
      key: "imc",
      title: "IMC",
      primary: `${roundTo(avg(imcValues))} kg/m²`,
      secondary: imcValues.length > 0
        ? `${pct(imcValues.filter((v) => v >= 18.5 && v < 25).length, imcValues.length)}% en rango normal`
        : undefined,
      distributions: Array.from(buckets.entries()).map(([label, count]) => ({
        label,
        count,
        percent: pct(count, imcValues.length),
      })),
      hasData: imcValues.length > 0,
    })
  }

  // 5. Tabaquismo
  {
    const nics = latestRaws.map((r) => n(r.nicotina)).filter((v): v is number => v !== null)
    const fumadores = nics.filter((v) => v === 5 || v === 6).length
    const buckets = new Map<number, number>()
    for (const v of nics) buckets.set(v, (buckets.get(v) ?? 0) + 1)
    cards.push({
      key: "tabaquismo",
      title: "Tabaquismo",
      primary: `${pct(fumadores, nics.length)}% fumadores actuales`,
      secondary: `Sobre ${nics.length} pacientes con dato`,
      distributions: Array.from(buckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([code, count]) => ({
          label: NICOTINA_LABELS[code] ?? `Código ${code}`,
          count,
          percent: pct(count, nics.length),
        })),
      hasData: nics.length > 0,
    })
  }

  // 6. Actividad física
  {
    const minutes = latestRaws.map((r) => n(r.actividad)).filter((v): v is number => v !== null)
    const cumple = minutes.filter((v) => v >= 150).length
    cards.push({
      key: "actividad",
      title: "Actividad física",
      primary: `${roundTo(avg(minutes), 0)} min/sem`,
      secondary: `${pct(cumple, minutes.length)}% cumple meta OMS (≥150 min)`,
      hasData: minutes.length > 0,
    })
  }

  // 7. Sueño
  {
    const hours = latestRaws.map((r) => n(r.sueno)).filter((v): v is number => v !== null)
    const corto = hours.filter((v) => v < 6).length
    const optimo = hours.filter((v) => v >= 7 && v <= 9).length
    cards.push({
      key: "sueno",
      title: "Sueño",
      primary: `${roundTo(avg(hours))} h/noche`,
      secondary: `${pct(optimo, hours.length)}% en rango óptimo · ${pct(corto, hours.length)}% con <6h`,
      hasData: hours.length > 0,
    })
  }

  // 8. ARMS (Adherencia)
  {
    const arms = latestRaws.map((r) => n(r.adherencia)).filter((v): v is number => v !== null)
    const buena = arms.filter((v) => v <= 23).length
    cards.push({
      key: "arms",
      title: "ARMS (Adherencia)",
      primary: roundTo(avg(arms)),
      secondary: `${pct(buena, arms.length)}% con buena adherencia (≤23)`,
      hasData: arms.length > 0,
    })
  }

  // 9. MSPSS
  {
    const sums = latestRaws.map((r) => n(r.red_apoyo)).filter((v): v is number => v !== null)
    const promedios = sums.map((s) => s / 12)
    const verde = promedios.filter((v) => v > 5).length
    const amarillo = promedios.filter((v) => v >= 3 && v <= 5).length
    const rojo = promedios.filter((v) => v < 3).length
    cards.push({
      key: "mspss",
      title: "MSPSS (Red de apoyo)",
      primary: `Prom ${roundTo(avg(promedios))} (esc. 1–7)`,
      secondary: `${pct(verde, promedios.length)}% percibe soporte sólido`,
      distributions: [
        { label: "Alto (5.1–7)", count: verde, percent: pct(verde, promedios.length) },
        { label: "Moderado (3–5)", count: amarillo, percent: pct(amarillo, promedios.length) },
        { label: "Bajo (1–2.9)", count: rojo, percent: pct(rojo, promedios.length) },
      ],
      hasData: sums.length > 0,
    })
  }

  // 10. HES (Empoderamiento)
  {
    const sums = latestRaws.map((r) => n(r.empoderamiento)).filter((v): v is number => v !== null)
    const verde = sums.filter((v) => v >= 30).length
    const amarillo = sums.filter((v) => v >= 19 && v <= 29).length
    const rojo = sums.filter((v) => v < 19).length
    cards.push({
      key: "hes",
      title: "HES (Empoderamiento)",
      primary: roundTo(avg(sums), 0),
      secondary: `${pct(verde, sums.length)}% pacientes activos (≥30)`,
      distributions: [
        { label: "Alto (30–40)", count: verde, percent: pct(verde, sums.length) },
        { label: "Moderado (19–29)", count: amarillo, percent: pct(amarillo, sums.length) },
        { label: "Bajo (<19)", count: rojo, percent: pct(rojo, sums.length) },
      ],
      hasData: sums.length > 0,
    })
  }

  // 11. PHQ-9 (Salud mental)
  {
    const sums = latestRaws.map((r) => n(r.salud_mental)).filter((v): v is number => v !== null)
    const riesgo = sums.filter((v) => v >= 10).length
    const severo = sums.filter((v) => v >= 15).length
    cards.push({
      key: "phq9",
      title: "PHQ-9 (Salud mental)",
      primary: roundTo(avg(sums)),
      secondary: `${pct(riesgo, sums.length)}% con riesgo (≥10) · ${pct(severo, sums.length)}% severo (≥15)`,
      distributions: [
        { label: "Mínima (0–4)", count: sums.filter((v) => v <= 4).length, percent: pct(sums.filter((v) => v <= 4).length, sums.length) },
        { label: "Leve/Mod (5–14)", count: sums.filter((v) => v >= 5 && v <= 14).length, percent: pct(sums.filter((v) => v >= 5 && v <= 14).length, sums.length) },
        { label: "Severa (≥15)", count: severo, percent: pct(severo, sums.length) },
      ],
      hasData: sums.length > 0,
    })
  }

  // 12. Alimentación (MEDAS)
  {
    const sums = latestRaws.map((r) => n(r.alimentacion)).filter((v): v is number => v !== null)
    const optima = sums.filter((v) => v <= 3).length
    cards.push({
      key: "alimentacion",
      title: "Alimentación (MEDAS)",
      primary: roundTo(avg(sums)),
      secondary: `${pct(optima, sums.length)}% dieta cardioprotectora (≤3)`,
      hasData: sums.length > 0,
    })
  }

  // 13. Acceso a medicamentos
  {
    const accesos = latestRaws.map((r) => n(r.acceso)).filter((v): v is number => v !== null && v >= 1 && v <= 3)
    const buckets = new Map<number, number>()
    for (const v of accesos) buckets.set(v, (buckets.get(v) ?? 0) + 1)
    cards.push({
      key: "acceso-meds",
      title: "Acceso medicamentos",
      primary: `${pct(buckets.get(1) ?? 0, accesos.length)}% sí`,
      secondary: `${pct(buckets.get(2) ?? 0, accesos.length)}% parcial · ${pct(buckets.get(3) ?? 0, accesos.length)}% no`,
      distributions: [1, 2, 3].map((code) => ({
        label: ACCESO_LABELS[code],
        count: buckets.get(code) ?? 0,
        percent: pct(buckets.get(code) ?? 0, accesos.length),
      })),
      hasData: accesos.length > 0,
    })
  }

  // 14. Antecedentes — top 5
  {
    const all: string[] = []
    for (const r of latestRaws) {
      const text = r.antecedentes
      if (text) {
        text.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => all.push(s))
      }
    }
    const counts = new Map<string, number>()
    for (const a of all) counts.set(a, (counts.get(a) ?? 0) + 1)
    const top5 = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    cards.push({
      key: "antecedentes",
      title: "Antecedentes — top 5",
      primary: `${counts.size} antecedentes únicos`,
      distributions: top5.map(([label, count]) => ({
        label,
        count,
        percent: pct(count, latestRaws.length),
      })),
      hasData: top5.length > 0,
    })
  }

  // ---------- Tendencias (12 meses) ----------
  const months = lastNMonths(12)
  const monthIndex = new Map(months.map((m, i) => [m.key, i]))

  function buildTrend(field: keyof RawAssessment, key: string, title: string, yLabel: string): MonthlyTrend {
    const sums: number[] = new Array(months.length).fill(0)
    const counts: number[] = new Array(months.length).fill(0)
    for (const a of assessments) {
      const idx = monthIndex.get(monthKey(new Date(a.created_at)))
      if (idx === undefined) continue
      const raw = (a.raw_questionnaire ?? {}) as RawAssessment
      const val = n(raw[field])
      if (val === null) continue
      sums[idx] += val
      counts[idx] += 1
    }
    return {
      key,
      title,
      yLabel,
      points: months.map((m, i) => ({
        month: m.key,
        monthLabel: m.label,
        value: counts[i] > 0 ? sums[i] / counts[i] : null,
        count: counts[i],
      })),
    }
  }

  function buildCountTrend(): MonthlyTrend {
    const counts: number[] = new Array(months.length).fill(0)
    for (const a of assessments) {
      const idx = monthIndex.get(monthKey(new Date(a.created_at)))
      if (idx === undefined) continue
      counts[idx] += 1
    }
    return {
      key: "count",
      title: "Evaluaciones por mes",
      yLabel: "# evaluaciones",
      points: months.map((m, i) => ({
        month: m.key,
        monthLabel: m.label,
        value: counts[i],
      })),
    }
  }

  const trends: MonthlyTrend[] = [
    buildTrend("glucosa", "hba1c-trend", "HbA1c promedio", "%"),
    buildTrend("adherencia", "arms-trend", "ARMS promedio", "puntos"),
    buildTrend("salud_mental", "phq9-trend", "PHQ-9 promedio", "puntos"),
    buildCountTrend(),
  ]

  // ---------- Alertas accionables ----------
  function buildAlertList(
    key: string,
    title: string,
    description: string,
    predicate: (raw: RawAssessment) => string | null,
  ): AlertList {
    const items: AlertItem[] = []
    for (const a of latestAssessments) {
      const raw = (a.raw_questionnaire ?? {}) as RawAssessment
      const detail = predicate(raw)
      if (detail) {
        items.push({
          patientId: a.user_id,
          patientName: patientNameById.get(a.user_id) ?? "(sin nombre)",
          assessmentId: a.id,
          createdAt: a.created_at,
          detail,
        })
      }
    }
    items.sort((a, b) => a.patientName.localeCompare(b.patientName))
    return { key, title, description, items }
  }

  const alerts: AlertList[] = [
    buildAlertList(
      "hba1c-alta",
      "HbA1c >9%",
      "Pacientes con descontrol glucémico marcado",
      (r) => {
        const v = n(r.glucosa)
        return v !== null && v > 9 ? `HbA1c ${v}%` : null
      },
    ),
    buildAlertList(
      "arms-baja",
      "ARMS bajo (>35)",
      "Adherencia moderada-baja, recordar plan terapéutico",
      (r) => {
        const v = n(r.adherencia)
        return v !== null && v > 35 ? `ARMS ${v}` : null
      },
    ),
    buildAlertList(
      "phq9-riesgo",
      "PHQ-9 ≥10",
      "Síntomas depresivos clínicamente relevantes",
      (r) => {
        const v = n(r.salud_mental)
        return v !== null && v >= 10 ? `PHQ-9 ${v}` : null
      },
    ),
  ]

  // Sin seguimiento >6 meses (basado en pacientes, no en raw)
  const seguimientoVencido: AlertItem[] = []
  for (const p of patientList) {
    const last = latestByPatient.get(p.id)
    if (!last) {
      seguimientoVencido.push({
        patientId: p.id,
        patientName: p.name as string,
        assessmentId: "",
        createdAt: p.registered_at as string,
        detail: "Sin evaluación",
      })
      continue
    }
    if (new Date(last.created_at) < sixMonthsAgo) {
      seguimientoVencido.push({
        patientId: p.id,
        patientName: p.name as string,
        assessmentId: last.id,
        createdAt: last.created_at,
        detail: `Última: ${new Date(last.created_at).toLocaleDateString("es-CO")}`,
      })
    }
  }
  seguimientoVencido.sort((a, b) => a.patientName.localeCompare(b.patientName))
  alerts.push({
    key: "sin-seguimiento",
    title: "Sin seguimiento >6 meses",
    description: "Pacientes sin evaluación reciente",
    items: seguimientoVencido,
  })

  return {
    filters,
    resolvedFilters: {
      convenios: (conveniosRaw ?? []) as { code: string; name: string }[],
      staff: (staffRaw ?? []) as { id: string; name: string }[],
    },
    kpis,
    cards,
    trends,
    alerts,
  }
}

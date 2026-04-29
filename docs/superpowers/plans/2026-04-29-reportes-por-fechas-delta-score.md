# Reportes por Fechas con Delta Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar vista de reportes históricos por fecha para clínico y paciente, mostrando delta score (cambio entre evaluaciones) en cada reporte.

**Architecture:** 
- Backend: API route para obtener evaluaciones filtradas por fecha + cálculo de delta score
- Frontend: Selector de fechas + tabla/lista de reportes con indicador visual de delta (mejoría/empeoramiento)
- Delta score = score_actual - score_anterior (positivo = mejoró, negativo = empeoró)

**Tech Stack:** Next.js 15, TypeScript, Supabase, TailwindCSS

---

## Database Schema Check

La tabla `patient_assessments` ya existe con:
- `id`, `user_id`, `created_by`, `created_at`
- `score_global`, `meta_score`, `nivel`
- `components`, `alertas_criticas`, `alertas_orientadoras`

No requiere migración nueva.

---

### Task 1: Server Actions - Obtener evaluaciones con delta

**Files:**
- Modify: `src/lib/clinical/actions.ts`
- Test: N/A (server actions se verifican por uso)

- [ ] **Step 1: Agregar función `getAssessmentsByDateRange`**

```typescript
export async function getAssessmentsByDateRange(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<
  Array<
    PatientAssessment & {
      delta_score: number | null
      delta_nivel: "mejoro" | "empeoro" | "igual" | null
    }
  >
> {
  const supabase = await createClient()
  
  let query = supabase
    .from("patient_assessments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (startDate) {
    query = query.gte("created_at", startDate)
  }
  if (endDate) {
    query = query.lte("created_at", endDate)
  }

  const { data, error } = await query

  if (error || !data) throw new Error(`fetch failed: ${error?.message ?? "unknown"}`)

  const assessments = data as PatientAssessment[]
  
  // Calcular delta score comparando con evaluación anterior
  return assessments.map((assessment, index) => {
    const previousAssessment = assessments[index + 1] // como está en orden descendente, el siguiente es el anterior
    const delta_score = previousAssessment 
      ? assessment.score_global - previousAssessment.score_global 
      : null
    
    let delta_nivel: "mejoro" | "empeoro" | "igual" | null = null
    if (delta_score !== null) {
      delta_nivel = delta_score > 0 ? "mejoro" : delta_score < 0 ? "empeoro" : "igual"
    }

    return {
      ...assessment,
      delta_score,
      delta_nivel,
    }
  })
}
```

- [ ] **Step 2: Exportar nueva función en `src/lib/clinical/actions.ts`**

Agregar al final del archivo:
```typescript
export { getAssessmentsByDateRange }
```

---

### Task 2: Componente - Lista de Reportes con Delta

**Files:**
- Create: `src/components/dashboard/clinical/AssessmentListWithDelta.tsx`

- [ ] **Step 1: Crear componente con lista de reportes**

```typescript
"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react"
import type { PatientAssessment } from "@/types/database"

interface AssessmentWithDelta extends PatientAssessment {
  delta_score: number | null
  delta_nivel: "mejoro" | "empeoro" | "igual" | null
}

interface Props {
  assessments: AssessmentWithDelta[]
  onViewReport: (assessmentId: string) => void
}

export default function AssessmentListWithDelta({ assessments, onViewReport }: Props) {
  const [filterMonth, setFilterMonth] = useState<string>("")

  const filteredAssessments = filterMonth
    ? assessments.filter((a) => new Date(a.created_at).toISOString().slice(0, 7) === filterMonth)
    : assessments

  const getDeltaIcon = (delta: number | null) => {
    if (delta === null) return <Minus className="w-4 h-4 text-gray-400" />
    if (delta > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (delta < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  const getDeltaLabel = (delta: number | null) => {
    if (delta === null) return "Primera evaluación"
    if (delta > 0) return `+${delta} puntos`
    if (delta < 0) return `${delta} puntos`
    return "Sin cambios"
  }

  // Obtener meses únicos para el filtro
  const availableMonths = Array.from(
    new Set(assessments.map((a) => new Date(a.created_at).toISOString().slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  return (
    <div className="w-full">
      {/* Filtro por mes */}
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-tertiary" />
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos los meses</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {new Date(month + "-01").toLocaleDateString("es-CO", {
                year: "numeric",
                month: "long",
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de evaluaciones */}
      <div className="space-y-2">
        {filteredAssessments.length === 0 ? (
          <p className="text-center text-tertiary text-sm py-4">No hay evaluaciones en este período</p>
        ) : (
          filteredAssessments.map((assessment) => (
            <button
              key={assessment.id}
              onClick={() => onViewReport(assessment.id)}
              className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-white hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-secondary">
                  {new Date(assessment.created_at).toLocaleDateString("es-CO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      assessment.nivel === "Verde"
                        ? "bg-green-100 text-green-700"
                        : assessment.nivel === "Amarillo"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    Nivel {assessment.nivel}
                  </span>
                  <span className="text-tertiary">Score: {assessment.score_global}/100</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1 text-sm">
                    {getDeltaIcon(assessment.delta_score)}
                    <span
                      className={`font-medium ${
                        assessment.delta_nivel === "mejoro"
                          ? "text-green-600"
                          : assessment.delta_nivel === "empeoro"
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
                      {getDeltaLabel(assessment.delta_score)}
                    </span>
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-tertiary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
```

---

### Task 3: API Route - Ver reporte específico por ID

**Files:**
- Create: `src/app/api/assessment/[id]/route.ts`

- [ ] **Step 1: Crear ruta para obtener evaluación individual**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assessment, error } = await supabase
    .from("patient_assessments")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
  }

  // Verificar permisos
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  // Solo el dueño o admin puede ver
  if (assessment.user_id !== user.id && userProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json(assessment)
}
```

---

### Task 4: Vista Paciente - Página de reportes históricos

**Files:**
- Create: `src/components/dashboard/clinical/PatientReportsList.tsx`
- Modify: `src/app/(dashboard)/mi-historia-clinica/page.tsx`

- [ ] **Step 1: Crear componente loader para lista de reportes**

```typescript
"use client"

import { useRouter } from "next/navigation"
import AssessmentListWithDelta from "./AssessmentListWithDelta"
import type { PatientAssessment } from "@/types/database"

interface Props {
  assessments: Array<
    PatientAssessment & {
      delta_score: number | null
      delta_nivel: "mejoro" | "empeoro" | "igual" | null
    }
  >
}

export default function PatientReportsList({ assessments }: Props) {
  const router = useRouter()

  const handleViewReport = (assessmentId: string) => {
    router.push(`/mi-historia-clinica?report=${assessmentId}`)
  }

  return <AssessmentListWithDelta assessments={assessments} onViewReport={handleViewReport} />
}
```

- [ ] **Step 2: Modificar `mi-historia-clinica/page.tsx` para soportar vista de lista**

```typescript
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PatientReportView from "@/components/dashboard/clinical/PatientReportViewLoader"
import PatientReportsList from "@/components/dashboard/clinical/PatientReportsList"
import { getAssessmentsByDateRange } from "@/lib/clinical/actions"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

export default async function MiHistoriaClinicaPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>
}) {
  const { report } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Obtener todas las evaluaciones con delta
  const assessmentsWithDelta = await getAssessmentsByDateRange(user.id)

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (assessmentsWithDelta.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <div className="inline-block rounded-full bg-blue-50 p-6 mb-4">
          <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral mb-2">Aún no tienes una evaluación clínica</h1>
        <p className="text-tertiary">Acércate a tu auxiliar de enfermería para crear tu reporte CAIMED Cardiopreventiva.</p>
      </div>
    )
  }

  // Si hay parámetro report, mostrar ese reporte específico
  if (report) {
    const selectedAssessment = assessmentsWithDelta.find((a) => a.id === report)
    if (selectedAssessment) {
      return (
        <PatientReportView
          assessment={selectedAssessment}
          profile={(profile ?? null) as PatientClinicalProfile | null}
          evaluacionInicialScore={null}
          showBackToList={true}
        />
      )
    }
  }

  // Por defecto, mostrar lista de reportes
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold text-neutral mb-6">Mis Reportes Clínicos</h1>
      <PatientReportsList assessments={assessmentsWithDelta} />
    </div>
  )
}
```

---

### Task 5: Modificar PatientReportView - Agregar botón "Volver a lista"

**Files:**
- Modify: `src/components/dashboard/clinical/PatientReportView.tsx`

- [ ] **Step 1: Agregar prop `showBackToList` y botón de retorno**

Modificar interfaz Props:
```typescript
interface Props {
  assessment: PatientAssessment
  profile: PatientClinicalProfile | null
  evaluacionInicialScore: number | null
  showBackToList?: boolean  // NUEVO
}
```

Modificar componente - agregar botón de retorno:
```typescript
import { ArrowLeft } from "lucide-react"  // NUEVO import

export default function PatientReportView({ 
  assessment, 
  profile, 
  evaluacionInicialScore,
  showBackToList = false 
}: Props) {
  // ... resto del código existente ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      {showBackToList && (
        <div className="w-full max-w-[1000px] mb-6 flex justify-between items-center print:hidden">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a la lista
          </button>
          <button
            onClick={handleSavePDF}
            disabled={isGenerando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {isGenerando ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      )}

      {!showBackToList && (
        <div className="w-full max-w-[1000px] mb-6 flex justify-end print:hidden">
          <button
            onClick={handleSavePDF}
            disabled={isGenerando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {isGenerando ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      )}

      {/* ... resto del JSX existente ... */}
    </div>
  )
}
```

---

### Task 6: Vista Clínico - Página de reportes del paciente

**Files:**
- Create: `src/components/admin/clinical/PatientReportsListAdmin.tsx`
- Modify: `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx`

- [ ] **Step 1: Crear componente para lista de reportes en vista admin**

```typescript
"use client"

import { useRouter } from "next/navigation"
import AssessmentListWithDelta from "@/components/dashboard/clinical/AssessmentListWithDelta"
import type { PatientAssessment } from "@/types/database"

interface Props {
  patientId: string
  assessments: Array<
    PatientAssessment & {
      delta_score: number | null
      delta_nivel: "mejoro" | "empeoro" | "igual" | null
    }
  >
}

export default function PatientReportsListAdmin({ patientId, assessments }: Props) {
  const router = useRouter()

  const handleViewReport = (assessmentId: string) => {
    router.push(`/admin/pacientes/${patientId}/historia-clinica?report=${assessmentId}`)
  }

  return <AssessmentListWithDelta assessments={assessments} onViewReport={handleViewReport} />
}
```

- [ ] **Step 2: Modificar página historia-clínica para soportar vista de reportes**

```typescript
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ClinicalHistoryClient from "@/components/admin/clinical/ClinicalHistoryClientLoader"
import AssessmentTimeline from "@/components/admin/clinical/AssessmentTimeline"
import QuestionnaireWrapper from "@/components/admin/clinical/QuestionnaireWrapper"
import PatientReportsListAdmin from "@/components/admin/clinical/PatientReportsListAdmin"
import { getAssessmentsByDateRange } from "@/lib/clinical/actions"
import type { PatientAssessment, PatientClinicalProfile, AssessmentNivel } from "@/types/database"

export default async function HistoriaClinicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string; report?: string }>
}) {
  const { id } = await params
  const { mode, report } = await searchParams
  const supabase = await createClient()

  const { data: patient } = await supabase.from("users").select("id, name, email").eq("id", id).single()
  if (!patient) notFound()

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", id)
    .maybeSingle()

  // Obtener evaluaciones con delta score
  const assessmentsWithDelta = await getAssessmentsByDateRange(id)

  const showQuestionnaire = mode === "new" || assessmentsWithDelta.length === 0

  // Si hay parámetro report, mostrar ese reporte específico
  if (report) {
    const selectedAssessment = assessmentsWithDelta.find((a) => a.id === report)
    if (selectedAssessment) {
      const PatientReportView = (await import("@/components/dashboard/clinical/PatientReportViewLoader")).default
      return (
        <div>
          <Link
            href={`/admin/pacientes/${id}/historia-clinica`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a reportes
          </Link>
          <PatientReportView
            assessment={selectedAssessment}
            profile={(profile ?? null) as PatientClinicalProfile | null}
            evaluacionInicialScore={null}
            showBackToList={true}
          />
        </div>
      )
    }
  }

  return (
    <div>
      <Link
        href={`/admin/pacientes/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
      >
        <ChevronLeft className="w-4 h-4" /> Volver al paciente
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Historia clínica</h1>
          <p className="text-sm text-tertiary">{patient.name}</p>
        </div>
        {!showQuestionnaire && (
          <Link
            href={`/admin/pacientes/${id}/historia-clinica?mode=new`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Nueva evaluación
          </Link>
        )}
      </div>

      {showQuestionnaire ? (
        <QuestionnaireWrapper userId={id} />
      ) : (
        <>
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral uppercase tracking-wide">Línea de tiempo</h2>
            <AssessmentTimeline
              items={assessmentsWithDelta.map((a) => ({
                id: a.id,
                created_at: a.created_at,
                score_global: a.score_global,
                nivel: a.nivel as AssessmentNivel,
              }))}
            />
          </div>

          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral uppercase tracking-wide">Reportes por fecha</h2>
            <PatientReportsListAdmin patientId={id} assessments={assessmentsWithDelta} />
          </div>

          <ClinicalHistoryClient
            userId={id}
            initialAssessment={assessmentsWithDelta[0] ?? null}
            clinicalProfile={(profile ?? null) as PatientClinicalProfile | null}
            evaluacionInicialScore={
              assessmentsWithDelta.length > 1 ? assessmentsWithDelta[assessmentsWithDelta.length - 1].score_global : null
            }
          />
        </>
      )}
    </div>
  )
}
```

---

### Task 7: Actualizar PatientReportViewLoader

**Files:**
- Modify: `src/components/dashboard/clinical/PatientReportViewLoader.tsx`

- [ ] **Step 1: Leer contenido del loader y actualizar para pasar nueva prop**

```typescript
import PatientReportView from "./PatientReportView"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

interface Props {
  assessment: PatientAssessment
  profile: PatientClinicalProfile | null
  evaluacionInicialScore: number | null
  showBackToList?: boolean
}

export default function PatientReportViewLoader({ 
  assessment, 
  profile, 
  evaluacionInicialScore,
  showBackToList = false 
}: Props) {
  return (
    <PatientReportView
      assessment={assessment}
      profile={profile}
      evaluacionInicialScore={evaluacionInicialScore}
      showBackToList={showBackToList}
    />
  )
}
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Vista de reportes por fecha para paciente
- ✅ Vista de reportes por fecha para clínico
- ✅ Delta score calculado (score_actual - score_anterior)
- ✅ Indicador visual de delta (iconos + colores)
- ✅ Filtro por mes disponible
- ✅ Navegación entre lista y detalle de reporte

**2. Placeholder scan:**
- ✅ Todo el código está completo en los pasos
- ✅ No hay TBDs o TODOs

**3. Type consistency:**
- ✅ `PatientAssessment` usado consistentemente
- ✅ `delta_score: number | null` consistente
- ✅ `delta_nivel: "mejoro" | "empeoro" | "igual" | null` consistente

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-reportes-por-fechas-delta-score.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

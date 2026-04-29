import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ClinicalHistoryClient from "@/components/admin/clinical/ClinicalHistoryClientLoader"
import AssessmentTimeline from "@/components/admin/clinical/AssessmentTimeline"
import QuestionnaireWrapper from "@/components/admin/clinical/QuestionnaireWrapper"
import PatientReportsListAdmin from "@/components/admin/clinical/PatientReportsListAdmin"
import PatientReportView from "@/components/dashboard/clinical/PatientReportViewLoader"
import { getAssessmentsByDateRange } from "@/lib/clinical/actions"
import type { PatientClinicalProfile, AssessmentNivel } from "@/types/database"

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

  let assessments: Awaited<ReturnType<typeof getAssessmentsByDateRange>> = []
  try {
    assessments = await getAssessmentsByDateRange(id)
  } catch {
    // tabla puede no existir si la migración no se ha aplicado
  }

  const showQuestionnaire = mode === "new" || assessments.length === 0

  // Mostrar reporte específico si viene ?report=id
  if (report && !showQuestionnaire) {
    const selected = assessments.find((a) => a.id === report)
    if (selected) {
      const oldest = assessments[assessments.length - 1]
      const evaluacionInicialScore =
        oldest && oldest.id !== selected.id ? oldest.score_global : null
      return (
        <div>
          <Link
            href={`/admin/pacientes/${id}/historia-clinica`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a reportes
          </Link>
          <PatientReportView
            assessment={selected}
            profile={(profile ?? null) as PatientClinicalProfile | null}
            evaluacionInicialScore={evaluacionInicialScore}
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
              items={assessments.map((a) => ({
                id: a.id,
                created_at: a.created_at,
                score_global: a.score_global,
                nivel: a.nivel as AssessmentNivel,
              }))}
            />
          </div>

          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral uppercase tracking-wide">Reportes por fecha</h2>
            <PatientReportsListAdmin patientId={id} assessments={assessments} />
          </div>

          <ClinicalHistoryClient
            userId={id}
            initialAssessment={assessments[0] ?? null}
            clinicalProfile={(profile ?? null) as PatientClinicalProfile | null}
            evaluacionInicialScore={
              assessments.length > 1 ? assessments[assessments.length - 1].score_global : null
            }
          />
        </>
      )}
    </div>
  )
}

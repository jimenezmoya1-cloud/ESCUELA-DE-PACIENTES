import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ClinicalHistoryClient from "@/components/admin/clinical/ClinicalHistoryClientLoader"
import AssessmentTimeline from "@/components/admin/clinical/AssessmentTimeline"
import QuestionnaireWrapper from "@/components/admin/clinical/QuestionnaireWrapper"
import type { PatientAssessment, PatientClinicalProfile, AssessmentNivel } from "@/types/database"

export default async function HistoriaClinicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { id } = await params
  const { mode } = await searchParams
  const supabase = await createClient()

  const { data: patient } = await supabase.from("users").select("id, name, email").eq("id", id).single()
  if (!patient) notFound()

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", id)
    .maybeSingle()

  const { data: assessments } = await supabase
    .from("patient_assessments")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })

  const allAssessments = (assessments ?? []) as PatientAssessment[]
  const latest = allAssessments[0] ?? null
  const oldest = allAssessments[allAssessments.length - 1] ?? null
  const evaluacionInicialScore = oldest && oldest.id !== latest?.id ? oldest.score_global : null

  const showQuestionnaire = mode === "new" || allAssessments.length === 0

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
              items={allAssessments.map((a) => ({
                id: a.id,
                created_at: a.created_at,
                score_global: a.score_global,
                nivel: a.nivel as AssessmentNivel,
              }))}
            />
          </div>

          <ClinicalHistoryClient
            userId={id}
            initialAssessment={latest}
            clinicalProfile={(profile ?? null) as PatientClinicalProfile | null}
            evaluacionInicialScore={evaluacionInicialScore}
          />
        </>
      )}
    </div>
  )
}

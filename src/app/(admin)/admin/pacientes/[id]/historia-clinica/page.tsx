import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"
import ClinicalHistoryClient from "@/components/admin/clinical/ClinicalHistoryClientLoader"
import AssessmentTimeline from "@/components/admin/clinical/AssessmentTimeline"
import QuestionnaireWrapper from "@/components/admin/clinical/QuestionnaireWrapper"
import PatientReportsListAdmin from "@/components/admin/clinical/PatientReportsListAdmin"
import PatientReportView from "@/components/dashboard/clinical/PatientReportViewLoader"
import { getAssessmentsByDateRange, getCreatorSignature } from "@/lib/clinical/actions"
import { getLeadByCedula, getLeadByUserId } from "@/lib/chequeo/actions"
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

  let lead = null
  try {
    lead = profile?.documento
      ? await getLeadByCedula(profile.documento)
      : await getLeadByUserId(id)
  } catch {
    // lead lookup can fail if table schema differs
  }

  let assessments: Awaited<ReturnType<typeof getAssessmentsByDateRange>> = []
  try {
    assessments = await getAssessmentsByDateRange(id)
  } catch {
    // tabla puede no existir si la migración no se ha aplicado
  }

  const showQuestionnaire = mode === "new" || mode === "edit-profile" || assessments.length === 0
  const editProfileMode = mode === "edit-profile"

  // Mostrar reporte específico si viene ?report=id
  if (report && !showQuestionnaire) {
    const selected = assessments.find((a) => a.id === report)
    if (selected) {
      const oldest = assessments[assessments.length - 1]
      const evaluacionInicialScore =
        oldest && oldest.id !== selected.id ? oldest.score_global : null
      const selectedCreator = await getCreatorSignature(selected.created_by, selected.created_at)
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
            creator={selectedCreator}
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
          <h1 className="text-2xl font-bold text-neutral">Evaluación preventiva</h1>
          <p className="text-sm text-tertiary">{patient.name}</p>
        </div>
        {!showQuestionnaire && (
          <div className="flex items-center gap-2">
            {profile && (
              <Link
                href={`/admin/pacientes/${id}/historia-clinica?mode=edit-profile`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar datos personales
              </Link>
            )}
            <Link
              href={`/admin/pacientes/${id}/historia-clinica?mode=new`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              + Nueva evaluación
            </Link>
          </div>
        )}
      </div>

      {showQuestionnaire ? (
        <QuestionnaireWrapper
          userId={id}
          profile={(profile ?? null) as PatientClinicalProfile | null}
          editMode={editProfileMode}
          leadData={lead}
        />
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
            creator={
              assessments[0]
                ? await getCreatorSignature(assessments[0].created_by, assessments[0].created_at)
                : null
            }
          />
        </>
      )}
    </div>
  )
}

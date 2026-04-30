import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PatientReportView from "@/components/dashboard/clinical/PatientReportViewLoader"
import { getAssessmentsByDateRange, getCreatorSignature } from "@/lib/clinical/actions"
import type { PatientClinicalProfile } from "@/types/database"
import type { AssessmentWithDelta } from "@/components/dashboard/clinical/AssessmentListWithDelta"
import PatientReportsList from "@/components/dashboard/clinical/PatientReportsList"

export default async function MiHistoriaClinicaPage({
  searchParams,
}: {
  searchParams: Promise<{ report?: string }>
}) {
  const { report } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let assessments: AssessmentWithDelta[] = []
  try {
    assessments = await getAssessmentsByDateRange(user.id)
  } catch {
    // tabla puede no existir si la migración no se ha aplicado
  }

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (assessments.length === 0) {
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

  // Mostrar reporte específico si viene el parámetro ?report=id
  if (report) {
    const selected = assessments.find((a) => a.id === report)
    if (selected) {
      const oldest = assessments[assessments.length - 1]
      const evaluacionInicialScore =
        oldest && oldest.id !== selected.id ? oldest.score_global : null
      const selectedCreator = await getCreatorSignature(selected.created_by, selected.created_at)
      return (
        <PatientReportView
          assessment={selected}
          profile={(profile ?? null) as PatientClinicalProfile | null}
          evaluacionInicialScore={evaluacionInicialScore}
          creator={selectedCreator}
          showBackToList={true}
        />
      )
    }
  }

  // Vista por defecto: lista de todos los reportes
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-neutral mb-2">Mi Evaluación Clínica</h1>
      <p className="text-sm text-tertiary mb-6">
        Toca cualquier evaluación para ver el reporte completo y descargar el PDF.
      </p>
      <PatientReportsList assessments={assessments} />
    </div>
  )
}

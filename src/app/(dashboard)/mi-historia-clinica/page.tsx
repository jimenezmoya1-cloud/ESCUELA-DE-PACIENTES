import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PatientReportView from "@/components/dashboard/clinical/PatientReportView"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

export default async function MiHistoriaClinicaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: assessments } = await supabase
    .from("patient_assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const all = (assessments ?? []) as PatientAssessment[]
  const latest = all[0] ?? null
  const oldest = all[all.length - 1] ?? null
  const evaluacionInicialScore = oldest && oldest.id !== latest?.id ? oldest.score_global : null

  if (!latest) {
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

  return (
    <PatientReportView
      assessment={latest}
      profile={(profile ?? null) as PatientClinicalProfile | null}
      evaluacionInicialScore={evaluacionInicialScore}
    />
  )
}

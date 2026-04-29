"use client"

import { useRouter } from "next/navigation"
import AssessmentListWithDelta from "@/components/dashboard/clinical/AssessmentListWithDelta"
import type { AssessmentWithDelta } from "@/components/dashboard/clinical/AssessmentListWithDelta"

interface Props {
  patientId: string
  assessments: AssessmentWithDelta[]
}

export default function PatientReportsListAdmin({ patientId, assessments }: Props) {
  const router = useRouter()

  return (
    <AssessmentListWithDelta
      assessments={assessments}
      onViewReport={(id) => router.push(`/admin/pacientes/${patientId}/historia-clinica?report=${id}`)}
    />
  )
}

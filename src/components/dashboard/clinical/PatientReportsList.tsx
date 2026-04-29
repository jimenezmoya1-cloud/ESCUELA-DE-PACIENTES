"use client"

import { useRouter } from "next/navigation"
import AssessmentListWithDelta from "./AssessmentListWithDelta"
import type { AssessmentWithDelta } from "./AssessmentListWithDelta"

interface Props {
  assessments: AssessmentWithDelta[]
}

export default function PatientReportsList({ assessments }: Props) {
  const router = useRouter()
  return (
    <AssessmentListWithDelta
      assessments={assessments}
      onViewReport={(id) => router.push(`/mi-historia-clinica?report=${id}`)}
    />
  )
}

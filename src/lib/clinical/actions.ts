"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { recomputeAssessment, calcularEdad } from "./scoring"
import type { ComponenteScore, AlertaItem } from "./types"
import type { PatientClinicalProfile, PatientAssessment } from "@/types/database"

interface SaveAssessmentInput {
  user_id: string
  components: ComponenteScore[]
  is_sca: boolean
  is_dm2: boolean
  is_pluripatologico: boolean
  is_poca_expectativa: boolean
  alertas_criticas: AlertaItem[]
  alertas_orientadoras: AlertaItem[]
  raw_questionnaire?: unknown
  notes?: string | null
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthorized")
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") throw new Error("forbidden")
  return user
}

export async function saveAssessment(input: SaveAssessmentInput): Promise<{ id: string }> {
  const adminUser = await assertAdmin()
  const supabase = createAdminClient()

  const { data: clinicalProfile } = await supabase
    .from("patient_clinical_profile")
    .select("fecha_nacimiento")
    .eq("user_id", input.user_id)
    .maybeSingle()

  let edad = 0
  if (clinicalProfile?.fecha_nacimiento) {
    const d = new Date(clinicalProfile.fecha_nacimiento)
    const formatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    edad = calcularEdad(formatted)
  }

  const contexto = {
    isSCA: input.is_sca,
    isDM2: input.is_dm2,
    isPluripatologico: input.is_pluripatologico,
    isPocaExpectativa: input.is_poca_expectativa,
    edad,
  }
  const { components, scoreGlobal, nivel, metaScore } = recomputeAssessment(input.components, contexto)

  const { data: inserted, error } = await supabase
    .from("patient_assessments")
    .insert({
      user_id: input.user_id,
      created_by: adminUser.id,
      components,
      is_sca: input.is_sca,
      is_dm2: input.is_dm2,
      is_pluripatologico: input.is_pluripatologico,
      is_poca_expectativa: input.is_poca_expectativa,
      score_global: scoreGlobal,
      meta_score: metaScore,
      nivel,
      alertas_criticas: input.alertas_criticas,
      alertas_orientadoras: input.alertas_orientadoras,
      raw_questionnaire: input.raw_questionnaire ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single()

  if (error || !inserted) throw new Error(`save failed: ${error?.message ?? "unknown"}`)

  revalidatePath(`/admin/pacientes/${input.user_id}/historia-clinica`)
  revalidatePath("/mi-historia-clinica")

  return { id: inserted.id }
}

export async function upsertClinicalProfile(
  userId: string,
  profile: Partial<Omit<PatientClinicalProfile, "user_id" | "updated_at">>,
): Promise<void> {
  await assertAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("patient_clinical_profile")
    .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() })

  if (error) throw new Error(`profile upsert failed: ${error.message}`)

  const fullName = [profile.primer_nombre, profile.primer_apellido].filter(Boolean).join(" ").trim()
  if (fullName) {
    const { data: userRow } = await supabase.from("users").select("name").eq("id", userId).single()
    if (!userRow?.name) {
      await supabase.from("users").update({ name: fullName }).eq("id", userId)
    }
  }

  revalidatePath(`/admin/pacientes/${userId}/historia-clinica`)
}

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

  if (startDate) query = query.gte("created_at", startDate)
  if (endDate) query = query.lte("created_at", endDate)

  const { data, error } = await query
  if (error || !data) throw new Error(`fetch failed: ${error?.message ?? "unknown"}`)

  const assessments = data as PatientAssessment[]
  return assessments.map((assessment, index) => {
    const prev = assessments[index + 1]
    const delta_score = prev ? assessment.score_global - prev.score_global : null
    const delta_nivel =
      delta_score === null ? null : delta_score > 0 ? "mejoro" : delta_score < 0 ? "empeoro" : "igual"
    return { ...assessment, delta_score, delta_nivel }
  })
}

export async function getAssessmentTimeline(
  userId: string,
): Promise<Array<Pick<PatientAssessment, "id" | "created_at" | "score_global" | "nivel">>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("patient_assessments")
    .select("id, created_at, score_global, nivel")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return (data ?? []) as Array<Pick<PatientAssessment, "id" | "created_at" | "score_global" | "nivel">>
}

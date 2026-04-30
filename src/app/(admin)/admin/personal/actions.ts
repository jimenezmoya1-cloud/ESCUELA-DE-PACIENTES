"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"

export type InviteStaffInput = {
  fullName: string
  email: string
  profession: "medico" | "enfermero" | "otro"
  specialty?: string
  medicalRegistration?: string
  professionalIdCard?: string
}

export async function inviteStaff(input: InviteStaffInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.fullName.trim() || !input.email.trim()) {
    return { ok: false, error: "Nombre y correo son obligatorios" }
  }

  const supabase = createAdminClient()

  // 1. Invitar al usuario por email (Supabase Auth)
  const { data: authUser, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(input.email.trim())

  if (inviteError || !authUser?.user) {
    return { ok: false, error: inviteError?.message ?? "No se pudo invitar al usuario" }
  }

  // 2. Insertar / upsert el row de public.users con datos profesionales y rol 'clinico'
  const { error: insertError } = await supabase.from("users").upsert({
    id: authUser.user.id,
    name: input.fullName.trim(),
    email: input.email.trim(),
    role: "clinico",
    profession: input.profession,
    specialty: input.specialty?.trim() || null,
    medical_registration: input.medicalRegistration?.trim() || null,
    professional_id_card: input.professionalIdCard?.trim() || null,
    is_active: true,
  })

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  revalidatePath("/admin/personal")
  return { ok: true }
}

export async function toggleStaffActive(userId: string, nextValue: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("users")
    .update({ is_active: nextValue })
    .eq("id", userId)
    .in("role", ["admin", "clinico"])

  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/personal")
  return { ok: true }
}

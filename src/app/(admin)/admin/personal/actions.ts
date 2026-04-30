"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"

export type CreateStaffInput = {
  fullName: string
  email: string
  password: string
  profession: "medico" | "enfermero" | "otro"
  specialty?: string
  medicalRegistration?: string
  professionalIdCard?: string
}

export async function createStaff(input: CreateStaffInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.fullName.trim() || !input.email.trim()) {
    return { ok: false, error: "Nombre y correo son obligatorios" }
  }
  if (input.password.length < 8) {
    return { ok: false, error: "La contraseña debe tener al menos 8 caracteres" }
  }

  const supabase = createAdminClient()

  // 1. Crear el usuario en Supabase Auth con email + password ya confirmados.
  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.fullName.trim(), role: "clinico" },
  })

  if (createError || !authUser?.user) {
    return { ok: false, error: createError?.message ?? "No se pudo crear el usuario" }
  }

  // 2. Upsert del row de public.users con datos profesionales y rol 'clinico'.
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
    // Rollback: el row de auth quedó huérfano, intentar eliminarlo.
    await supabase.auth.admin.deleteUser(authUser.user.id)
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

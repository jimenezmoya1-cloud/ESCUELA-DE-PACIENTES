"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { notifyAfterDeactivation, type DeactivationOutcome } from "@/lib/scheduling/post-deactivation-notify"

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

export async function deactivateClinicianAction(
  clinicianId: string,
): Promise<{ ok: true; outcome: DeactivationOutcome } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const supabase = createAdminClient()

  // Verificar que es un clínico activo
  const { data: target, error: readErr } = await supabase
    .from("users")
    .select("id, role, is_active, name")
    .eq("id", clinicianId)
    .single()
  if (readErr || !target) return { ok: false, error: "Usuario no encontrado" }
  if (target.role !== "clinico") return { ok: false, error: "El usuario no es un clínico" }
  if (!target.is_active) return { ok: false, error: "El clínico ya está inactivo" }

  // Flip is_active=false. El trigger SQL hace la reasignación + audit log.
  const { error: updErr } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", clinicianId)
  if (updErr) return { ok: false, error: `Error desactivando: ${updErr.message}` }

  // Audit del admin (separado de los entries del trigger, que tienen actor_id=null)
  await supabase.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_deactivate_clinician",
    target_type: "user",
    target_id: clinicianId,
    metadata: { name: target.name },
  })

  // Disparar notificaciones para los clínicos a los que se les asignaron citas
  let outcome: DeactivationOutcome
  try {
    outcome = await notifyAfterDeactivation(clinicianId)
  } catch (e) {
    console.error("[deactivate clinician] post-notify failed:", e)
    outcome = { reassignedCount: 0, orphanedCount: 0 }
  }

  revalidatePath("/admin/personal")
  revalidatePath("/admin/citas")
  revalidatePath("/admin")
  return { ok: true, outcome }
}

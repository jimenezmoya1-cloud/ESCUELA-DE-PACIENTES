import { createClient } from "@/lib/supabase/server"

export type UserRole = "patient" | "admin" | "clinico"
export type Profession = "medico" | "enfermero" | "otro" | null

export interface StaffProfile {
  id: string
  name: string
  email: string
  role: UserRole
  profession: Profession
  specialty: string | null
  medical_registration: string | null
  professional_id_card: string | null
  is_active: boolean
}

/**
 * Lee el perfil del usuario logueado desde public.users.
 * Devuelve null si no hay sesión o el perfil no existe.
 */
export async function getCurrentProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, profession, specialty, medical_registration, professional_id_card, is_active")
    .eq("id", user.id)
    .single()

  return (profile as StaffProfile) ?? null
}

export function isStaff(profile: Pick<StaffProfile, "role" | "is_active"> | null): boolean {
  return !!profile && profile.is_active && (profile.role === "admin" || profile.role === "clinico")
}

export function isAdmin(profile: Pick<StaffProfile, "role" | "is_active"> | null): boolean {
  return !!profile && profile.is_active && profile.role === "admin"
}

export function isClinico(profile: Pick<StaffProfile, "role" | "is_active"> | null): boolean {
  return !!profile && profile.is_active && profile.role === "clinico"
}

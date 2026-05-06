'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { ChequeoScore, ChequeoRegistration, ChequeoFormData } from './types'
import type { Lead } from '@/types/database'

interface InsertLeadInput {
  registration: ChequeoRegistration
  formData: ChequeoFormData
  score: ChequeoScore
}

export async function insertLead(
  input: InsertLeadInput,
): Promise<{ id: string; accountCreated: boolean }> {
  const supabase = createAdminClient()
  const { registration: reg, formData: fd, score } = input

  const pesoKg = parseFloat(fd.pesoKg) || null
  const tallaCm = parseFloat(fd.tallaCm) || null
  const tallaM = tallaCm ? tallaCm / 100 : null
  const imc =
    pesoKg && tallaM
      ? Math.round((pesoKg / (tallaM * tallaM)) * 10) / 10
      : null

  const enfermedades = fd.enfermedades.filter((e) => e !== 'Ninguna')
  if (fd.otraEnfermedad.trim()) enfermedades.push(fd.otraEnfermedad.trim())

  const isDM2 = fd.enfermedades.includes('Diabetes tipo 2')
  const isSCA = fd.enfermedades.includes('Infarto o angina previa')

  const { data: existing } = await supabase
    .from('leads')
    .select(
      'id, estado, historial_contacto, asignado_a, intentos_contacto, ultimo_contacto_at',
    )
    .eq('cedula', reg.cedula)
    .maybeSingle()

  const leadData = {
    cedula: reg.cedula,
    nombre: reg.nombre,
    apellido: reg.apellido,
    fecha_nacimiento: reg.fechaNacimiento,
    sexo: reg.sexo || null,
    telefono: reg.telefono,
    email: reg.email || null,
    departamento: reg.departamento,
    municipio: reg.municipio,
    peso_kg: pesoKg,
    talla_cm: tallaCm,
    imc,
    enfermedades,
    medicamentos_texto: fd.medicamentosTexto || null,
    acceso_medicamentos: fd.accesoMedicamentos,
    adherencia_simple: fd.adherenciaSimple,
    fumador_nivel: fd.fumadorNivel,
    actividad_minutos: fd.actividadMinutos,
    horas_sueno: fd.horasSueno,
    is_dm2: isDM2,
    is_sca: isSCA,
    score_parcial: score.scoreParcial,
    componentes_scores: score.componentes,
    nivel: score.nivel,
    updated_at: new Date().toISOString(),
  }

  let leadId: string

  if (existing) {
    const { error } = await supabase
      .from('leads')
      .update(leadData)
      .eq('id', existing.id)
    if (error) throw new Error(`lead update failed: ${error.message}`)
    leadId = existing.id
  } else {
    const { data: inserted, error } = await supabase
      .from('leads')
      .insert({ ...leadData, estado: 'nuevo', fuente: 'web' })
      .select('id')
      .single()
    if (error || !inserted)
      throw new Error(`lead insert failed: ${error?.message ?? 'unknown'}`)
    leadId = inserted.id
  }

  let accountCreated = false
  if (reg.accountType === 'full' && reg.password && reg.email) {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: reg.email,
        password: reg.password,
        email_confirm: true,
      })
    if (!authError && authData.user) {
      await supabase.from('users').insert({
        id: authData.user.id,
        name: `${reg.nombre} ${reg.apellido}`,
        email: reg.email,
        role: 'patient',
      })
      await supabase
        .from('leads')
        .update({ user_id: authData.user.id, cuenta_creada: true })
        .eq('id', leadId)
      accountCreated = true
    }
  } else if (reg.accountType === 'magic-link' && reg.email) {
    const serverSupabase = await createServerClient()
    await serverSupabase.auth.signInWithOtp({ email: reg.email })
  }

  return { id: leadId, accountCreated }
}

// ── CRM server actions ──────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`fetch leads failed: ${error.message}`)
  return (data ?? []) as Lead[]
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()
  return (data as Lead) ?? null
}

export async function updateLeadEstado(
  leadId: string,
  estado: string,
): Promise<void> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('leads')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', leadId)
}

export async function addContactEntry(
  leadId: string,
  entry: { tipo: string; resultado: string; nota: string },
): Promise<void> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const adminSupabase = createAdminClient()
  const { data: lead } = await adminSupabase
    .from('leads')
    .select('historial_contacto, intentos_contacto')
    .eq('id', leadId)
    .single()
  const historial = (lead?.historial_contacto as unknown[]) ?? []
  historial.unshift({ ...entry, fecha: new Date().toISOString(), por: user.id })
  await adminSupabase
    .from('leads')
    .update({
      historial_contacto: historial,
      intentos_contacto: (lead?.intentos_contacto ?? 0) + 1,
      ultimo_contacto_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
}

export async function updateLeadNotes(
  leadId: string,
  notas: string,
): Promise<void> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('leads')
    .update({ notas, updated_at: new Date().toISOString() })
    .eq('id', leadId)
}

export async function assignLead(
  leadId: string,
  staffId: string | null,
): Promise<void> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const adminSupabase = createAdminClient()
  await adminSupabase
    .from('leads')
    .update({ asignado_a: staffId, updated_at: new Date().toISOString() })
    .eq('id', leadId)
}

export async function getStaffUsers(): Promise<
  { id: string; name: string; role: string }[]
> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('users')
    .select('id, name, role')
    .in('role', ['admin', 'clinico'])
  return data ?? []
}

export async function getLeadByCedula(cedula: string): Promise<Lead | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('cedula', cedula)
    .neq('estado', 'descartado')
    .maybeSingle()
  return (data as Lead) ?? null
}

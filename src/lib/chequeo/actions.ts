'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { ChequeoScore, ChequeoRegistration, ChequeoFormData } from './types'

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

import type { Lead } from '@/types/database'

export type PriorityTier = 'urgentes' | 'activos' | 'seguimiento' | 'convertidos' | 'descartados'

export function calcularPrioridad(lead: Lead): number {
  let priority = 0

  // Base score by nivel
  if (lead.score_parcial <= 50) priority += 40
  else if (lead.score_parcial <= 79) priority += 25
  else priority += 10

  // Antecedentes
  if (lead.is_dm2) priority += 10
  if (lead.is_sca) priority += 10
  if (lead.enfermedades.filter((e) => e !== 'Ninguna').length >= 3) priority += 5

  // Age
  const age = Math.floor(
    (Date.now() - new Date(lead.fecha_nacimiento).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  )
  if (age >= 65) priority += 5

  // Freshness
  const hoursAgo =
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60)
  if (hoursAgo < 1) priority += 20
  else if (hoursAgo < 4) priority += 15
  else if (hoursAgo < 24) priority += 10
  else if (hoursAgo < 48) priority += 5

  // Engagement penalty
  if (lead.intentos_contacto === 1) priority -= 5
  else if (lead.intentos_contacto === 2) priority -= 10
  else if (lead.intentos_contacto >= 3) priority -= 15

  return Math.max(0, Math.min(100, priority))
}

export function getTier(lead: Lead): PriorityTier {
  if (lead.estado === 'convertido') return 'convertidos'
  if (lead.estado === 'descartado') return 'descartados'
  if (lead.estado === 'agendado') return 'seguimiento'
  if (lead.nivel === 'Rojo') return 'urgentes'
  if (lead.nivel === 'Amarillo' && lead.estado === 'nuevo') return 'urgentes'
  return 'activos'
}

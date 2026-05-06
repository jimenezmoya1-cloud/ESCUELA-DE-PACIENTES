'use client'

import Link from 'next/link'
import { Phone, Mail, Eye, PhoneCall } from 'lucide-react'
import type { Lead } from '@/types/database'

interface LeadCardProps {
  lead: Lead
  onContact: () => void
}

function nivelBorderColor(nivel: string): string {
  if (nivel === 'Rojo') return 'border-l-red-500'
  if (nivel === 'Amarillo') return 'border-l-yellow-500'
  return 'border-l-green-500'
}

function nivelBadgeClasses(nivel: string): string {
  if (nivel === 'Rojo') return 'bg-red-100 text-red-700'
  if (nivel === 'Amarillo') return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function scoreBadgeClasses(score: number): string {
  if (score <= 50) return 'bg-red-100 text-red-700'
  if (score <= 79) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function calcAge(fechaNacimiento: string): number {
  return Math.floor(
    (Date.now() - new Date(fechaNacimiento).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  )
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hace 1 dia'
  return `hace ${days} dias`
}

const estadoLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  agendado: 'Agendado',
  convertido: 'Convertido',
  descartado: 'Descartado',
}

export default function LeadCard({ lead, onContact }: LeadCardProps) {
  const age = calcAge(lead.fecha_nacimiento)
  const conditions = lead.enfermedades.filter((e) => e !== 'Ninguna')

  return (
    <div
      className={`rounded-xl border border-gray-200 border-l-4 ${nivelBorderColor(lead.nivel)} bg-white shadow-sm`}
    >
      <div className="p-4 space-y-2.5">
        {/* Top row: score + nivel + time */}
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${scoreBadgeClasses(lead.score_parcial)}`}
          >
            {lead.score_parcial}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${nivelBadgeClasses(lead.nivel)}`}
          >
            {lead.nivel}
          </span>
          <span className="ml-auto text-gray-400">
            {timeAgo(lead.created_at)}
          </span>
        </div>

        {/* Name + age + cedula */}
        <div>
          <p className="text-sm font-semibold text-[#212B52]">
            {lead.nombre} {lead.apellido}
          </p>
          <p className="text-xs text-gray-500">
            {age} anios &middot; CC {lead.cedula}
          </p>
        </div>

        {/* Condition chips */}
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conditions.map((c) => (
              <span
                key={c}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Contact info */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          <a
            href={`tel:${lead.telefono}`}
            className="inline-flex items-center gap-1 hover:text-[#06559F]"
          >
            <Phone className="h-3.5 w-3.5" />
            {lead.telefono}
          </a>
          {lead.email && (
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1 hover:text-[#06559F]"
            >
              <Mail className="h-3.5 w-3.5" />
              {lead.email}
            </a>
          )}
        </div>

        {/* Estado + intentos */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{estadoLabels[lead.estado] ?? lead.estado}</span>
          <span>&middot;</span>
          <span>Intentos: {lead.intentos_contacto}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onContact}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#06559F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06559F]/90"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Contactar
          </button>
          <Link
            href={`/admin/crm/${lead.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Ver detalle
          </Link>
        </div>
      </div>
    </div>
  )
}

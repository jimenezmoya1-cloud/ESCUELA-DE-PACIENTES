'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Lead } from '@/types/database'
import {
  updateLeadEstado,
  assignLead,
  updateLeadNotes,
  addContactEntry,
} from '@/lib/chequeo/actions'
import ComponentChart from '@/components/chequeo/ComponentChart'
import ContactHistoryTimeline from '@/components/admin/crm/ContactHistoryTimeline'

interface LeadDetailClientProps {
  lead: Lead
  staff: { id: string; name: string; role: string }[]
}

const ESTADOS = [
  'nuevo',
  'contactado',
  'interesado',
  'agendado',
  'convertido',
  'descartado',
] as const

const estadoLabels: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  interesado: 'Interesado',
  agendado: 'Agendado',
  convertido: 'Convertido',
  descartado: 'Descartado',
}

function calcAge(fechaNacimiento: string): number {
  return Math.floor(
    (Date.now() - new Date(fechaNacimiento).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  )
}

function fumadorLabel(nivel: number | null): string {
  if (nivel === null) return 'N/A'
  const labels: Record<number, string> = {
    1: 'No fuma',
    2: 'Ex >1 año',
    3: 'Ex <1 año',
    4: 'Ocasional',
    5: 'Fumador diario',
    6: 'Vapeador',
  }
  return labels[nivel] ?? 'N/A'
}

export default function LeadDetailClient({
  lead,
  staff,
}: LeadDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notas, setNotas] = useState(lead.notas ?? '')
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactTipo, setContactTipo] = useState<'llamada' | 'whatsapp' | 'email'>('llamada')
  const [contactResultado, setContactResultado] = useState('')
  const [contactNota, setContactNota] = useState('')

  const age = calcAge(lead.fecha_nacimiento)
  const conditions = lead.enfermedades.filter((e) => e !== 'Ninguna')

  function handleEstadoChange(estado: string) {
    startTransition(async () => {
      await updateLeadEstado(lead.id, estado)
      router.refresh()
    })
  }

  function handleAssign(staffId: string) {
    startTransition(async () => {
      await assignLead(lead.id, staffId || null)
      router.refresh()
    })
  }

  function handleNotasBlur() {
    if (notas !== (lead.notas ?? '')) {
      startTransition(async () => {
        await updateLeadNotes(lead.id, notas)
        router.refresh()
      })
    }
  }

  function handleSubmitContact() {
    if (!contactResultado) return
    startTransition(async () => {
      await addContactEntry(lead.id, {
        tipo: contactTipo,
        resultado: contactResultado,
        nota: contactNota,
      })
      setShowContactForm(false)
      setContactResultado('')
      setContactNota('')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/crm"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-[#06559F]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a CRM
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ═══ Left column ═══ */}
        <div className="space-y-6 lg:col-span-2">
          {/* Personal data */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-base font-semibold text-[#212B52]">
              Datos personales
            </h2>
            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-gray-500">Nombre:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.nombre} {lead.apellido}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Cedula:</span>{' '}
                <span className="font-medium text-gray-800">{lead.cedula}</span>
              </div>
              <div>
                <span className="text-gray-500">Edad:</span>{' '}
                <span className="font-medium text-gray-800">{age} anios</span>
              </div>
              <div>
                <span className="text-gray-500">Sexo:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.sexo ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Telefono:</span>{' '}
                <a
                  href={`tel:${lead.telefono}`}
                  className="font-medium text-[#06559F] hover:underline"
                >
                  {lead.telefono}
                </a>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.email ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Ubicacion:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.municipio}, {lead.departamento}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical data */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-base font-semibold text-[#212B52]">
              Datos clinicos
            </h2>
            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-gray-500">IMC:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.imc ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Tabaquismo:</span>{' '}
                <span className="font-medium text-gray-800">
                  {fumadorLabel(lead.fumador_nivel)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Actividad fisica:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.actividad_minutos != null
                    ? `${lead.actividad_minutos} min/sem`
                    : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Horas de sueno:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.horas_sueno ?? 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Medicamentos:</span>{' '}
                <span className="font-medium text-gray-800">
                  {lead.medicamentos_texto || 'N/A'}
                </span>
              </div>
            </div>

            {/* Conditions */}
            {conditions.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs text-gray-500">
                  Antecedentes:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((c) => (
                    <span
                      key={c}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Component scores chart */}
          {lead.componentes_scores && lead.componentes_scores.length > 0 && (
            <ComponentChart componentes={lead.componentes_scores} />
          )}
        </div>

        {/* ═══ Right column ═══ */}
        <div className="space-y-6 lg:col-span-1">
          {/* Estado */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#212B52]">Estado</h3>
            <select
              value={lead.estado}
              onChange={(e) => handleEstadoChange(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>
                  {estadoLabels[e]}
                </option>
              ))}
            </select>
          </div>

          {/* Asignado a */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#212B52]">
              Asignado a
            </h3>
            <select
              value={lead.asignado_a ?? ''}
              onChange={(e) => handleAssign(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
            >
              <option value="">Sin asignar</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#212B52]">Notas</h3>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={handleNotasBlur}
              placeholder="Agregar notas..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
              rows={4}
            />
          </div>

          {/* Contact history */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#212B52]">
                Historial de contacto
              </h3>
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="text-xs font-medium text-[#06559F] hover:underline"
              >
                {showContactForm ? 'Cancelar' : 'Agregar contacto'}
              </button>
            </div>

            {/* Inline add contact form */}
            {showContactForm && (
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {/* Tipo */}
                <select
                  value={contactTipo}
                  onChange={(e) =>
                    setContactTipo(
                      e.target.value as 'llamada' | 'whatsapp' | 'email',
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
                >
                  <option value="llamada">Llamada</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>

                {/* Resultado */}
                <input
                  type="text"
                  placeholder="Resultado"
                  value={contactResultado}
                  onChange={(e) => setContactResultado(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
                />

                {/* Nota */}
                <textarea
                  placeholder="Nota (opcional)"
                  value={contactNota}
                  onChange={(e) => setContactNota(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
                  rows={2}
                />

                <button
                  onClick={handleSubmitContact}
                  disabled={!contactResultado || isPending}
                  className="w-full rounded-lg bg-[#06559F] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06559F]/90 disabled:opacity-50"
                >
                  {isPending ? 'Guardando...' : 'Guardar contacto'}
                </button>
              </div>
            )}

            <ContactHistoryTimeline entries={lead.historial_contacto ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}

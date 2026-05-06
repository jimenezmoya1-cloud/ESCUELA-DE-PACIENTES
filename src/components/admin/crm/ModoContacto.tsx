'use client'

import { useCallback, useState, useTransition } from 'react'
import {
  X, Pause, Phone, MessageCircle, Flame,
  AlertTriangle, CheckCircle2, CalendarCheck, MinusCircle, XCircle,
  SkipForward,
} from 'lucide-react'
import type { Lead } from '@/types/database'
import { addContactEntry, updateLeadEstado } from '@/lib/chequeo/actions'

interface ModoContactoProps {
  leads: Lead[]
  onClose: () => void
}

function calcAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

function getInitials(n: string, a: string) {
  return `${n.charAt(0)}${a.charAt(0)}`.toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours}h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}

function getInsight(lead: Lead): string {
  const age = calcAge(lead.fecha_nacimiento)
  const conditions = lead.enfermedades.filter((e) => e !== 'Ninguna')
  const critical = (lead.componentes_scores || [])
    .filter((c) => c.puntaje <= 50)
    .map((c) => `${c.nombre} (${c.puntaje})`)

  if (lead.nivel === 'Rojo') {
    const parts: string[] = []
    if (critical.length > 0)
      parts.push(`componentes críticos: ${critical.join(', ')}`)
    if (conditions.length > 0)
      parts.push(`antecedentes: ${conditions.join(', ')}`)
    if (age >= 60) parts.push(`${age} años`)
    return `Score Rojo con ${parts.join('. ')}. Menciona estos puntos en la conversación.`
  }
  if (conditions.length > 0) {
    return `Tiene ${conditions.join(', ')}. Pregunta cómo está manejando su tratamiento actual.`
  }
  return 'Lead sin antecedentes críticos. Enfócate en los beneficios del programa de prevención.'
}

function getWaMessage(lead: Lead): string {
  if (lead.nivel === 'Rojo') {
    return `Hola ${lead.nombre}, soy del equipo CAIMED 👋\n\nVi que acabas de hacer tu Chequeo Cardiovascular y tu reporte llegó a mis manos. Hay algunos componentes que vale la pena conversar contigo, sin compromiso.\n\n¿Tienes 10 minutos esta semana para llamarte? Te explico tu reporte y cómo nuestro programa puede ayudarte.\n\nGracias por confiar en nosotros 💙`
  }
  return `Hola ${lead.nombre}, soy del equipo CAIMED 👋\n\nVi que hiciste tu Chequeo Cardiovascular Express. ¡Gracias por tomarte el tiempo!\n\nTenemos un programa educativo que te puede ayudar a mejorar varios de tus indicadores. ¿Te gustaría saber más?\n\nQuedo atento 💙`
}

function waLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  const num = clean.startsWith('57') ? clean : `57${clean}`
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

type ResultKey = 'interesado' | 'agendado' | 'sin_respuesta' | 'no_interesado'

const RESULTS: {
  key: ResultKey
  label: string
  desc: string
  bg: string
  icon: typeof CheckCircle2
}[] = [
  {
    key: 'interesado',
    label: 'Respondió interesado',
    desc: 'Pasa a "Contactado"',
    bg: 'bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/25',
    icon: CheckCircle2,
  },
  {
    key: 'agendado',
    label: 'Cita agendada',
    desc: 'Anotar fecha y hora',
    bg: 'bg-violet-500/15 border-violet-500/30 hover:bg-violet-500/25',
    icon: CalendarCheck,
  },
  {
    key: 'sin_respuesta',
    label: 'Sin respuesta',
    desc: 'Re-intentar en 3 días',
    bg: 'bg-gray-500/15 border-gray-500/30 hover:bg-gray-500/25',
    icon: MinusCircle,
  },
  {
    key: 'no_interesado',
    label: 'No interesado',
    desc: 'Cierra el ciclo',
    bg: 'bg-red-500/15 border-red-500/30 hover:bg-red-500/25',
    icon: XCircle,
  },
]

export default function ModoContacto({ leads, onClose }: ModoContactoProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nota, setNota] = useState('')
  const [isPending, startTransition] = useTransition()

  const lead = leads[currentIndex]
  const resetForm = useCallback(() => setNota(''), [])

  function handleResult(key: ResultKey) {
    if (!lead) return
    startTransition(async () => {
      const map: Record<ResultKey, { resultado: string; estado: string }> = {
        interesado: { resultado: 'Interesado', estado: 'interesado' },
        agendado: { resultado: 'Cita agendada', estado: 'agendado' },
        sin_respuesta: { resultado: 'Sin respuesta', estado: 'contactado' },
        no_interesado: { resultado: 'No interesado', estado: 'descartado' },
      }
      const { resultado, estado } = map[key]
      await addContactEntry(lead.id, { tipo: 'whatsapp', resultado, nota })
      await updateLeadEstado(lead.id, estado)
      resetForm()
      if (currentIndex < leads.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        onClose()
      }
    })
  }

  if (!lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#212B52] to-[#06559F]">
        <div className="text-center">
          <p className="text-lg font-bold text-white">
            Todos los leads fueron contactados
          </p>
          <button
            onClick={onClose}
            className="mt-4 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#06559F]"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const age = calcAge(lead.fecha_nacimiento)
  const conditions = lead.enfermedades.filter((e) => e !== 'Ninguna')
  const waMessage = getWaMessage(lead)
  const progress = ((currentIndex + 1) / leads.length) * 100

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-br from-[#212B52] to-[#06559F]">
      {/* ── Sprint Header ── */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-extrabold text-white">
            {currentIndex + 1} / {leads.length} leads
          </span>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#1E8DCE] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {lead.nivel === 'Rojo' && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-red-300">
              <Flame className="h-3 w-3" /> Urgente
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-white/20"
          >
            <Pause className="h-3 w-3" />
            Pausar
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Sprint Body ── */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left: Patient Context */}
        <div className="flex-1 border-b border-white/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div
              className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full border-2 border-white/30 text-xl font-black text-white"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              {getInitials(lead.nombre, lead.apellido)}
            </div>
            <div>
              <h3 className="text-[22px] font-black text-white">
                {lead.nombre} {lead.apellido}
              </h3>
              <p className="mt-0.5 text-[13px] text-white/70">
                {age} años · {lead.departamento} · {lead.telefono}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            {[
              {
                label: 'Score global',
                value: `${lead.score_parcial}/100 · ${lead.nivel}`,
                cls:
                  lead.nivel === 'Rojo'
                    ? 'text-red-300'
                    : lead.nivel === 'Amarillo'
                      ? 'text-amber-300'
                      : 'text-emerald-300',
              },
              ...(conditions.length > 0
                ? [
                    {
                      label: 'Antecedentes',
                      value: conditions.join(', '),
                      cls: 'text-white',
                    },
                  ]
                : []),
              {
                label: 'Llegada',
                value: timeAgo(lead.created_at),
                cls: 'text-white',
              },
              ...(lead.intentos_contacto > 0
                ? [
                    {
                      label: 'Intentos previos',
                      value: String(lead.intentos_contacto),
                      cls: 'text-white',
                    },
                  ]
                : []),
              {
                label: 'Canal preferido',
                value: 'WhatsApp',
                cls: 'text-white',
              },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className={`flex items-center justify-between py-2.5 text-[13px] ${
                  i < arr.length - 1 ? 'border-b border-white/[0.08]' : ''
                }`}
              >
                <span className="text-white/60">{row.label}</span>
                <span className={`font-bold ${row.cls}`}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Insight */}
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/[0.12] p-4 text-[13px] leading-relaxed text-white/90">
            <AlertTriangle className="mb-0.5 mr-1 inline h-4 w-4 text-amber-400" />
            <strong className="text-amber-400">Por qué contactar:</strong>{' '}
            {getInsight(lead)}
          </div>
        </div>

        {/* Right: Action Panel */}
        <div className="flex-1 p-6 lg:p-8">
          {/* WhatsApp template */}
          <div className="mb-6 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/[0.1] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#25D366]">
                Mensaje sugerido ·{' '}
                {lead.nivel === 'Rojo'
                  ? 'Primer contacto rojo'
                  : 'Primer contacto'}
              </span>
            </div>
            <div className="rounded-xl border-l-[3px] border-l-[#25D366] bg-white p-3.5 text-[13px] leading-relaxed text-[#212B52]">
              {waMessage.split('\n').map((line, i) => (
                <span key={i}>
                  {line.includes(lead.nombre) ? (
                    <>
                      {line.split(lead.nombre)[0]}
                      <strong className="text-[#06559F]">{lead.nombre}</strong>
                      {line.split(lead.nombre).slice(1).join(lead.nombre)}
                    </>
                  ) : (
                    line
                  )}
                  {i < waMessage.split('\n').length - 1 && <br />}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <a
                href={waLink(lead.telefono, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-[#20BD5C]"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp y enviar
              </a>
            </div>
          </div>

          {/* Result buttons */}
          <div>
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/60">
              Después de contactar, ¿qué pasó?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {RESULTS.map(({ key, label, desc, bg, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleResult(key)}
                  disabled={isPending}
                  className={`rounded-xl border p-3.5 text-left transition-all disabled:opacity-50 ${bg}`}
                >
                  <Icon className="mb-1 h-5 w-5 text-white/80" />
                  <p className="text-[13px] font-extrabold leading-tight text-white">
                    {label}
                  </p>
                  <p className="mt-1 text-[11px] text-white/60">{desc}</p>
                </button>
              ))}
            </div>

            {/* Nota */}
            <textarea
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              rows={2}
            />

            {/* Skip / Call */}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <button
                onClick={() => {
                  resetForm()
                  if (currentIndex < leads.length - 1)
                    setCurrentIndex((prev) => prev + 1)
                }}
                className="inline-flex items-center gap-1.5 text-[12px] text-white/50 underline transition-colors hover:text-white/70"
              >
                <SkipForward className="h-3 w-3" />
                Saltar este lead
              </button>
              <a
                href={`tel:${lead.telefono}`}
                className="inline-flex items-center gap-1.5 text-[12px] text-white/50 underline transition-colors hover:text-white/70"
              >
                <Phone className="h-3 w-3" />
                Prefiero llamar
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

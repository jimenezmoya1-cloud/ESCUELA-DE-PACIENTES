'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Flame, RotateCcw, CalendarDays, Sparkles, Zap,
  Phone, MessageCircle, HardDrive, Eye, ChevronRight,
  ClipboardList, BarChart3,
} from 'lucide-react'
import type { Lead } from '@/types/database'
import { calcularPrioridad, getTier, type PriorityTier } from '@/lib/chequeo/priority'
import ExportButton from '@/components/admin/crm/ExportButton'
import ModoContacto from '@/components/admin/crm/ModoContacto'
import FilterChips from '@/components/admin/crm/FilterChips'

type Tab = 'bandeja' | 'todos' | 'citas' | 'estadisticas'
type BucketKey = 'urgentes' | 'reintentos' | 'citas' | 'nuevos'

interface CrmClientProps {
  initialLeads: Lead[]
  sheetUrl: string | null
}

type LeadWithMeta = Lead & { _priority: number; _tier: PriorityTier }

function calcAge(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
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

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase()
}

function scoreBadgeClasses(score: number): string {
  if (score <= 50) return 'bg-red-100 text-red-800'
  if (score <= 79) return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-800'
}

function waLink(phone: string, nombre: string): string {
  const clean = phone.replace(/\D/g, '')
  const num = clean.startsWith('57') ? clean : `57${clean}`
  const msg = encodeURIComponent(
    `Hola ${nombre}, soy del equipo CAIMED 👋\nVi que acabas de hacer tu Chequeo Cardiovascular Express. ¿Tienes unos minutos para conversar sobre tu resultado?`,
  )
  return `https://wa.me/${num}?text=${msg}`
}

const TABS: { key: Tab; label: string; icon: typeof Flame }[] = [
  { key: 'bandeja', label: 'Bandeja de hoy', icon: Zap },
  { key: 'todos', label: 'Todos los leads', icon: ClipboardList },
  { key: 'citas', label: 'Citas agendadas', icon: CalendarDays },
  { key: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
]

const BUCKETS: {
  key: BucketKey
  label: string
  sub: string
  icon: typeof Flame
  border: string
  iconColor: string
}[] = [
  { key: 'urgentes', label: 'Urgentes', sub: 'Rojos sin contactar', icon: Flame, border: 'border-l-red-500', iconColor: 'text-red-500' },
  { key: 'reintentos', label: 'Re-intentos', sub: 'Sin respuesta hace +3d', icon: RotateCcw, border: 'border-l-amber-500', iconColor: 'text-amber-500' },
  { key: 'citas', label: 'Citas hoy', sub: 'Recordatorio + confirmación', icon: CalendarDays, border: 'border-l-violet-500', iconColor: 'text-violet-500' },
  { key: 'nuevos', label: 'Nuevos', sub: 'Llegaron recientemente', icon: Sparkles, border: 'border-l-[#1E8DCE]', iconColor: 'text-[#1E8DCE]' },
]

export default function CrmClient({ initialLeads, sheetUrl }: CrmClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('bandeja')
  const [activeBucket, setActiveBucket] = useState<BucketKey | null>(null)
  const [showModoContacto, setShowModoContacto] = useState(false)
  const [activeFilter, setActiveFilter] = useState('urgentes')

  const leadsWithMeta = useMemo<LeadWithMeta[]>(
    () =>
      initialLeads.map((lead) => ({
        ...lead,
        _priority: calcularPrioridad(lead),
        _tier: getTier(lead),
      })),
    [initialLeads],
  )

  const bucketLeads = useMemo(() => {
    const urgentes = leadsWithMeta
      .filter(
        (l) =>
          l.nivel === 'Rojo' &&
          !['convertido', 'descartado'].includes(l.estado) &&
          l.intentos_contacto === 0,
      )
      .sort((a, b) => b._priority - a._priority)

    const reintentos = leadsWithMeta
      .filter((l) => {
        if (l.intentos_contacto === 0) return false
        if (['convertido', 'descartado', 'agendado'].includes(l.estado))
          return false
        if (!l.ultimo_contacto_at) return true
        const daysSince =
          (Date.now() - new Date(l.ultimo_contacto_at).getTime()) /
          (1000 * 60 * 60 * 24)
        return daysSince >= 3
      })
      .sort((a, b) => b._priority - a._priority)

    const citas = leadsWithMeta
      .filter((l) => l.estado === 'agendado')
      .sort((a, b) => b._priority - a._priority)

    const nuevos = leadsWithMeta
      .filter((l) => l.estado === 'nuevo' && l.nivel !== 'Rojo')
      .sort((a, b) => b._priority - a._priority)

    return { urgentes, reintentos, citas, nuevos }
  }, [leadsWithMeta])

  const bandejaCount =
    bucketLeads.urgentes.length +
    bucketLeads.reintentos.length +
    bucketLeads.citas.length +
    bucketLeads.nuevos.length
  const urgentCount = bucketLeads.urgentes.length

  const queueLeads = useMemo(() => {
    if (!activeBucket) {
      return [
        ...bucketLeads.urgentes,
        ...bucketLeads.reintentos,
        ...bucketLeads.citas,
        ...bucketLeads.nuevos,
      ].sort((a, b) => b._priority - a._priority)
    }
    return bucketLeads[activeBucket]
  }, [activeBucket, bucketLeads])

  const tierCounts = useMemo(() => {
    const c: Record<string, number> = {
      todos: leadsWithMeta.length,
      urgentes: 0,
      activos: 0,
      seguimiento: 0,
      convertidos: 0,
      descartados: 0,
    }
    for (const l of leadsWithMeta) c[l._tier] = (c[l._tier] ?? 0) + 1
    return c
  }, [leadsWithMeta])

  const filteredLeads = useMemo(() => {
    const list =
      activeFilter === 'todos'
        ? leadsWithMeta
        : leadsWithMeta.filter((l) => l._tier === activeFilter)
    return [...list].sort((a, b) => b._priority - a._priority)
  }, [leadsWithMeta, activeFilter])

  const contactableLeads = useMemo(
    () =>
      leadsWithMeta
        .filter((l) => l._tier === 'urgentes' || l._tier === 'activos')
        .sort((a, b) => b._priority - a._priority),
    [leadsWithMeta],
  )

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }, [])

  return (
    <div className="relative -mx-4 -mt-4 lg:-mx-8 lg:-mt-8">
      {/* Gradient blobs for glass depth */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#06559F]/[0.07] blur-[100px]" />
        <div className="absolute -left-32 bottom-1/4 h-96 w-96 rounded-full bg-[#1E8DCE]/[0.07] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-violet-500/[0.04] blur-[100px]" />
      </div>

      <div className="relative min-h-screen bg-[#F0F4FA]/80 p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          {/* ── Glass container ── */}
          <div className="overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-2xl shadow-[#212B52]/[0.08] backdrop-blur-2xl">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-[#F0F4FA] bg-white/90 px-6 py-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-[#212B52]">
                  CRM · Leads del Chequeo Cardiovascular
                </h2>
                <p className="mt-1 text-[13px] text-[#6A778F]">
                  {initialLeads.length} leads totales · Auto-sync con Google
                  Sheets
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ExportButton leads={initialLeads} />
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F0F4FA] px-4 py-2.5 text-[13px] font-bold text-[#06559F] transition-colors hover:bg-[#E0E8F5]"
                  >
                    <HardDrive className="h-4 w-4" />
                    Drive
                  </a>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-[#F0F4FA] bg-white/80 px-6 backdrop-blur-xl">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex shrink-0 items-center gap-2 border-b-[3px] px-5 py-3.5 text-[13px] font-bold transition-colors ${
                    activeTab === key
                      ? 'border-[#06559F] text-[#06559F]'
                      : 'border-transparent text-[#6A778F] hover:text-[#212B52]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {key === 'bandeja' && bandejaCount > 0 && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        activeTab === 'bandeja'
                          ? 'bg-[#06559F] text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {bandejaCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── BANDEJA DE HOY ── */}
            {activeTab === 'bandeja' && (
              <>
                {/* Hero */}
                <div className="flex flex-col gap-4 bg-gradient-to-r from-[#06559F] to-[#1E8DCE] px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                  <div>
                    <h1 className="text-2xl font-black text-white sm:text-[28px]">
                      {greeting}
                    </h1>
                    <p className="mt-1 text-[14px] text-white/85">
                      Tienes{' '}
                      <strong className="text-white">
                        {bandejaCount} leads
                      </strong>{' '}
                      esperando tu contacto.
                      {urgentCount > 0 && (
                        <>
                          {' '}
                          <strong className="text-white">
                            {urgentCount}{' '}
                            {urgentCount === 1 ? 'es urgente' : 'son urgentes'}{' '}
                            (rojos).
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModoContacto(true)}
                    disabled={contactableLeads.length === 0}
                    className="inline-flex shrink-0 items-center gap-2.5 rounded-full bg-white px-7 py-4 text-[13px] font-black uppercase tracking-wider text-[#06559F] shadow-lg shadow-black/20 transition-all hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
                  >
                    <Zap className="h-5 w-5" />
                    Empezar mi día
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Buckets */}
                <div className="grid grid-cols-2 gap-3 bg-[#F0F4FA]/80 p-5 lg:grid-cols-4 lg:gap-4 lg:p-6">
                  {BUCKETS.map(
                    ({ key, label, sub, icon: Icon, border, iconColor }) => {
                      const count = bucketLeads[key].length
                      const isActive = activeBucket === key
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            setActiveBucket(isActive ? null : key)
                          }
                          className={`rounded-2xl border-l-4 ${border} bg-white/60 p-4 text-left backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                            isActive
                              ? 'shadow-lg ring-2 ring-[#06559F]/20'
                              : 'shadow-sm'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <Icon className={`h-6 w-6 ${iconColor}`} />
                            <span className="text-3xl font-black text-[#212B52]">
                              {count}
                            </span>
                          </div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#212B52]">
                            {label}
                          </p>
                          <p className="mt-1 text-[11px] text-[#6A778F]">
                            {sub}
                          </p>
                        </button>
                      )
                    },
                  )}
                </div>

                {/* Queue */}
                <div className="bg-[#F0F4FA]/80 px-5 pb-8 lg:px-6">
                  {queueLeads.length === 0 ? (
                    <div className="rounded-2xl bg-white/60 p-8 text-center backdrop-blur-xl">
                      <p className="text-sm text-[#6A778F]">
                        No hay leads en esta categoría.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {!activeBucket ? (
                        <>
                          {bucketLeads.urgentes.length > 0 && (
                            <>
                              <QueueHeader
                                icon={Flame}
                                iconColor="text-red-500"
                                label="Urgentes — Contactar HOY"
                              />
                              {bucketLeads.urgentes.map((lead) => (
                                <QueueItem key={lead.id} lead={lead} />
                              ))}
                            </>
                          )}
                          {bucketLeads.reintentos.length > 0 && (
                            <>
                              <QueueHeader
                                icon={RotateCcw}
                                iconColor="text-amber-500"
                                label="Re-intentos — Tras 3+ días sin respuesta"
                                className="mt-6"
                              />
                              {bucketLeads.reintentos.map((lead) => (
                                <QueueItem key={lead.id} lead={lead} />
                              ))}
                            </>
                          )}
                          {bucketLeads.citas.length > 0 && (
                            <>
                              <QueueHeader
                                icon={CalendarDays}
                                iconColor="text-violet-500"
                                label="Citas agendadas"
                                className="mt-6"
                              />
                              {bucketLeads.citas.map((lead) => (
                                <QueueItem key={lead.id} lead={lead} />
                              ))}
                            </>
                          )}
                          {bucketLeads.nuevos.length > 0 && (
                            <>
                              <QueueHeader
                                icon={Sparkles}
                                iconColor="text-[#1E8DCE]"
                                label="Nuevos"
                                className="mt-6"
                              />
                              {bucketLeads.nuevos.map((lead) => (
                                <QueueItem key={lead.id} lead={lead} />
                              ))}
                            </>
                          )}
                        </>
                      ) : (
                        queueLeads.map((lead) => (
                          <QueueItem key={lead.id} lead={lead} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── TODOS LOS LEADS ── */}
            {activeTab === 'todos' && (
              <div className="p-5 lg:p-6">
                <FilterChips
                  active={activeFilter}
                  counts={tierCounts}
                  onChange={setActiveFilter}
                />
                <div className="mt-4 space-y-2">
                  {filteredLeads.length === 0 ? (
                    <div className="rounded-2xl bg-white/60 p-8 text-center backdrop-blur-xl">
                      <p className="text-sm text-[#6A778F]">
                        No hay leads en esta categoría.
                      </p>
                    </div>
                  ) : (
                    filteredLeads.map((lead) => (
                      <QueueItem key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── CITAS AGENDADAS ── */}
            {activeTab === 'citas' && (
              <div className="p-5 lg:p-6">
                <h3 className="mb-4 text-sm font-bold text-[#212B52]">
                  Leads con cita agendada
                </h3>
                {leadsWithMeta.filter((l) => l.estado === 'agendado').length ===
                0 ? (
                  <div className="rounded-2xl bg-white/60 p-8 text-center backdrop-blur-xl">
                    <p className="text-sm text-[#6A778F]">
                      No hay citas agendadas.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadsWithMeta
                      .filter((l) => l.estado === 'agendado')
                      .map((lead) => (
                        <QueueItem key={lead.id} lead={lead} />
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ESTADÍSTICAS ── */}
            {activeTab === 'estadisticas' && (
              <div className="p-5 lg:p-6">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                    {
                      label: 'Total leads',
                      value: String(initialLeads.length),
                      color: 'text-[#06559F]',
                    },
                    {
                      label: 'Score promedio',
                      value: String(
                        Math.round(
                          initialLeads.reduce(
                            (s, l) => s + l.score_parcial,
                            0,
                          ) / (initialLeads.length || 1),
                        ),
                      ),
                      color: 'text-[#212B52]',
                    },
                    {
                      label: 'Convertidos',
                      value: String(
                        leadsWithMeta.filter((l) => l.estado === 'convertido')
                          .length,
                      ),
                      color: 'text-emerald-600',
                    },
                    {
                      label: 'Tasa conversión',
                      value: `${Math.round(
                        (leadsWithMeta.filter((l) => l.estado === 'convertido')
                          .length /
                          (initialLeads.length || 1)) *
                          100,
                      )}%`,
                      color: 'text-violet-600',
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/40 bg-white/60 p-5 backdrop-blur-xl"
                    >
                      <p className="text-[13px] text-[#6A778F]">
                        {stat.label}
                      </p>
                      <p className={`mt-1 text-3xl font-black ${stat.color}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Nivel distribution */}
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {(
                    [
                      {
                        nivel: 'Rojo',
                        color: 'border-l-red-500 bg-red-50/50',
                        textColor: 'text-red-700',
                      },
                      {
                        nivel: 'Amarillo',
                        color: 'border-l-amber-500 bg-amber-50/50',
                        textColor: 'text-amber-700',
                      },
                      {
                        nivel: 'Verde',
                        color: 'border-l-emerald-500 bg-emerald-50/50',
                        textColor: 'text-emerald-700',
                      },
                    ] as const
                  ).map(({ nivel, color, textColor }) => {
                    const count = initialLeads.filter(
                      (l) => l.nivel === nivel,
                    ).length
                    const pct = initialLeads.length
                      ? Math.round((count / initialLeads.length) * 100)
                      : 0
                    return (
                      <div
                        key={nivel}
                        className={`rounded-xl border-l-4 ${color} p-4 backdrop-blur-xl`}
                      >
                        <p className="text-xs font-bold text-[#6A778F]">
                          {nivel}
                        </p>
                        <p className={`text-2xl font-black ${textColor}`}>
                          {count}
                        </p>
                        <p className="text-[11px] text-[#6A778F]">{pct}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModoContacto && (
        <ModoContacto
          leads={contactableLeads}
          onClose={() => {
            setShowModoContacto(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

/* ── Sub-components ── */

function QueueHeader({
  icon: Icon,
  iconColor,
  label,
  className = '',
}: {
  icon: typeof Flame
  iconColor: string
  label: string
  className?: string
}) {
  return (
    <h3
      className={`flex items-center gap-2 pt-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#6A778F] ${className}`}
    >
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      {label}
    </h3>
  )
}

function QueueItem({ lead }: { lead: Lead }) {
  const age = calcAge(lead.fecha_nacimiento)
  const isUrgent = lead.nivel === 'Rojo'

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white/70 p-3.5 backdrop-blur-lg transition-all hover:shadow-md sm:gap-4 sm:p-4 ${
        isUrgent
          ? 'border-y-white/40 border-r-white/40 border-l-4 border-l-red-500'
          : 'border-white/40'
      }`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white sm:h-11 sm:w-11"
        style={{
          background: isUrgent
            ? 'linear-gradient(135deg, #DC2626, #991B1B)'
            : 'linear-gradient(135deg, #1E8DCE, #06559F)',
        }}
      >
        {getInitials(lead.nombre, lead.apellido)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold text-[#212B52]">
          {lead.nombre} {lead.apellido}
          <span className="ml-1.5 font-medium text-[#6A778F]">
            · {age} años
          </span>
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#6A778F]">
          {lead.departamento} · CC {lead.cedula} · {timeAgo(lead.created_at)}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-black ${scoreBadgeClasses(lead.score_parcial)}`}
      >
        {lead.score_parcial}
      </span>

      <div className="flex shrink-0 gap-1.5">
        <a
          href={waLink(lead.telefono, lead.nombre)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#25D366] text-white transition-transform hover:scale-105"
          aria-label={`WhatsApp ${lead.nombre}`}
        >
          <MessageCircle className="h-4 w-4" />
        </a>
        <a
          href={`tel:${lead.telefono}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#06559F] text-white transition-transform hover:scale-105"
          aria-label={`Llamar a ${lead.nombre}`}
        >
          <Phone className="h-4 w-4" />
        </a>
        <Link
          href={`/admin/crm/${lead.id}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F4FA] text-[#06559F] transition-transform hover:scale-105"
          aria-label={`Ver detalle de ${lead.nombre}`}
        >
          <Eye className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

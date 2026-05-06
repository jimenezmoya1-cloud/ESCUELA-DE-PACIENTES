'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneCall } from 'lucide-react'
import type { Lead } from '@/types/database'
import { calcularPrioridad, getTier } from '@/lib/chequeo/priority'
import { addContactEntry, updateLeadEstado } from '@/lib/chequeo/actions'
import FilterChips from '@/components/admin/crm/FilterChips'
import LeadCard from '@/components/admin/crm/LeadCard'
import ModoContacto from '@/components/admin/crm/ModoContacto'

interface CrmClientProps {
  initialLeads: Lead[]
}

type ContactForm = {
  leadId: string
  tipo: 'llamada' | 'whatsapp' | 'email'
  resultado: string
  nota: string
}

export default function CrmClient({ initialLeads }: CrmClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeFilter, setActiveFilter] = useState('urgentes')
  const [contactForm, setContactForm] = useState<ContactForm | null>(null)
  const [showModoContacto, setShowModoContacto] = useState(false)

  // Compute priority and tier for each lead
  const leadsWithMeta = useMemo(
    () =>
      initialLeads.map((lead) => ({
        ...lead,
        _priority: calcularPrioridad(lead),
        _tier: getTier(lead),
      })),
    [initialLeads],
  )

  // Counts per tier
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      todos: leadsWithMeta.length,
      urgentes: 0,
      activos: 0,
      seguimiento: 0,
      convertidos: 0,
      descartados: 0,
    }
    for (const l of leadsWithMeta) {
      c[l._tier] = (c[l._tier] ?? 0) + 1
    }
    return c
  }, [leadsWithMeta])

  // Filter and sort
  const filteredLeads = useMemo(() => {
    let list =
      activeFilter === 'todos'
        ? leadsWithMeta
        : leadsWithMeta.filter((l) => l._tier === activeFilter)
    list = [...list].sort((a, b) => {
      if (b._priority !== a._priority) return b._priority - a._priority
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    return list
  }, [leadsWithMeta, activeFilter])

  // Leads for Modo Contacto (urgentes + activos, sorted by priority)
  const contactableLeads = useMemo(
    () =>
      leadsWithMeta
        .filter((l) => l._tier === 'urgentes' || l._tier === 'activos')
        .sort((a, b) => b._priority - a._priority),
    [leadsWithMeta],
  )

  function handleContact(leadId: string) {
    setContactForm({
      leadId,
      tipo: 'llamada',
      resultado: '',
      nota: '',
    })
  }

  async function handleSubmitContact() {
    if (!contactForm || !contactForm.resultado) return
    startTransition(async () => {
      await addContactEntry(contactForm.leadId, {
        tipo: contactForm.tipo,
        resultado: contactForm.resultado,
        nota: contactForm.nota,
      })
      if (contactForm.resultado === 'No interesado') {
        await updateLeadEstado(contactForm.leadId, 'descartado')
      } else if (contactForm.resultado === 'Interesado') {
        await updateLeadEstado(contactForm.leadId, 'interesado')
      }
      setContactForm(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-[#212B52]">CRM Leads</h1>
        <button
          onClick={() => setShowModoContacto(true)}
          disabled={contactableLeads.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-[#06559F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#06559F]/90 disabled:opacity-50"
        >
          <PhoneCall className="h-4 w-4" />
          Modo Contacto
        </button>
      </div>

      {/* Filters */}
      <FilterChips
        active={activeFilter}
        counts={counts}
        onChange={setActiveFilter}
      />

      {/* Bandeja */}
      <div>
        <p className="mb-3 text-sm font-medium text-gray-500">
          Bandeja de hoy ({filteredLeads.length} leads)
        </p>

        {filteredLeads.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
            No hay leads en esta categoria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <div key={lead.id}>
                <LeadCard
                  lead={lead}
                  onContact={() => handleContact(lead.id)}
                />

                {/* Inline contact form */}
                {contactForm?.leadId === lead.id && (
                  <div className="ml-4 mt-2 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm space-y-3">
                    <p className="text-xs font-semibold text-gray-600">
                      Registrar contacto
                    </p>

                    {/* Tipo */}
                    <div className="flex gap-2">
                      {(
                        ['llamada', 'whatsapp', 'email'] as const
                      ).map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            setContactForm({ ...contactForm, tipo: t })
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            contactForm.tipo === t
                              ? 'bg-[#06559F] text-white'
                              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Resultado buttons */}
                    <div className="flex flex-wrap gap-2">
                      {['Contesto', 'No contesto', 'Buzon'].map(
                        (r) => (
                          <button
                            key={r}
                            onClick={() =>
                              setContactForm({
                                ...contactForm,
                                resultado: r,
                              })
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              contactForm.resultado === r
                                ? 'bg-[#212B52] text-white'
                                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {r}
                          </button>
                        ),
                      )}
                    </div>

                    {/* Nota */}
                    <textarea
                      placeholder="Nota (opcional)"
                      value={contactForm.nota}
                      onChange={(e) =>
                        setContactForm({
                          ...contactForm,
                          nota: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
                      rows={2}
                    />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSubmitContact}
                        disabled={!contactForm.resultado || isPending}
                        className="rounded-lg bg-[#06559F] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#06559F]/90 disabled:opacity-50"
                      >
                        {isPending ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setContactForm(null)}
                        className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modo Contacto overlay */}
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

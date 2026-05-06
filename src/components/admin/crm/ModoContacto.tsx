'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { X, Phone, Mail } from 'lucide-react'
import type { Lead } from '@/types/database'
import { addContactEntry, updateLeadEstado } from '@/lib/chequeo/actions'

interface ModoContactoProps {
  leads: Lead[]
  onClose: () => void
}

function calcAge(fechaNacimiento: string): number {
  return Math.floor(
    (Date.now() - new Date(fechaNacimiento).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  )
}

function scoreBadgeClasses(score: number): string {
  if (score <= 50) return 'bg-red-100 text-red-700'
  if (score <= 79) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

type Resultado = 'Contesto' | 'No contesto' | 'Buzon'
type SubResultado = 'Interesado' | 'No interesado' | 'Llamar despues'

export default function ModoContacto({ leads, onClose }: ModoContactoProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [subResultado, setSubResultado] = useState<SubResultado | null>(null)
  const [nota, setNota] = useState('')
  const [isPending, startTransition] = useTransition()

  const lead = leads[currentIndex]

  const resetForm = useCallback(() => {
    setResultado(null)
    setSubResultado(null)
    setNota('')
  }, [])

  function handleSaveAndNext() {
    if (!resultado || !lead) return
    startTransition(async () => {
      const finalResultado = subResultado
        ? `${resultado} - ${subResultado}`
        : resultado

      await addContactEntry(lead.id, {
        tipo: 'llamada',
        resultado: finalResultado,
        nota,
      })

      // Update estado based on sub-resultado
      if (subResultado === 'No interesado') {
        await updateLeadEstado(lead.id, 'descartado')
      } else if (subResultado === 'Interesado') {
        await updateLeadEstado(lead.id, 'interesado')
      } else if (resultado === 'No contesto' || resultado === 'Buzon') {
        await updateLeadEstado(lead.id, 'contactado')
      }

      resetForm()
      if (currentIndex < leads.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      }
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if typing in textarea
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      )
        return

      if (e.key === '1') {
        setResultado('Contesto')
        setSubResultado(null)
      } else if (e.key === '2') {
        setResultado('No contesto')
        setSubResultado(null)
      } else if (e.key === '3') {
        setResultado('Buzon')
        setSubResultado(null)
      } else if (e.key === 'Enter' && resultado) {
        e.preventDefault()
        handleSaveAndNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado, subResultado, nota, currentIndex])

  if (!lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#212B52]">
            No hay leads para contactar
          </p>
          <button
            onClick={onClose}
            className="mt-4 rounded-lg bg-[#06559F] px-6 py-2 text-sm font-medium text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const age = calcAge(lead.fecha_nacimiento)
  const conditions = lead.enfermedades.filter((e) => e !== 'Ninguna')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white min-h-dvh overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
        <p className="text-sm font-medium text-gray-500">
          Lead {currentIndex + 1} de {leads.length}
        </p>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Lead info */}
      <div className="flex-1 p-4 sm:p-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Name and score */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#212B52]">
                {lead.nombre} {lead.apellido}
              </h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${scoreBadgeClasses(lead.score_parcial)}`}
              >
                {lead.score_parcial}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {age} anios &middot; CC {lead.cedula}
            </p>
          </div>

          {/* Conditions */}
          {conditions.length > 0 && (
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
          )}

          {/* Contact info */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <a
              href={`tel:${lead.telefono}`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Phone className="h-4 w-4" />
              {lead.telefono}
            </a>
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" />
                {lead.email}
              </a>
            )}
          </div>

          {/* Resultado */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Resultado de la llamada
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['Contesto', '1'],
                  ['No contesto', '2'],
                  ['Buzon', '3'],
                ] as [Resultado, string][]
              ).map(([r, shortcut]) => (
                <button
                  key={r}
                  onClick={() => {
                    setResultado(r)
                    setSubResultado(null)
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    resultado === r
                      ? 'bg-[#212B52] text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded bg-gray-200/40 text-[10px] font-bold">
                    {shortcut}
                  </span>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-resultado (only if "Contesto") */}
          {resultado === 'Contesto' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Detalle
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  ['Interesado', 'No interesado', 'Llamar despues'] as SubResultado[]
                ).map((sr) => (
                  <button
                    key={sr}
                    onClick={() => setSubResultado(sr)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      subResultado === sr
                        ? 'bg-[#1E8DCE] text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {sr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nota */}
          <textarea
            placeholder="Nota (opcional)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#06559F] focus:outline-none focus:ring-1 focus:ring-[#06559F]"
            rows={3}
          />

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetForm()
                setCurrentIndex((prev) => Math.max(0, prev - 1))
              }}
              disabled={currentIndex === 0}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              onClick={handleSaveAndNext}
              disabled={!resultado || isPending}
              className="flex-1 rounded-lg bg-[#06559F] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#06559F]/90 disabled:opacity-50"
            >
              {isPending
                ? 'Guardando...'
                : currentIndex === leads.length - 1
                  ? 'Guardar y finalizar'
                  : 'Guardar y siguiente'}
            </button>
          </div>

          {/* Keyboard hints */}
          <p className="text-center text-[10px] text-gray-400">
            Atajos: 1=Contesto, 2=No contesto, 3=Buzon, Enter=Guardar y
            siguiente
          </p>
        </div>
      </div>
    </div>
  )
}

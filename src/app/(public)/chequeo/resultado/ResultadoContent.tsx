'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Stethoscope, FlaskConical, ClipboardCheck, Share2 } from 'lucide-react'
import { calcularScoreParcial, getWorstComponents } from '@/lib/chequeo/scoring'
import type { ChequeoFormData } from '@/lib/chequeo/types'
import EcgAnimation from '@/components/chequeo/EcgAnimation'
import ScoreGauge from '@/components/chequeo/ScoreGauge'
import ComponentChart from '@/components/chequeo/ComponentChart'
import InsightCard from '@/components/chequeo/InsightCard'
import RegistrationForm from '@/components/chequeo/RegistrationForm'
import ConfirmationCard from '@/components/chequeo/ConfirmationCard'

type Phase = 'ecg' | 'report' | 'confirmed'

export default function ResultadoContent() {
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<Phase>('ecg')
  const [registrationName, setRegistrationName] = useState('')
  const [accountCreated, setAccountCreated] = useState(false)

  const formData = useMemo<ChequeoFormData | null>(() => {
    const raw = searchParams.get('data')
    if (!raw) return null
    try {
      return JSON.parse(atob(raw))
    } catch {
      return null
    }
  }, [searchParams])

  const score = useMemo(() => {
    if (!formData) return null
    return calcularScoreParcial(formData)
  }, [formData])

  const worstComponents = useMemo(() => {
    if (!score) return []
    return getWorstComponents(score.componentes, 3)
  }, [score])

  const handleEcgComplete = useCallback(() => {
    setPhase('report')
  }, [])

  const handleRegistrationSuccess = useCallback(
    (result: { accountCreated: boolean; nombre: string }) => {
      setRegistrationName(result.nombre)
      setAccountCreated(result.accountCreated)
      setPhase('confirmed')
    },
    [],
  )

  if (!formData || !score) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <p className="text-[#212B52] font-medium">
            No se encontraron datos del chequeo.
          </p>
          <a
            href="/chequeo"
            className="mt-4 inline-block rounded-lg bg-[#06559F] px-6 py-2 text-sm font-medium text-white hover:bg-[#054A87]"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  if (phase === 'ecg') {
    return (
      <main className="min-h-dvh px-4 py-16">
        <EcgAnimation onComplete={handleEcgComplete} />
      </main>
    )
  }

  const shareText = encodeURIComponent(
    `Hice mi chequeo cardiovascular gratuito en CAIMED. ¡Hazlo tú también! ${typeof window !== 'undefined' ? window.location.origin : ''}/chequeo`,
  )

  return (
    <main className="min-h-dvh px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Score Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <ScoreGauge score={score.scoreParcial} nivel={score.nivel} />
        </motion.div>

        {/* Component Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        >
          <ComponentChart componentes={score.componentes} />
        </motion.div>

        {/* Insight Cards */}
        {worstComponents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-base font-semibold text-[#212B52]">
              Áreas de atención
            </h3>
            {worstComponents.map((comp) => (
              <InsightCard
                key={comp.nombre}
                componentName={comp.nombre}
                score={comp.puntaje}
              />
            ))}
          </motion.div>
        )}

        {/* Evaluacion completa */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.3 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <h3 className="mb-4 text-base font-semibold text-[#212B52]">
            ¿Qué incluye una evaluación completa?
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Stethoscope
                className="mt-0.5 h-5 w-5 shrink-0 text-[#1E8DCE]"
                aria-hidden="true"
              />
              <p className="text-sm text-[#6A778F]">
                Medición de presión arterial y exámenes de laboratorio.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <FlaskConical
                className="mt-0.5 h-5 w-5 shrink-0 text-[#1E8DCE]"
                aria-hidden="true"
              />
              <p className="text-sm text-[#6A778F]">
                Evaluación detallada por un médico especialista.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ClipboardCheck
                className="mt-0.5 h-5 w-5 shrink-0 text-[#1E8DCE]"
                aria-hidden="true"
              />
              <p className="text-sm text-[#6A778F]">
                Tu Score CAIMED completo con plan de acción personalizado.
              </p>
            </div>
          </div>
          <p className="mt-4 text-center text-sm font-medium text-[#212B52]">
            Llama sin compromiso y entérate más de nuestro programa.
          </p>
        </motion.div>

        {/* Cuidate section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.4 }}
          className="text-center"
        >
          <h3 className="text-lg font-semibold text-[#212B52]">
            Cuídate por ti. Y por los tuyos.
          </h3>
          <p className="mt-1 text-sm text-[#6A778F]">
            Estar para verlos crecer.
          </p>
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#06559F] px-4 py-2 text-sm font-medium text-[#06559F] transition-colors hover:bg-[#F0F4FA]"
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Compartir por WhatsApp
          </a>
        </motion.div>

        {/* Registration / Confirmation */}
        {phase === 'report' && (
          <RegistrationForm
            score={score}
            formData={formData}
            onSuccess={handleRegistrationSuccess}
          />
        )}

        {phase === 'confirmed' && (
          <ConfirmationCard
            nombre={registrationName}
            score={score.scoreParcial}
            accountCreated={accountCreated}
          />
        )}
      </div>
    </main>
  )
}

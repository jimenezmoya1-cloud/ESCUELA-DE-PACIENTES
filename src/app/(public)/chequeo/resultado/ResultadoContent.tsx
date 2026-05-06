'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Share2, HeartPulse, Car, ShieldCheck, User, Stethoscope, Heart, Activity, Zap, Phone } from 'lucide-react'
import { calcularScoreParcial, getWorstComponents } from '@/lib/chequeo/scoring'
import type { ChequeoFormData } from '@/lib/chequeo/types'
import EcgAnimation from '@/components/chequeo/EcgAnimation'
import ScoreGauge from '@/components/chequeo/ScoreGauge'
import ComponentChart from '@/components/chequeo/ComponentChart'
import InsightCard from '@/components/chequeo/InsightCard'
import RegistrationForm from '@/components/chequeo/RegistrationForm'

type Phase = 'ecg' | 'register' | 'report'

function getPersuasiveScript(worstComponent: { nombre: string; puntaje: number } | undefined, allGreen: boolean) {
  if (allGreen || !worstComponent) {
    return {
      encabezado: '¡Felicidades! Tus resultados hoy son excepcionales. Pero... ¿y mañana?',
      cuerpo: 'El **80% de los infartos** ocurren en personas que se sentían perfectamente bien el día anterior. Las enfermedades cardiovasculares **no avisan**.',
      factorTitulo: 'TU SCORE HOY: VERDE',
      factorDato: 'Mantener un score verde requiere **monitoreo activo**. Sin seguimiento, los perfiles más saludables pueden deteriorarse silenciosamente en **12-18 meses**.',
      comercial: '¿Le cambias el aceite a tu carro cada 10.000 km, verdad? **Tu corazón late 100.000 veces al día.** ¿Cuándo fue la última vez que lo revisaste de verdad?\n\nProteger la salud que ya tienes es la decisión más inteligente.',
      ctaText: 'Tu salud está bien hoy. Asegurémonos de que siga así.',
    }
  }

  const scripts: Record<string, { encabezado: string; cuerpo: string; factorTitulo: string; factorDato: string; comercial: string; ctaText: string }> = {
    Peso: {
      encabezado: 'Encontramos algo que necesitas saber hoy, no mañana.',
      cuerpo: 'Hay un componente trabajando en tu contra silenciosamente, con un **impacto directo en tu corazón**.',
      factorTitulo: `PESO — ACCIÓN PRIORITARIA ${worstComponent.puntaje}/100`,
      factorDato: 'Cada kilo extra obliga a tu corazón a bombear sangre por kilómetros adicionales de tejido. Genera **inflamación crónica** que deteriora tus arterias año tras año.\n\nEl sobrepeso multiplica por 3 el riesgo de hipertensión y por 2.5 el de infarto.',
      comercial: 'Tu CAIMED Score es como el **sensor de tu carro**: hoy te está enviando una señal.\n\nEl mantenimiento preventivo es vital antes de que el daño sea visible.',
      ctaText: 'Tu corazón no puede esperar. Actúa hoy.',
    },
    'Acceso a medicamentos': {
      encabezado: 'Lo que encontramos es prioritario —y tiene solución.',
      cuerpo: 'Hay un componente que está **comprometiendo la efectividad** de todo lo demás.',
      factorTitulo: `ACCESO A MEDICAMENTOS — ACCIÓN PRIORITARIA ${worstComponent.puntaje}/100`,
      factorDato: 'No tener acceso constante a tus medicamentos es un **riesgo directo para tu salud**. Un día sin medicación desestabiliza meses de control.\n\nLas fluctuaciones en tu tratamiento generan un descontrol que puede ser irreversible.',
      comercial: 'Imagina que el aceite de tu motor se acaba y solo lo repones cuando puedes. **El daño es silencioso y acumulativo.**\n\nNuestro programa incluye intervención activa para que **nunca más el acceso sea un obstáculo**.',
      ctaText: 'El acceso a tu tratamiento no puede ser una barrera.',
    },
    Nicotina: {
      encabezado: 'Hay algo en tu reporte que no podemos ignorar.',
      cuerpo: 'Un factor está bloqueando tu potencial de salud y **cada día hace más daño**.',
      factorTitulo: `EXPOSICIÓN A NICOTINA — ACCIÓN PRIORITARIA ${worstComponent.puntaje}/100`,
      factorDato: 'La nicotina aumenta la rigidez vascular y **multiplica el riesgo de infarto**.\n\nFumar un cigarrillo aumenta tu presión arterial un 10% por 20 minutos. Tus arterias envejecen hasta **10 años más rápido**.',
      comercial: 'Si a tu carro le echas combustible contaminado, el motor se deteriora rápido. **La nicotina es ese combustible.**\n\nTenemos intervenciones específicas con **acompañamiento médico real**.',
      ctaText: 'Cada día importa. Hoy puede ser el día que cambie todo.',
    },
    'Actividad física': {
      encabezado: 'Encontramos algo que tu corazón necesita que sepas.',
      cuerpo: 'Hay un componente que afecta al corazón de maneras que no se sienten —**hasta que sí se sienten**.',
      factorTitulo: `ACTIVIDAD FÍSICA — ACCIÓN PRIORITARIA ${worstComponent.puntaje}/100`,
      factorDato: 'Sin actividad, el músculo cardíaco pierde eficiencia. **El proceso empieza a los pocos meses de sedentarismo.**\n\nEl sedentarismo tiene el mismo impacto que fumar 15 cigarrillos al día.',
      comercial: '¿Dejarías tu carro sin usar meses y esperarías que funcione perfecto? **El motor se deteriora sin uso.**\n\nDiseñaremos un **plan de actividad física adaptado a ti**, con seguimiento médico real.',
      ctaText: 'El movimiento es medicina. Empecemos con el tuyo.',
    },
    Sueño: {
      encabezado: 'Lo que encontramos ocurre cada noche mientras duermes.',
      cuerpo: 'Un factor opera en tu contra en silencio, mientras el mundo cree que estás descansando.',
      factorTitulo: `SUEÑO — ACCIÓN PRIORITARIA ${worstComponent.puntaje}/100`,
      factorDato: 'Dormir menos de 7 horas activa hormonas de estrés. **Tu corazón trabaja horas extra mientras duermes.**\n\nEl sueño deficiente aumenta un 48% el riesgo de enfermedad coronaria.',
      comercial: 'Tu carro tiene un período de enfriamiento. Si lo apagas y enciendes antes de tiempo, **el daño interno es real.**\n\nIncluimos protocolos de **higiene del sueño con seguimiento médico** para identificar la causa y corregirla.',
      ctaText: 'Esta noche puede ser diferente. Empieza ahora.',
    },
    'Desconoce condición': {
      encabezado: 'Es importante conocer bien tu estado de salud.',
      cuerpo: 'Un factor que puede hacer la diferencia es **entender exactamente cómo estás**.',
      factorTitulo: `CONOCIMIENTO DE TU SALUD — ACCIÓN PRIORITARIA ${worstComponent.puntaje}/100`,
      factorDato: 'No conocer tu condición de salud significa que **no puedes actuar a tiempo**. Muchas enfermedades cardiovasculares son silenciosas por años.\n\nUna evaluación completa te da claridad.',
      comercial: '¿Manejarías tu carro sin ver el tablero? **Sin información, no hay control.**\n\nNuestro programa te da **visibilidad total** de tu estado cardiovascular.',
      ctaText: 'Conocerte es el primer paso. Hazlo hoy.',
    },
  }

  return scripts[worstComponent.nombre] ?? scripts.Peso
}

function renderMarkdownBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

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
    setPhase('register')
  }, [])

  const handleRegistrationSuccess = useCallback(
    (result: { accountCreated: boolean; nombre: string }) => {
      setRegistrationName(result.nombre)
      setAccountCreated(result.accountCreated)
      setPhase('report')
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

  // Phase: ECG animation
  if (phase === 'ecg') {
    return (
      <main className="min-h-dvh px-4 py-16">
        <EcgAnimation onComplete={handleEcgComplete} />
      </main>
    )
  }

  // Phase: Registration (show score teaser + registration form)
  if (phase === 'register') {
    return (
      <main className="min-h-dvh px-4 py-12 bg-gradient-to-b from-[#F0F4FA] to-white">
        <div className="mx-auto max-w-lg space-y-6">
          {/* Score teaser */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-center"
          >
            <p className="text-sm font-medium text-[#6A778F] uppercase tracking-wide">
              Tu score parcial
            </p>
            <p
              className="text-7xl font-extrabold mt-2"
              style={{ color: score.nivel === 'Verde' ? '#22C55E' : score.nivel === 'Amarillo' ? '#EAB308' : '#EF4444' }}
            >
              {score.scoreParcial}
              <span className="text-3xl font-light text-gray-300 ml-1">/100</span>
            </p>
            <p className="text-[#212B52] font-semibold mt-2">
              Completa tus datos para ver tu reporte completo
            </p>
          </motion.div>

          {/* Registration form */}
          <RegistrationForm
            score={score}
            formData={formData}
            onSuccess={handleRegistrationSuccess}
          />
        </div>
      </main>
    )
  }

  // Phase: Full report (after registration)
  const allGreen = score.componentes.every((c) => c.puntaje >= 80)
  const script = getPersuasiveScript(worstComponents[0], allGreen)
  const firstName = registrationName || 'Paciente'

  const shareText = encodeURIComponent(
    `Hice mi chequeo cardiovascular gratuito en CAIMED. ¡Hazlo tú también! ${typeof window !== 'undefined' ? window.location.origin : ''}/chequeo`,
  )

  const hasComorbidities = formData.enfermedades.filter((e) => e !== 'Ninguna').length > 0

  return (
    <div className="min-h-dvh">
      {/* ═══════ SECTION 1: Score + Chart + Insights (white bg) ═══════ */}
      <section className="bg-white px-4 py-12">
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

          {/* Comorbidities banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}
            className={`w-full p-5 rounded-xl border-2 flex items-center gap-4 ${
              hasComorbidities
                ? 'bg-red-50 border-red-400 text-red-700'
                : 'bg-emerald-50 border-emerald-400 text-emerald-700'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                hasComorbidities ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
              }`}
            >
              {hasComorbidities ? (
                <Activity className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <span className="text-sm font-bold leading-snug">
              {hasComorbidities
                ? 'Según tus datos, cuentas con condiciones como diabetes, hipertensión, u otras que afectan tu riesgo cardiovascular.'
                : '¡Felicitaciones! No detectamos condiciones preexistentes en tus datos.'}
            </span>
          </motion.div>

          {/* Insight Cards — worst components */}
          {worstComponents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
              className="space-y-3"
            >
              <h3 className="text-base font-semibold text-[#212B52]">
                Componentes clave a trabajar
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
        </div>
      </section>

      {/* ═══════ SECTION 2: Persuasive dark page (per-component script) ═══════ */}
      <section className="bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.1),transparent)] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 px-6 py-8 border-b border-slate-800 flex items-center gap-4">
          <div className="bg-[#06559F] p-3 rounded-2xl shadow-lg shadow-blue-500/30">
            <HeartPulse className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">CAIMED</h2>
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.3em]">Cardiopreventiva</p>
          </div>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative z-10 px-6 py-10 sm:px-10"
        >
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                <Activity className="w-48 h-48" />
              </div>
              <div className="relative z-10 space-y-6">
                <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
                  {script.encabezado}
                </h3>
                <p className="text-slate-300 text-lg leading-relaxed">
                  {renderMarkdownBold(script.cuerpo)}
                </p>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-2xl p-6 sm:p-8">
                  <h4 className="text-lg font-extrabold uppercase tracking-tight text-amber-400">
                    {script.factorTitulo}
                  </h4>
                  <div className="mt-4 text-slate-200 leading-relaxed space-y-3">
                    {script.factorDato.split('\n\n').map((paragraph, i) => (
                      <p key={i}>{renderMarkdownBold(paragraph)}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 3: Car analogy ═══════ */}
      <section className="bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.1),transparent)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="relative z-10 px-6 py-10 sm:px-10"
        >
          <div className="max-w-2xl mx-auto">
            <div className="bg-blue-900/40 backdrop-blur border border-blue-500/30 rounded-3xl p-8 sm:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.05] rotate-12">
                <Zap className="w-48 h-48" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="bg-blue-500/20 p-5 rounded-full mb-6 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                  <Car className="w-12 h-12 text-blue-400" />
                </div>
                <div className="text-slate-200 text-lg sm:text-xl leading-relaxed space-y-4">
                  {script.comercial.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{renderMarkdownBold(paragraph)}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 4: Para ti, tu médico, tu familia ═══════ */}
      <section className="bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.1),transparent)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="relative z-10 px-6 py-10 sm:px-10"
        >
          <div className="max-w-2xl mx-auto space-y-8">
            <h4 className="text-2xl sm:text-3xl font-extrabold text-center">
              ¿Para qué sirve tu reporte CAIMED?
            </h4>
            <p className="text-slate-300 text-center text-lg">
              Este no es un examen más. Es una herramienta que trabaja para tres personas a la vez:
            </p>

            {/* Tri-column */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: User, label: 'Para ti', text: 'Entiende tu estado cardiovascular con colores y un puntaje claro. Sin jerga médica.' },
                { icon: Stethoscope, label: 'Para tu médico', text: 'Una guía actualizada para monitorear tu evolución y ajustar tu plan.' },
                { icon: Heart, label: 'Para tu familia', text: 'Visibilidad real de tu progreso —para que puedan apoyarte.' },
              ].map(({ icon: Icon, label, text }) => (
                <div key={label} className="bg-slate-800/80 border border-slate-600 rounded-2xl p-6 flex flex-col items-center text-center">
                  <div className="bg-blue-500/20 p-3 rounded-full mb-4">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <strong className="text-blue-400 text-lg mb-2">{label}</strong>
                  <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Blockquote */}
            <blockquote className="border-l-4 border-blue-500 pl-6 py-4 italic text-slate-300 text-lg bg-blue-900/20 rounded-r-2xl">
              &quot;Al igual que llevas tu carro al taller cada 10.000 kilómetros —aunque esté funcionando bien— tu salud cardiovascular necesita mantenimiento preventivo.&quot;
              <span className="block mt-3 text-blue-400 font-bold not-italic text-sm uppercase tracking-wider">
                — Equipo CAIMED
              </span>
            </blockquote>

            {/* Personalized message */}
            <p className="text-white font-bold text-xl text-center bg-gradient-to-r from-slate-800 to-slate-900 py-6 px-4 rounded-2xl border border-slate-700">
              Diseñado para personas como tú. Para{' '}
              <span className="text-blue-400">{firstName}</span>, que quiere llegar lejos —con el motor en perfectas condiciones.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ═══════ SECTION 5: CTA + Share ═══════ */}
      <section className="bg-gradient-to-b from-slate-900 to-[#212B52] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          {/* CTA banner */}
          <div className="bg-gradient-to-r from-[#06559F] to-[#1E8DCE] rounded-2xl p-8 shadow-xl">
            <h4 className="text-2xl font-extrabold mb-3 tracking-tight">
              {script.ctaText}
            </h4>
            <p className="text-blue-100 text-lg mb-6">
              Únete al programa de <strong>Medicina Cardiopreventiva</strong> de CAIMED.
            </p>
            <a
              href="tel:+573152103063"
              className="inline-flex items-center gap-2 bg-white text-[#06559F] px-8 py-3 rounded-xl font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Phone className="w-5 h-5" />
              +57 315 210 3063
            </a>
          </div>

          {/* Share */}
          <div>
            <p className="text-slate-300 text-sm mb-3">
              Cuídate por ti. Y por los tuyos.
            </p>
            <a
              href={`https://wa.me/?text=${shareText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
              Compartir por WhatsApp
            </a>
          </div>

          {/* Account created notice */}
          {accountCreated && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-sm">
                Ya puedes iniciar sesión para ver tu perfil de salud.
              </p>
              <a
                href="/login"
                className="mt-3 inline-block rounded-lg bg-white text-[#06559F] px-5 py-2 text-sm font-bold hover:bg-blue-50 transition-colors"
              >
                Iniciar sesión
              </a>
            </div>
          )}

          {/* Footer disclaimer */}
          <p className="text-[10px] text-slate-500 italic max-w-lg mx-auto leading-relaxed">
            Este reporte corresponde a una evaluación preliminar digital; para confirmar hallazgos y diseñar un plan personalizado se requiere valoración integral en nuestras sedes.
          </p>
        </div>
      </section>
    </div>
  )
}

'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Phone, Share2, Scale, Cigarette, Activity, Moon, Pill, Brain,
  CheckCircle2, AlertTriangle, AlertCircle, Shield,
  TrendingUp, Check, ArrowRight, Quote, Heart, Sparkles,
} from 'lucide-react'
import { calcularScoreParcial, getWorstComponents } from '@/lib/chequeo/scoring'
import type { ChequeoFormData } from '@/lib/chequeo/types'
import EcgAnimation from '@/components/chequeo/EcgAnimation'
import RegistrationForm from '@/components/chequeo/RegistrationForm'

type Phase = 'ecg' | 'register' | 'report'

const COMPONENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Peso: Scale,
  Nicotina: Cigarette,
  'Actividad física': Activity,
  Sueño: Moon,
  'Acceso a medicamentos': Pill,
  'Desconoce condición': Brain,
}

const COMPONENT_LABELS: Record<string, string> = {
  Peso: 'Peso corporal',
  Nicotina: 'Consumo de nicotina',
  'Actividad física': 'Actividad física',
  Sueño: 'Calidad de sueño',
  'Acceso a medicamentos': 'Acceso a medicamentos',
  'Desconoce condición': 'Conocimiento de tu salud',
}

function scoreColor(s: number) {
  if (s >= 80) return '#10B981'
  if (s > 50) return '#F59E0B'
  return '#EF4444'
}

function nivelCfg(n: string) {
  if (n === 'Verde') return { label: 'Buen camino', Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (n === 'Amarillo') return { label: 'Requiere atención', Icon: AlertTriangle, cls: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { label: 'Atención prioritaria', Icon: AlertCircle, cls: 'bg-red-50 text-red-700 border-red-200' }
}

function summaryText(score: number, worstCount: number) {
  if (score >= 80) return 'Tu perfil refleja una base sólida para tu salud cardiovascular. Sigue así.'
  if (score > 50) return `Detectamos ${worstCount} factor${worstCount > 1 ? 'es' : ''} que puede${worstCount > 1 ? 'n' : ''} estar afectando tu salud cardiovascular.`
  return 'Detectamos factores de riesgo que necesitan atención. La buena noticia: tienen solución.'
}

function quickWin(comps: { nombre: string; puntaje: number }[]) {
  const best = [...comps].sort((a, b) => b.puntaje - a.puntaje)[0]
  if (!best || best.puntaje < 80) return null
  const m: Record<string, string> = {
    Nicotina: 'No fumar es una de las mejores decisiones para tu corazón.',
    'Actividad física': 'Tu nivel de actividad física te está protegiendo.',
    Sueño: 'Tu calidad de sueño ayuda a tu corazón a repararse cada noche.',
    Peso: 'Tu peso está en un rango saludable. Eso protege tu corazón.',
    'Acceso a medicamentos': 'Tienes buen acceso a tus medicamentos.',
    'Desconoce condición': 'Conoces bien tu estado de salud.',
  }
  return m[best.nombre] ?? null
}

const THREAT_DATA: Record<string, { headline: string; intro: string; stat1: string; source1?: string; stat2: string; testimonial: { quote: string; author: string } }> = {
  Peso: {
    headline: 'Tu peso está generando inflamación crónica que afecta tus arterias.',
    intro: 'El sobrepeso es un factor de riesgo silencioso que se puede controlar.',
    stat1: 'El sobrepeso multiplica por **3** el riesgo de hipertensión y por **2.5** el de infarto.',
    source1: 'American Heart Association, 2023',
    stat2: 'Cada kilo extra obliga a tu corazón a bombear sangre por kilómetros adicionales de tejido.',
    testimonial: { quote: 'En 90 días bajé 8 kilos. Lo que más me sorprendió: mi presión se normalizó sola.', author: 'Carlos P., 58 años' },
  },
  Nicotina: {
    headline: 'La nicotina está bloqueando tu potencial de salud cardiovascular.',
    intro: 'Cada día de exposición hace más daño a tus arterias, pero el daño es reversible.',
    stat1: 'Fumar aumenta tu presión arterial un **10%** por cada cigarrillo.',
    source1: 'European Society of Cardiology, 2022',
    stat2: 'Tus arterias envejecen hasta **10 años más rápido** con exposición a nicotina.',
    testimonial: { quote: 'Fumé 20 años. Con acompañamiento dejé de fumar en 6 semanas. Hoy respiro diferente.', author: 'Roberto M., 55 años' },
  },
  'Actividad física': {
    headline: 'Sin actividad, el músculo cardíaco pierde eficiencia progresivamente.',
    intro: 'El sedentarismo es un factor de riesgo tan importante como el tabaquismo.',
    stat1: 'El sedentarismo tiene el mismo impacto que fumar **15 cigarrillos al día**.',
    source1: 'The Lancet, 2022',
    stat2: 'Tienes un **35% más** de probabilidad de sufrir un evento cardiovascular sin actividad regular.',
    testimonial: { quote: 'Empecé con caminatas de 15 minutos. Hoy hago 45 minutos diarios y me siento otra persona.', author: 'Martha L., 62 años' },
  },
  Sueño: {
    headline: 'El sueño es la única ventana que tu corazón tiene para repararse.',
    intro: 'Si no duermes bien, tu cuerpo no puede completar los procesos de reparación cardiovascular.',
    stat1: 'Dormir menos de 7 horas aumenta el riesgo de enfermedad coronaria un **48%**.',
    source1: 'American Heart Association, 2022',
    stat2: 'Por cada hora menos de sueño, tu presión arterial sube **3 mmHg** al día siguiente.',
    testimonial: { quote: 'Mejoré mis hábitos de sueño y en 90 días mi presión bajó de 145 a 122.', author: 'Carlos P., 58 años' },
  },
  'Acceso a medicamentos': {
    headline: 'No tener acceso constante a tus medicamentos compromete tu tratamiento.',
    intro: 'La discontinuidad en el tratamiento puede revertir meses de progreso.',
    stat1: 'Un día sin medicación puede desestabilizar **meses de control** cardiovascular.',
    stat2: 'Las fluctuaciones en el tratamiento generan un descontrol que puede ser **irreversible**.',
    testimonial: { quote: 'El programa me ayudó a resolver las barreras de acceso a mis medicamentos.', author: 'Gloria S., 64 años' },
  },
  'Desconoce condición': {
    headline: 'No conocer tu condición significa que no puedes actuar a tiempo.',
    intro: 'Muchas enfermedades cardiovasculares son silenciosas durante años.',
    stat1: 'El **80% de los infartos** ocurren en personas que se sentían bien el día anterior.',
    stat2: 'Una evaluación completa te da claridad sobre tu condición y cómo cuidarte.',
    testimonial: { quote: 'No sabía que tenía hipertensión. El chequeo me abrió los ojos.', author: 'Jorge R., 56 años' },
  },
}

function bold(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} className="font-bold">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

function ScoreRing({ score, animate }: { score: number; animate: boolean }) {
  const r = 62
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  const color = scoreColor(score)
  return (
    <div className="relative w-36 h-36 sm:w-44 sm:h-44 shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full" aria-label={`Score: ${score} de 100`}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <motion.circle
          cx="80" cy="80" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: animate ? offset : c }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl sm:text-5xl font-extrabold text-[#212B52] tabular-nums leading-none">{score}</span>
        <span className="text-xs text-[#6A778F] font-medium mt-0.5">de 100</span>
      </div>
    </div>
  )
}

function ComponentRow({ name, score: s, index }: { name: string; score: number; index: number }) {
  const Icon = COMPONENT_ICONS[name] ?? Heart
  const label = COMPONENT_LABELS[name] ?? name
  const color = scoreColor(s)
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.5 + index * 0.06 }}
      className="flex items-center gap-3 py-3"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className={`w-4 h-4 ${s >= 80 ? 'text-emerald-500' : s > 50 ? 'text-amber-500' : 'text-red-500'}`} />
      </div>
      <span className="flex-1 text-sm font-medium text-[#212B52] min-w-0">{label}</span>
      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${s}%` }}
          transition={{ duration: 0.8, delay: 0.6 + index * 0.06, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums w-8 text-right ${s >= 80 ? 'text-emerald-500' : s > 50 ? 'text-amber-500' : 'text-red-500'}`}>{s}</span>
    </motion.div>
  )
}

const CARD = 'bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-lg shadow-black/[0.04]'
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

const FEATURES = [
  'Evaluación de los 14 componentes de tu salud cardiovascular',
  'Plan personalizado sobre tus componentes más débiles',
  'Escuela de Pacientes: talleres mensuales para aprender a cuidarte',
  'Score actualizado mensualmente para ver tu progreso real',
  'Acompañamiento médico continuo',
]

const STATS = [
  { value: '+18', label: 'puntos promedio de mejora', Icon: TrendingUp },
  { value: '90', label: 'días al primer cambio', Icon: Sparkles },
  { value: '94%', label: 'adherencia al programa', Icon: CheckCircle2 },
]

export default function ResultadoContent() {
  const searchParams = useSearchParams()
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('ecg')
  const [registrationName, setRegistrationName] = useState('')
  const [accountCreated, setAccountCreated] = useState(false)

  const formData = useMemo<ChequeoFormData | null>(() => {
    const raw = searchParams.get('data')
    if (!raw) return null
    try { return JSON.parse(atob(raw)) } catch { return null }
  }, [searchParams])

  const score = useMemo(() => formData ? calcularScoreParcial(formData) : null, [formData])
  const worstComponents = useMemo(() => score ? getWorstComponents(score.componentes, 3) : [], [score])

  const handleEcgComplete = useCallback(() => setPhase('register'), [])
  const handleRegistrationSuccess = useCallback((result: { accountCreated: boolean; nombre: string }) => {
    setRegistrationName(result.nombre)
    setAccountCreated(result.accountCreated)
    setPhase('report')
  }, [])

  if (!formData || !score) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className={`${CARD} p-8 text-center max-w-sm`}>
          <AlertCircle className="w-10 h-10 text-[#6A778F] mx-auto mb-3" />
          <p className="text-[#212B52] font-semibold mb-4">No se encontraron datos del chequeo.</p>
          <a href="/chequeo" className="inline-flex items-center gap-2 rounded-xl bg-[#06559F] px-6 py-3 text-sm font-semibold text-white hover:bg-[#054A87] transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }

  if (phase === 'ecg') {
    return <main className="min-h-dvh px-4 py-16"><EcgAnimation onComplete={handleEcgComplete} /></main>
  }

  if (phase === 'register') {
    const nivel = nivelCfg(score.nivel)
    return (
      <main className="min-h-dvh px-4 py-12 bg-gradient-to-b from-[#F0F4FA] to-white">
        <div className="mx-auto max-w-lg space-y-8">
          <motion.div {...fadeUp} transition={{ duration: reducedMotion ? 0.1 : 0.5 }} className="flex flex-col items-center text-center">
            <ScoreRing score={score.scoreParcial} animate={!reducedMotion} />
            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${nivel.cls}`}>
              <nivel.Icon className="w-3.5 h-3.5" />
              {nivel.label}
            </div>
            <p className="text-[#212B52] font-semibold mt-3 text-lg">Completa tus datos para ver tu reporte</p>
            <p className="text-sm text-[#6A778F] mt-1">Te tomará menos de 1 minuto.</p>
          </motion.div>
          <RegistrationForm score={score} formData={formData} onSuccess={handleRegistrationSuccess} />
        </div>
      </main>
    )
  }

  // ════════════════════════════════════════
  // REPORT
  // ════════════════════════════════════════
  const firstName = registrationName || 'Paciente'
  const nivel = nivelCfg(score.nivel)
  const win = quickWin(score.componentes)
  const sorted = [...score.componentes].sort((a, b) => b.puntaje - a.puntaje)
  const threat = worstComponents[0] ? (THREAT_DATA[worstComponents[0].nombre] ?? THREAT_DATA.Peso) : null
  const waLink = `https://wa.me/573152103063?text=${encodeURIComponent('Hola, acabo de hacer mi Chequeo Cardiovascular y me gustaría saber más sobre el programa Cardiopreventiva.')}`
  const shareText = encodeURIComponent(`Hice mi chequeo cardiovascular gratuito en CAIMED. ¡Hazlo tú también! ${typeof window !== 'undefined' ? window.location.origin : ''}/chequeo`)

  return (
    <div className="min-h-dvh bg-[#F0F4FA] relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#06559F]/[0.04] blur-3xl" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 rounded-full bg-[#1E8DCE]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-[#06559F]/[0.03] blur-3xl" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ─── Header ─── */}
        <div className="bg-gradient-to-r from-[#06559F] to-[#1E8DCE] rounded-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-base">Chequeo Cardiovascular</h1>
            <p className="text-white/70 text-xs mt-0.5">CAIMED Cardiopreventiva</p>
          </div>
          <Shield className="w-8 h-8 text-white/30" />
        </div>

        {/* ─── Section 1: Score ─── */}
        <motion.section {...fadeUp} transition={{ duration: reducedMotion ? 0.1 : 0.4 }} className={CARD}>
          <div className="p-6 sm:p-8">
            {/* Score + summary */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing score={score.scoreParcial} animate={!reducedMotion} />
              <div className="text-center sm:text-left flex-1 min-w-0">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${nivel.cls}`}>
                  <nivel.Icon className="w-3.5 h-3.5" />
                  {nivel.label}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#212B52] mt-3 leading-tight">
                  {score.scoreParcial >= 80 ? `${firstName}, tu corazón va bien` : `${firstName}, tu corazón te está hablando`}
                </h2>
                <p className="text-sm text-[#6A778F] mt-2 leading-relaxed">
                  {summaryText(score.scoreParcial, worstComponents.length)}
                </p>
              </div>
            </div>

            {/* Quick win */}
            {win && (
              <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-sm text-emerald-800"><span className="font-semibold">Lo que haces bien:</span> {win}</p>
              </div>
            )}

            {/* Component list */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-[#06559F] uppercase tracking-wider mb-1">Tus 6 componentes evaluados</h3>
              <div className="divide-y divide-slate-50">
                {sorted.map((comp, i) => (
                  <ComponentRow key={comp.nombre} name={comp.nombre} score={comp.puntaje} index={i} />
                ))}
              </div>
            </div>

            {/* Tease 14 components */}
            <div className="mt-6 rounded-2xl border border-dashed border-[#1E8DCE]/30 bg-[#F0F4FA]/60 p-5 text-center">
              <p className="text-sm text-[#212B52]">
                Este chequeo evalúa <span className="font-bold text-[#06559F]">6 componentes</span>.
                El programa Cardiopreventiva evalúa los <span className="font-bold text-[#06559F]">14 componentes</span> completos de tu salud cardiovascular.
              </p>
            </div>
          </div>
        </motion.section>

        {/* ─── Section 2: Risk Insight ─── */}
        {threat && score.scoreParcial < 80 && (
          <motion.section {...fadeUp} transition={{ duration: reducedMotion ? 0.1 : 0.4, delay: 0.1 }}
            className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(145deg, #212B52 0%, #06559F 100%)' }}>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Factor prioritario</span>
              </div>

              <h3 className="text-xl font-extrabold text-white leading-snug mb-3">{threat.headline}</h3>
              <p className="text-sm text-white/70 leading-relaxed mb-6">{threat.intro}</p>

              {/* Stats */}
              <div className="space-y-3 mb-6">
                <div className="bg-white/[0.07] rounded-xl px-4 py-3 border border-white/[0.08]">
                  <p className="text-sm text-white/90 leading-relaxed">{bold(threat.stat1)}</p>
                  {threat.source1 && <p className="text-[11px] text-white/40 mt-1">{threat.source1}</p>}
                </div>
                <div className="bg-white/[0.07] rounded-xl px-4 py-3 border border-white/[0.08]">
                  <p className="text-sm text-white/90 leading-relaxed">{bold(threat.stat2)}</p>
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-white rounded-2xl p-5">
                <Quote className="w-5 h-5 text-[#1E8DCE]/40 mb-2" />
                <p className="text-sm text-[#212B52] leading-relaxed italic">{threat.testimonial.quote}</p>
                <p className="text-xs font-bold text-[#06559F] mt-2">{threat.testimonial.author}</p>
              </div>
            </div>
          </motion.section>
        )}

        {/* ─── Section 3: Program ─── */}
        <motion.section {...fadeUp} transition={{ duration: reducedMotion ? 0.1 : 0.4, delay: 0.15 }} className={CARD}>
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 text-[#06559F]" />
              <span className="text-xs font-bold text-[#06559F] uppercase tracking-wider">Programa Cardiopreventiva</span>
            </div>
            <h3 className="text-xl font-extrabold text-[#212B52] mt-2 leading-tight">Un camino diseñado por médicos. Para ti.</h3>
            <p className="text-sm text-[#6A778F] mt-2 leading-relaxed">
              No es un programa genérico. Es <em>tu</em> camino, construido sobre tus componentes de salud cardiovascular y ajustado mes a mes.
            </p>

            {/* Features */}
            <div className="mt-6 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#06559F]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#06559F]" />
                  </div>
                  <span className="text-sm text-[#212B52] leading-snug">{f}</span>
                </div>
              ))}
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#1E8DCE]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-[#1E8DCE]" />
                </div>
                <span className="text-sm text-[#212B52] leading-snug">
                  <span className="font-semibold text-[#06559F]">14 componentes</span> vs 6 del chequeo gratuito
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              {STATS.map(({ value, label, Icon }) => (
                <div key={label} className="rounded-xl bg-[#F0F4FA] p-3 text-center">
                  <Icon className="w-4 h-4 text-[#1E8DCE] mx-auto mb-1" />
                  <div className="text-xl font-extrabold text-[#212B52] tabular-nums leading-none">{value}</div>
                  <div className="text-[11px] text-[#6A778F] mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Trust */}
            <div className="flex items-center gap-2 mt-6 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-medium text-emerald-700">Sin permanencia. Sin sorpresas. Llama sin compromiso.</span>
            </div>

            {/* CTA */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-3.5 rounded-xl font-bold text-sm hover:bg-[#20bd5a] transition-colors cursor-pointer">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.572-1.453A11.948 11.948 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.34 0-4.498-.794-6.218-2.126l-.435-.343-2.838.902.94-2.764-.378-.458A9.953 9.953 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                Escribir por WhatsApp
              </a>
              <a href="tel:+573152103063"
                className="inline-flex items-center justify-center gap-2 border border-[#06559F]/20 text-[#06559F] px-5 py-3.5 rounded-xl font-bold text-sm hover:bg-[#06559F]/5 transition-colors cursor-pointer">
                <Phone className="w-4 h-4" />
                Llamar
              </a>
            </div>
          </div>
        </motion.section>

        {/* ─── Section 4: Share ─── */}
        <motion.section {...fadeUp} transition={{ duration: reducedMotion ? 0.1 : 0.4, delay: 0.2 }} className={CARD}>
          <div className="p-6 sm:p-8 text-center">
            <Heart className="w-8 h-8 text-[#1E8DCE]/30 mx-auto mb-3" />
            <h3 className="text-lg font-extrabold text-[#212B52]">Comparte con quienes te importan</h3>
            <p className="text-sm text-[#6A778F] mt-2 leading-relaxed max-w-md mx-auto">
              Que tu familia sepa dónde estás hoy. Invítalos a hacer su chequeo gratuito.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#F0F4FA] text-[#212B52] px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#E5EBF5] transition-colors cursor-pointer">
                <Share2 className="w-4 h-4" />
                Compartir mi reporte
              </a>
              <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#F0F4FA] text-[#212B52] px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#E5EBF5] transition-colors cursor-pointer">
                <ArrowRight className="w-4 h-4" />
                Invitar a mi familia
              </a>
            </div>

            {accountCreated && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800 font-medium">Tu cuenta fue creada. Ya puedes iniciar sesión.</p>
                <a href="/login" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#06559F] px-4 py-2 text-sm font-bold text-white hover:bg-[#054A87] transition-colors cursor-pointer">
                  Iniciar sesión <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </motion.section>

        {/* ─── Disclaimer ─── */}
        <p className="text-center text-[11px] text-[#6A778F]/70 leading-relaxed px-4 pb-8">
          Este reporte corresponde a una evaluación preliminar digital. Para confirmar hallazgos
          y diseñar un plan personalizado se requiere valoración integral en nuestras sedes.
        </p>

      </div>
    </div>
  )
}

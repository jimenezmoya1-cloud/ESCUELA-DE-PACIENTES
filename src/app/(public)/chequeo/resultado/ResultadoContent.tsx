'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Share2 } from 'lucide-react'
import { calcularScoreParcial, getWorstComponents } from '@/lib/chequeo/scoring'
import type { ChequeoFormData } from '@/lib/chequeo/types'
import EcgAnimation from '@/components/chequeo/EcgAnimation'
import RegistrationForm from '@/components/chequeo/RegistrationForm'

type Phase = 'ecg' | 'register' | 'report'

const COMPONENT_ICONS: Record<string, string> = {
  Peso: '⚖️',
  Nicotina: '🚬',
  'Actividad física': '🏃',
  Sueño: '😴',
  'Acceso a medicamentos': '💊',
  'Desconoce condición': '🧠',
}

const COMPONENT_LABELS: Record<string, string> = {
  Peso: 'Peso (IMC)',
  Nicotina: 'No fumar',
  'Actividad física': 'Actividad física',
  Sueño: 'Sueño',
  'Acceso a medicamentos': 'Acceso a medicamentos',
  'Desconoce condición': 'Conocimiento de tu salud',
}

function getBarColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score > 50) return '#FBBF24'
  return '#EF4444'
}

function getNivelLabel(nivel: string): { label: string; bg: string; text: string } {
  if (nivel === 'Verde') return { label: '✅ Buen camino', bg: '#DCFCE7', text: '#166534' }
  if (nivel === 'Amarillo') return { label: '⚠️ Atención', bg: '#FEF3C7', text: '#92400E' }
  return { label: '🔴 Necesitas atención', bg: '#FEE2E2', text: '#991B1B' }
}

function getScoreMessage(score: number, worstCount: number): string {
  if (score >= 80) return '¡Felicidades! Tu perfil refleja una base sólida para tu salud cardiovascular.'
  if (score > 50) return `Detectamos ${worstCount} factor${worstCount > 1 ? 'es' : ''} que puede${worstCount > 1 ? 'n' : ''} estar afectando tu salud cardiovascular —${worstCount > 1 ? 'ambos tienen' : 'tiene'} solución.`
  return 'Detectamos factores de riesgo que necesitan atención prioritaria. La buena noticia: tienen solución.'
}

function getQuickWin(componentes: { nombre: string; puntaje: number }[]): string | null {
  const best = [...componentes].sort((a, b) => b.puntaje - a.puntaje)[0]
  if (!best || best.puntaje < 80) return null
  const msgs: Record<string, string> = {
    Nicotina: 'No fumar es una de las mejores decisiones que has tomado por tu corazón.',
    'Actividad física': 'Tu nivel de actividad física es excelente. ¡Sigue así!',
    Sueño: 'Tu calidad de sueño está ayudando a tu corazón a repararse cada noche.',
    Peso: 'Tu peso está en un rango saludable. Eso protege tu corazón.',
    'Acceso a medicamentos': 'Tienes buen acceso a tus medicamentos. Eso marca la diferencia.',
    'Desconoce condición': 'Conoces bien tu estado de salud. Eso te da poder para actuar.',
  }
  return msgs[best.nombre] ?? null
}

function getThreatScript(comp: { nombre: string; puntaje: number } | undefined) {
  if (!comp) return null
  const scripts: Record<string, { headline: string; intro: string; stat1: string; source1?: string; stat2: string; testimonial: { quote: string; author: string; change: string } }> = {
    Peso: {
      headline: 'Hay un factor trabajando en tu contra silenciosamente.',
      intro: 'Tu peso está generando inflamación crónica que afecta directamente la salud de tus arterias.',
      stat1: 'El sobrepeso multiplica por **3** el riesgo de hipertensión y por **2.5** el de infarto.',
      source1: 'American Heart Association, 2023',
      stat2: 'Cada kilo extra obliga a tu corazón a bombear sangre por kilómetros adicionales de tejido.',
      testimonial: { quote: 'Llegué con un score de 52 y sobrepeso. En 90 días bajé 8 kilos y mi score subió a 78. Lo que más me sorprendió: mi presión se normalizó sola.', author: 'Carlos P., 58 años · Bogotá', change: '+26 puntos en 90 días' },
    },
    Nicotina: {
      headline: 'Hay algo en tu reporte que no podemos ignorar.',
      intro: 'La nicotina está bloqueando tu potencial de salud y cada día hace más daño a tus arterias.',
      stat1: 'Fumar un cigarrillo aumenta tu presión arterial un **10%** por 20 minutos.',
      source1: 'European Society of Cardiology, 2022',
      stat2: 'Tus arterias envejecen hasta **10 años más rápido** con exposición a nicotina.',
      testimonial: { quote: 'Fumé 20 años. Con el programa dejé de fumar en 6 semanas. Mi score pasó de 45 a 82. Hoy respiro diferente.', author: 'Roberto M., 55 años · Medellín', change: '+37 puntos en 120 días' },
    },
    'Actividad física': {
      headline: 'Encontramos algo que tu corazón necesita que sepas.',
      intro: 'Sin actividad, el músculo cardíaco pierde eficiencia. El proceso empieza a los pocos meses de sedentarismo.',
      stat1: 'El sedentarismo tiene el mismo impacto que fumar **15 cigarrillos al día**.',
      source1: 'The Lancet, 2022',
      stat2: 'Tienes un **35% más** de probabilidad de sufrir un evento cardiovascular sin actividad regular.',
      testimonial: { quote: 'No hacía ejercicio desde hace 10 años. Empecé con caminatas de 15 minutos. Hoy hago 45 minutos diarios y mi score subió 22 puntos.', author: 'Martha L., 62 años · Bogotá', change: '+22 puntos en 90 días' },
    },
    Sueño: {
      headline: 'Lo que encontramos ocurre cada noche mientras duermes.',
      intro: 'El sueño es la única ventana que tu corazón tiene para repararse. Si no duermes bien, no hay reparación.',
      stat1: 'Dormir menos de 7 horas aumenta el riesgo de enfermedad coronaria un **48%**.',
      source1: 'American Heart Association, 2022',
      stat2: 'Por cada hora menos de sueño, tu presión arterial sube **3 mmHg** al día siguiente.',
      testimonial: { quote: 'Llegué con un score de 58. En 90 días lo subí a 81. Mi presión bajó de 145 a 122. Lo que más me sorprendió: empecé a dormir.', author: 'Carlos P., 58 años · Bogotá', change: '+23 puntos en 90 días' },
    },
    'Acceso a medicamentos': {
      headline: 'Lo que encontramos es prioritario —y tiene solución.',
      intro: 'No tener acceso constante a tus medicamentos compromete la efectividad de todo tu tratamiento.',
      stat1: 'Un día sin medicación puede desestabilizar **meses de control** cardiovascular.',
      stat2: 'Las fluctuaciones en el tratamiento generan un descontrol que puede ser **irreversible**.',
      testimonial: { quote: 'Tenía problemas para conseguir mis medicamentos. El programa me ayudó a resolver las barreras. Mi score subió 18 puntos.', author: 'Gloria S., 64 años · Cali', change: '+18 puntos en 60 días' },
    },
    'Desconoce condición': {
      headline: 'Es importante conocer bien tu estado de salud.',
      intro: 'No conocer tu condición significa que no puedes actuar a tiempo. Muchas enfermedades cardiovasculares son silenciosas por años.',
      stat1: 'El **80% de los infartos** ocurren en personas que se sentían bien el día anterior.',
      stat2: 'Una evaluación completa te da claridad sobre tu condición y cómo cuidarte mejor.',
      testimonial: { quote: 'No sabía que tenía hipertensión. El chequeo me abrió los ojos. Ahora llevo 6 meses en el programa y mi presión está controlada.', author: 'Jorge R., 56 años · Barranquilla', change: 'De desconocido a controlado' },
    },
  }
  return scripts[comp.nombre] ?? scripts.Peso
}

function renderBold(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  )
}

export default function ResultadoContent() {
  const searchParams = useSearchParams()
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
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
          <p className="text-[#212B52] font-medium">No se encontraron datos del chequeo.</p>
          <a href="/chequeo" className="mt-4 inline-block rounded-lg bg-[#06559F] px-6 py-2 text-sm font-medium text-white hover:bg-[#054A87]">Volver al inicio</a>
        </div>
      </div>
    )
  }

  if (phase === 'ecg') {
    return <main className="min-h-dvh px-4 py-16"><EcgAnimation onComplete={handleEcgComplete} /></main>
  }

  if (phase === 'register') {
    return (
      <main className="min-h-dvh px-4 py-12 bg-gradient-to-b from-[#F0F4FA] to-white">
        <div className="mx-auto max-w-lg space-y-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center">
            <p className="text-sm font-medium text-[#6A778F] uppercase tracking-wide">Tu score parcial</p>
            <p className="text-7xl font-extrabold mt-2" style={{ color: score.nivel === 'Verde' ? '#22C55E' : score.nivel === 'Amarillo' ? '#EAB308' : '#EF4444' }}>
              {score.scoreParcial}<span className="text-3xl font-light text-gray-300 ml-1">/100</span>
            </p>
            <p className="text-[#212B52] font-semibold mt-2">Completa tus datos para ver tu reporte completo</p>
          </motion.div>
          <RegistrationForm score={score} formData={formData} onSuccess={handleRegistrationSuccess} />
        </div>
      </main>
    )
  }

  // ═══════════════════════════════════════════════════
  // PHASE: REPORT (after registration) — v3 design
  // ═══════════════════════════════════════════════════
  const firstName = registrationName || 'Paciente'
  const nivel = getNivelLabel(score.nivel)
  const quickWin = getQuickWin(score.componentes)
  const sortedComponents = [...score.componentes].sort((a, b) => b.puntaje - a.puntaje)
  const threatScript = getThreatScript(worstComponents[0])
  const shareText = encodeURIComponent(`Hice mi chequeo cardiovascular gratuito en CAIMED. ¡Hazlo tú también! ${typeof window !== 'undefined' ? window.location.origin : ''}/chequeo`)
  const waLink = `https://wa.me/573152103063?text=${encodeURIComponent(`Hola, acabo de hacer mi Chequeo Cardiovascular y me gustaría saber más sobre el programa Cardiopreventiva.`)}`

  return (
    <div className="min-h-dvh bg-[#F0F4FA]">

      {/* ═══════ PAGE 1: Tu resultado ═══════ */}
      <section className="max-w-[720px] mx-auto bg-white rounded-b-3xl shadow-lg overflow-hidden">
        {/* Header strip */}
        <div className="bg-[#06559F] px-6 py-4">
          <h3 className="text-white font-bold text-base">Tu Chequeo Cardiovascular</h3>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="px-6 py-8">
          {/* Score row */}
          <div className="flex items-center gap-6 mb-6">
            {/* Score circle */}
            <div className="w-[140px] h-[140px] rounded-full flex items-center justify-center shrink-0"
              style={{ background: `conic-gradient(${getBarColor(score.scoreParcial)} 0deg ${score.scoreParcial * 3.6}deg, #E5E7EB ${score.scoreParcial * 3.6}deg 360deg)` }}>
              <div className="w-[110px] h-[110px] bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-[42px] font-black text-[#212B52] leading-none">{score.scoreParcial}</span>
                <span className="text-[11px] text-[#6A778F] font-semibold">de 100</span>
              </div>
            </div>
            {/* Summary */}
            <div className="flex-1 min-w-0">
              <span className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest mb-2"
                style={{ background: nivel.bg, color: nivel.text }}>{nivel.label}</span>
              <h4 className="text-[#212B52] text-lg font-bold leading-snug mb-1">
                {score.scoreParcial >= 80 ? '¡Tu corazón va bien!' : 'Tu corazón te está mandando señales'}
              </h4>
              <p className="text-[13px] text-[#6A778F] leading-relaxed">
                {getScoreMessage(score.scoreParcial, worstComponents.length)}
              </p>
            </div>
          </div>

          {/* Quick wins */}
          {quickWin && (
            <div className="bg-[#DCFCE7] border-l-4 border-[#22C55E] rounded-lg px-4 py-3 mb-4">
              <p className="text-[13px] text-[#166534]"><strong>Lo que estás haciendo bien:</strong> {quickWin}</p>
            </div>
          )}

          {/* Component list */}
          <h4 className="text-[#06559F] text-sm font-bold mb-2 mt-4">Tus 6 componentes evaluados hoy</h4>
          <div className="divide-y divide-[#F0F4FA]">
            {sortedComponents.map((comp) => (
              <div key={comp.nombre} className="flex items-center gap-3 py-2.5">
                <span className="text-lg w-7 shrink-0">{COMPONENT_ICONS[comp.nombre] ?? '📊'}</span>
                <span className="flex-1 text-[13px] font-bold text-[#212B52]">{COMPONENT_LABELS[comp.nombre] ?? comp.nombre}</span>
                <div className="w-[100px] h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${comp.puntaje}%`, background: getBarColor(comp.puntaje) }} />
                </div>
                <span className="text-[13px] font-black text-[#212B52] w-9 text-right">{comp.puntaje}</span>
              </div>
            ))}
          </div>

          {/* Tease: 14 componentes */}
          <div className="mt-5 bg-gradient-to-br from-[#DBEAFE] to-[#EFF6FF] border border-dashed border-[#1E8DCE] rounded-2xl p-4 text-center">
            <h5 className="text-[#06559F] text-sm font-black mb-1">Hay 8 componentes más que evaluamos en el programa</h5>
            <p className="text-[12px] text-[#6A778F]">
              Tu chequeo gratuito mide <strong className="text-[#06559F]">6 componentes clave</strong>.<br />
              El programa <strong className="text-[#06559F]">Cardiopreventiva</strong> evalúa los <strong className="text-[#06559F]">14 componentes</strong> completos de tu salud cardiovascular.
            </p>
          </div>

          {/* Trust strip */}
          <div className="mt-4 bg-[#F0F4FA] rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-[11px] text-[#6A778F]">🔬 Score validado científicamente · Más de 5,000 colombianos ya conocen el suyo</span>
          </div>

          {/* CTA */}
          <div className="mt-5 bg-gradient-to-r from-[#1E8DCE] to-[#06559F] rounded-2xl p-5 text-center text-white">
            <h3 className="text-lg font-black mb-1">¿Quieres entender mejor tu reporte?</h3>
            <p className="text-[12px] text-white/90 mb-4">Llama sin compromiso y entérate del programa Cardiopreventiva.</p>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-block bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px] uppercase tracking-wider hover:bg-[#20bd5a] transition-colors">
              📱 Hablar por WhatsApp
            </a>
          </div>
        </motion.div>
      </section>

      <div className="h-8" />

      {/* ═══════ PAGE 2: La amenaza ═══════ */}
      {threatScript && (
        <section className="max-w-[720px] mx-auto rounded-3xl overflow-hidden shadow-lg"
          style={{ background: 'linear-gradient(135deg, #212B52 0%, #06559F 100%)' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }} className="px-6 py-8 text-white">
            <div className="text-center mb-5">
              <span className="inline-block bg-[#1E8DCE]/30 text-white px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest">
                Lo que tu corazón te dice
              </span>
            </div>

            <h3 className="text-[22px] font-black leading-tight mb-3">{threatScript.headline}</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-5">{threatScript.intro}</p>

            {/* Priority block */}
            <div className="bg-[#FBBF24]/15 border border-[#FBBF24]/30 rounded-2xl p-5 mb-5">
              <h4 className="text-white text-xl font-black mb-3">
                {COMPONENT_ICONS[worstComponents[0].nombre]} {COMPONENT_LABELS[worstComponents[0].nombre] ?? worstComponents[0].nombre} · {worstComponents[0].puntaje}/100
              </h4>
              <div className="bg-white/10 rounded-xl px-4 py-3 mb-3">
                <p className="text-white text-sm leading-relaxed">{renderBold(threatScript.stat1)}</p>
                {threatScript.source1 && <p className="text-white/50 text-[10px] italic mt-1">— {threatScript.source1}</p>}
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3">
                <p className="text-white text-sm leading-relaxed">{renderBold(threatScript.stat2)}</p>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white text-[#212B52] rounded-2xl p-5 flex gap-4 items-start mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FED7AA] to-[#FBBF24] flex items-center justify-center text-3xl shrink-0 border-[3px] border-[#F0F4FA]">
                👨
              </div>
              <div>
                <p className="text-[13px] leading-relaxed italic mb-2">&quot;{threatScript.testimonial.quote}&quot;</p>
                <span className="text-[12px] font-extrabold text-[#06559F]">{threatScript.testimonial.author}</span>
                <div className="mt-1">
                  <span className="bg-[#DCFCE7] text-[#166534] px-2 py-0.5 rounded-lg text-[10px] font-extrabold">{threatScript.testimonial.change}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
              <h3 className="text-white text-lg font-black mb-1">¿Quieres lograr resultados así?</h3>
              <p className="text-white/80 text-[12px] mb-4">Llama sin compromiso. Te explicamos cómo funciona.</p>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px] uppercase tracking-wider hover:bg-[#20bd5a] transition-colors">
                📱 Hablar con CAIMED
              </a>
            </div>
          </motion.div>
        </section>
      )}

      <div className="h-8" />

      {/* ═══════ PAGE 3: El programa ═══════ */}
      <section className="max-w-[720px] mx-auto rounded-3xl overflow-hidden shadow-lg"
        style={{ background: 'linear-gradient(135deg, #212B52 0%, #06559F 100%)' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.2 }} className="px-6 py-8 text-white">
          <div className="text-center mb-5">
            <span className="inline-block bg-[#1E8DCE]/30 text-white px-4 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest">
              El programa
            </span>
          </div>

          <h3 className="text-2xl font-black leading-tight mb-2">Un camino diseñado por médicos. Para ti.</h3>
          <p className="text-white/75 text-[13px] mb-5">
            No es un programa genérico. Es <em>tu</em> camino —construido sobre tus 14 componentes de salud cardiovascular y ajustado mes a mes.
          </p>

          {/* Doctor card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4 mb-5 backdrop-blur">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1E8DCE] to-[#06559F] flex items-center justify-center text-4xl shrink-0 border-[3px] border-white/20">
              👨‍⚕️
            </div>
            <div>
              <strong className="text-white text-base block">Equipo CAIMED</strong>
              <div className="text-[#1E8DCE] text-[12px] font-bold mt-0.5">Cardiología Preventiva</div>
              <div className="text-white/70 text-[11px] mt-0.5">20+ años de experiencia · Programa Cardiopreventiva</div>
            </div>
          </div>

          {/* ¿Qué incluye? */}
          <div className="bg-white/5 rounded-2xl p-5 mb-5">
            <h5 className="text-[#1E8DCE] text-sm font-black uppercase tracking-wider mb-3">¿Qué incluye el programa?</h5>
            {[
              { text: 'Evaluación de los 14 componentes de tu salud cardiovascular', badge: 'vs 6 del chequeo' },
              { text: 'Escuela de Pacientes —talleres mensuales para aprender a cuidarte' },
              { text: 'Plan personalizado sobre tus componentes más débiles' },
              { text: 'Score actualizado mensualmente —ves tu progreso real' },
              { text: 'Acompañamiento médico continuo —no estás solo en el camino' },
              { text: 'Visibilidad para tu familia —apoyo real, no presión' },
            ].map((feature, i) => (
              <div key={i} className="flex gap-3 items-start py-3 border-b border-white/[0.08] last:border-b-0">
                <span className="text-[#1E8DCE] font-black text-lg shrink-0">✓</span>
                <span className="text-white/95 text-[13px] leading-snug">
                  <strong className="text-white">{feature.text.split('—')[0]}</strong>
                  {feature.text.includes('—') && <span className="text-white/70">—{feature.text.split('—')[1]}</span>}
                  {feature.badge && <span className="ml-1 bg-[#1E8DCE]/25 text-[#1E8DCE] px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide">{feature.badge}</span>}
                </span>
              </div>
            ))}
          </div>

          {/* ¿Para quién es? */}
          <div className="bg-white/5 rounded-2xl p-5 mb-5">
            <h5 className="text-[#1E8DCE] text-sm font-black uppercase tracking-wider mb-3">¿Para quién es este programa?</h5>
            {[
              { icon: '👤', text: 'Adultos de 50+ años que quieren prevenir antes de tratar' },
              { icon: '💊', text: 'Personas con diabetes, hipertensión o sobrepeso que necesitan un seguimiento serio' },
              { icon: '🫀', text: 'Quienes ya tuvieron un evento cardiovascular y no quieren un segundo' },
              { icon: '👨‍👩‍👧', text: 'Quienes quieren estar bien para los suyos, no solo para sí mismos' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="text-xl w-8 shrink-0">{item.icon}</span>
                <span className="text-white/90 text-[13px]">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { num: '+18', label: 'pts en score promedio' },
              { num: '90', label: 'días al primer cambio' },
              { num: '94%', label: 'adherencia al programa' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#1E8DCE]/15 border border-[#1E8DCE]/30 rounded-2xl py-3 px-2 text-center">
                <div className="text-[26px] font-black text-[#1E8DCE] leading-none">{stat.num}</div>
                <div className="text-[10px] text-white/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Risk reversal */}
          <div className="bg-[#22C55E]/15 border border-[#22C55E]/30 rounded-2xl px-4 py-3 flex items-center gap-3 mb-5">
            <span className="text-2xl">🛡️</span>
            <span className="text-white/95 text-[12px] font-bold">Sin permanencia · Sin sorpresas · Llama sin compromiso</span>
          </div>

          {/* CTA */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 text-center">
            <h3 className="text-white text-lg font-black mb-1">Empieza tu camino hoy</h3>
            <p className="text-white/80 text-[12px] mb-4">Llama sin compromiso. Te explicamos cómo funciona y resolvemos tus dudas.</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px] uppercase tracking-wider hover:bg-[#20bd5a] transition-colors">
                📱 Escribir por WhatsApp
              </a>
              <a href="tel:+573152103063"
                className="inline-flex items-center justify-center gap-1.5 bg-white text-[#06559F] px-5 py-3 rounded-full font-black text-[11px] uppercase tracking-wider hover:bg-blue-50 transition-colors">
                <Phone className="w-3.5 h-3.5" /> Que me llamen
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      <div className="h-8" />

      {/* ═══════ PAGE 4: Familia ═══════ */}
      <section className="max-w-[720px] mx-auto rounded-3xl overflow-hidden shadow-lg bg-white">
        <div className="bg-gradient-to-r from-[#1E8DCE] to-[#06559F] px-6 py-4">
          <h3 className="text-white font-bold text-base">Cuídate por ti. Y por los tuyos.</h3>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }} className="px-6 py-8">
          {/* Family block */}
          <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FED7AA] rounded-2xl p-8 text-center mb-5">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] flex items-center justify-center text-5xl mx-auto mb-4 border-4 border-white">
              👴👶
            </div>
            <h3 className="text-[#92400E] text-xl font-black mb-2">Estar para verlos crecer.</h3>
            <p className="text-[#78350F] text-sm leading-relaxed">
              Tu nieta cumple 10 mañana. Tu hija se casa el otro año. Tu mejor amigo todavía espera ese asado pendiente.
              <br /><br />
              <strong>El motivo eres tú —el premio son ellos.</strong>
            </p>
          </div>

          {/* Share */}
          <div className="bg-[#F0F4FA] rounded-2xl p-6 text-center mb-4">
            <h4 className="text-[#06559F] text-lg font-black mb-1">Comparte tu reporte con tu familia</h4>
            <p className="text-[13px] text-[#6A778F] mb-4 leading-relaxed">
              Que ellos sepan dónde estás hoy. <strong className="text-[#212B52]">Que te acompañen al lugar al que quieres llegar.</strong>
            </p>
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-full font-black text-[11px] uppercase tracking-wider hover:bg-[#20bd5a] transition-colors">
              <Share2 className="w-4 h-4" /> Compartir mi reporte por WhatsApp
            </a>
          </div>

          {/* Invite family */}
          <div className="bg-[#06559F] text-white rounded-2xl p-5 text-center mb-4">
            <p className="text-sm font-bold mb-2">¿Quieres que tu familia conozca su Score?</p>
            <p className="text-[12px] text-white/90 mb-3">Comparte el chequeo gratuito —les toma 3 minutos.</p>
            <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer"
              className="inline-block bg-white text-[#06559F] px-5 py-2.5 rounded-full font-black text-[11px] uppercase tracking-wider hover:bg-blue-50 transition-colors">
              Invitar a mi familia →
            </a>
          </div>

          {/* Account created */}
          {accountCreated && (
            <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 p-5 text-center mb-4">
              <p className="text-sm text-[#212B52]">Ya puedes iniciar sesión para ver tu perfil de salud.</p>
              <a href="/login" className="mt-2 inline-block rounded-lg bg-[#06559F] px-4 py-2 text-sm font-bold text-white hover:bg-[#054A87] transition-colors">
                Iniciar sesión
              </a>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-[11px] text-[#6A778F] italic leading-relaxed mt-4">
            Este reporte corresponde a una evaluación preliminar digital; para confirmar hallazgos y diseñar un plan personalizado se requiere valoración integral en nuestras sedes.
          </p>
        </motion.div>
      </section>

      <div className="h-12" />
    </div>
  )
}

"use client"

import { motion } from "framer-motion"
import { Clock } from "lucide-react"
import dynamic from "next/dynamic"

const Heart3D = dynamic(() => import("../Heart3D"), { ssr: false })

const STAGGER_DELAY = 0.12
const EASE = [0.16, 1, 0.3, 1] as const

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  }
}

export default function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative flex min-h-dvh items-center overflow-hidden bg-gradient-to-br from-[#080e1f] via-[#0f1b35] to-[#162a50]"
    >
      {/* Particles */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {[
          { top: "12%", left: "8%", size: 4, delay: "0s", dur: "5s" },
          { top: "55%", left: "14%", size: 3, delay: "1.2s", dur: "4s" },
          { top: "30%", left: "45%", size: 3, delay: "0.5s", dur: "6s" },
          { top: "75%", left: "70%", size: 4, delay: "2s", dur: "4.5s" },
          { top: "20%", left: "85%", size: 3, delay: "0.8s", dur: "5.5s" },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-blue-400/30"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.dur,
              animation: `float-particle ${p.dur} ease-in-out ${p.delay} infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-6 py-24 md:flex-row md:gap-12 lg:gap-16">
        {/* Left: Copy */}
        <div className="flex-1 text-center md:text-left">
          <motion.p
            {...fadeUp(0)}
            className="mb-4 text-[11px] font-semibold uppercase tracking-[3px] text-blue-400"
          >
            CAIMED CardioPreventiva
          </motion.p>

          <motion.h1
            {...fadeUp(STAGGER_DELAY)}
            className="font-[var(--font-heading)] text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-white"
          >
            En 3 minutos,{" "}
            <br className="hidden sm:block" />
            conoce tu riesgo{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              cardiovascular
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(STAGGER_DELAY * 2)}
            className="mt-6 max-w-lg text-base leading-relaxed text-slate-400 md:text-lg"
          >
            Evaluación de salud gratuita. Sin citas. Sin exámenes de
            laboratorio. Desde tu celular.
          </motion.p>

          <motion.div
            {...fadeUp(STAGGER_DELAY * 3)}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:items-start"
          >
            <a
              href="/chequeo"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-secondary px-7 py-4 text-base font-semibold text-white shadow-lg transition-all hover:shadow-primary/40 hover:-translate-y-0.5 animate-glow-pulse cursor-pointer"
            >
              Hacer mi evaluación gratis →
            </a>
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Clock size={16} />
              Solo toma 3 minutos
            </span>
          </motion.div>
        </div>

        {/* Right: 3D Heart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: EASE }}
          className="relative h-[280px] w-full max-w-[320px] flex-shrink-0 md:h-[380px] md:max-w-[400px]"
        >
          <div className="absolute inset-0 rounded-full bg-blue-500/8 blur-3xl" />
          <Heart3D className="h-full w-full" />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-white/30">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="h-8 w-[1px] bg-gradient-to-b from-white/30 to-transparent" />
        </div>
      </motion.div>
    </section>
  )
}

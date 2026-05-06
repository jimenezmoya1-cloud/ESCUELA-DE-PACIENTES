"use client"

import AnimatedSection, { StaggerContainer, StaggerItem } from "../AnimatedSection"
import AnimatedCounter from "../AnimatedCounter"
import EKGLine from "../EKGLine"

const STATS = [
  { value: 80, suffix: "%", label: "de eventos cardiovasculares\nson prevenibles", color: "text-red-400" },
  { value: 1, prefix: "", suffix: " de 3", label: "colombianos tiene factores\nde riesgo sin diagnosticar", color: "text-red-400" },
  { value: 17, suffix: " años", label: "CAIMED trabajando en\nprevención cardiovascular", color: "text-success" },
]

export default function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f1b35] to-[#1a1a2e] px-6 py-24">
      <div className="pointer-events-none absolute inset-0 flex items-center" aria-hidden="true">
        <EKGLine color="#ef4444" opacity={0.08} />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <AnimatedSection>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[3px] text-red-400">
            El problema que no puedes ignorar
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.1}>
          <h2 className="font-[var(--font-heading)] text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight text-white">
            Las enfermedades cardiovasculares son la{" "}
            <span className="text-red-400">primera causa de muerte</span> en
            Colombia
          </h2>
        </AnimatedSection>

        <StaggerContainer className="mt-12 grid gap-6 sm:grid-cols-3" staggerDelay={0.15}>
          {STATS.map((stat, i) => (
            <StaggerItem key={i}>
              <div className="rounded-2xl border border-red-400/15 bg-white/[0.03] p-8">
                <div className={`text-4xl font-extrabold ${stat.color}`}>
                  <AnimatedCounter
                    target={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-slate-400">
                  {stat.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <AnimatedSection delay={0.5}>
          <p className="mx-auto mt-12 max-w-md text-base text-slate-400">
            La buena noticia:{" "}
            <strong className="text-white">
              conocer tu riesgo es el primer paso para cambiarlo.
            </strong>
          </p>
        </AnimatedSection>
      </div>
    </section>
  )
}

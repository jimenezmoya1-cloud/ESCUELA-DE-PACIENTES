"use client"

import AnimatedSection from "../AnimatedSection"

export default function SolutionSection() {
  return (
    <section className="bg-gradient-to-b from-[#f0f7ff] to-white px-6 py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 md:flex-row">
        <AnimatedSection variant="fadeLeft" className="flex-shrink-0 md:w-[45%]">
          <img
            src="/images/landing/hero_seniors.png"
            alt="Pareja de pacientes en consulta con doctora en Bogotá"
            className="w-full rounded-[20px] shadow-lg"
            loading="lazy"
            width={640}
            height={640}
          />
        </AnimatedSection>

        <AnimatedSection variant="fadeRight" delay={0.2} className="flex-1">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[2px] text-primary">
            La solución
          </p>
          <h2 className="font-[var(--font-heading)] text-[clamp(1.75rem,4vw,3rem)] font-bold leading-tight text-neutral">
            Tu copiloto en salud.
            <br />
            No tu médico de urgencias.
          </h2>
          <p className="mt-6 text-base leading-relaxed text-tertiary">
            CAIMED CardioPreventiva es un programa de medicina preventiva que te
            acompaña continuamente. No esperamos a que te enfermes — te ayudamos
            a que no pase.
          </p>
          <blockquote className="mt-8 rounded-r-xl border-l-[3px] border-primary bg-background px-6 py-5 text-sm italic leading-relaxed text-neutral/80">
            "Al igual que cambias el aceite de tu carro antes de que el motor
            falle, nosotros te ayudamos a cuidar tu corazón antes de que haya
            una emergencia."
          </blockquote>
        </AnimatedSection>
      </div>
    </section>
  )
}

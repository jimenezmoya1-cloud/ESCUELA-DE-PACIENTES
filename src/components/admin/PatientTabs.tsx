"use client"

import { motion } from "framer-motion"
import { GraduationCap, Briefcase, Stethoscope } from "lucide-react"

export type PatientTab = "escuela" | "admin" | "clinico"

const tabs: { id: PatientTab; label: string; icon: typeof GraduationCap }[] = [
  { id: "escuela", label: "Escuela", icon: GraduationCap },
  { id: "admin", label: "Administrativo", icon: Briefcase },
  { id: "clinico", label: "Clínico", icon: Stethoscope },
]

interface Props {
  active: PatientTab
  patientId: string
}

export default function PatientTabs({ active, patientId }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Secciones del paciente"
      className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/40 bg-white/60 p-1.5 shadow-sm ring-1 ring-tertiary/10 backdrop-blur-md"
    >
      {tabs.map((t) => {
        const Icon = t.icon
        const isActive = active === t.id
        return (
          <a
            key={t.id}
            role="tab"
            aria-selected={isActive}
            href={`/admin/pacientes/${patientId}?tab=${t.id}`}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              isActive ? "text-white" : "text-tertiary hover:text-neutral"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="patient-tab-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-md"
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" strokeWidth={2} />
              {t.label}
            </span>
          </a>
        )
      })}
    </nav>
  )
}

"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"

export interface WelcomeAction {
  href: string
  label: string
  description?: string
  icon: ReactNode
  accent?: "primary" | "secondary" | "success" | "warning"
  badge?: string | number
}

interface Props {
  name: string
  roleLabel?: string
  subtitle?: string
  actions: WelcomeAction[]
}

const accentMap: Record<NonNullable<WelcomeAction["accent"]>, { bg: string; ring: string; text: string }> = {
  primary: { bg: "from-primary/15 to-primary/5", ring: "ring-primary/20", text: "text-primary" },
  secondary: { bg: "from-secondary/15 to-secondary/5", ring: "ring-secondary/20", text: "text-secondary" },
  success: { bg: "from-success/15 to-success/5", ring: "ring-success/20", text: "text-success" },
  warning: { bg: "from-warning/15 to-warning/5", ring: "ring-warning/20", text: "text-warning" },
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

export default function WelcomeHub({ name, roleLabel, subtitle, actions }: Props) {
  const reduceMotion = useReducedMotion()
  const greeting = getGreeting()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: reduceMotion ? 0 : 0.05, delayChildren: 0.1 },
    },
  }

  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
  }

  const firstName = name.trim().split(/\s+/)[0]

  return (
    <section className="mb-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-primary p-6 sm:p-8"
      >
        {/* Decorative glass orbs */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          {roleLabel && (
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md ring-1 ring-white/30">
              {roleLabel}
            </span>
          )}
          <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-white/85 sm:text-base">
            {subtitle ?? "¿Qué quieres hacer hoy?"}
          </p>
        </div>
      </motion.div>

      {/* Action grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {actions.map((action) => {
          const accent = accentMap[action.accent ?? "primary"]
          return (
            <motion.div key={action.href} variants={item}>
              <Link
                href={action.href}
                className={`group relative flex h-full items-start gap-4 overflow-hidden rounded-2xl border border-white/40 bg-white/60 p-5 shadow-sm ring-1 ${accent.ring} backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:ring-2`}
              >
                {/* gradient wash */}
                <div
                  aria-hidden
                  className={`absolute inset-0 -z-10 bg-gradient-to-br ${accent.bg} opacity-60 transition-opacity duration-300 group-hover:opacity-100`}
                />

                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 ring-white/60 ${accent.text} transition-transform duration-300 group-hover:scale-110`}
                >
                  {action.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-neutral">{action.label}</p>
                    {action.badge !== undefined && action.badge !== 0 && (
                      <span className={`rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold ${accent.text} ring-1 ring-white/60`}>
                        {action.badge}
                      </span>
                    )}
                  </div>
                  {action.description && (
                    <p className="mt-1 text-sm text-tertiary">{action.description}</p>
                  )}
                </div>

                <span
                  aria-hidden
                  className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-2xl ${accent.text} opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-70 -translate-x-1`}
                >
                  →
                </span>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}

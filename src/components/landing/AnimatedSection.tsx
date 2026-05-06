"use client"

import { motion, type Variants } from "framer-motion"
import { type ReactNode } from "react"

const variants: Record<string, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
}

interface AnimatedSectionProps {
  children: ReactNode
  variant?: keyof typeof variants
  delay?: number
  duration?: number
  className?: string
  as?: "div" | "section"
}

export default function AnimatedSection({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = 0.7,
  className = "",
  as = "div",
}: AnimatedSectionProps) {
  const Component = as === "section" ? motion.section : motion.div

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants[variant]}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Component>
  )
}

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.12,
}: {
  children: ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ staggerChildren: staggerDelay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className = "",
  variant = "fadeUp",
}: {
  children: ReactNode
  className?: string
  variant?: keyof typeof variants
}) {
  return (
    <motion.div
      variants={variants[variant]}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

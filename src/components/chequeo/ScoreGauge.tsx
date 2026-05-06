'use client'

import { motion } from 'framer-motion'

interface ScoreGaugeProps {
  score: number
  nivel: 'Verde' | 'Amarillo' | 'Rojo'
}

const nivelConfig = {
  Verde: { color: '#22C55E', label: 'Verde — Buen camino' },
  Amarillo: { color: '#EAB308', label: 'Amarillo — Hay que mejorar' },
  Rojo: { color: '#EF4444', label: 'Rojo — Necesitas atención' },
}

const RADIUS = 70
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function ScoreGauge({ score, nivel }: ScoreGaugeProps) {
  const { color, label } = nivelConfig[nivel]
  const offset = (1 - score / 100) * CIRCUMFERENCE

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox="0 0 160 160" className="h-44 w-44" aria-label={`Score: ${score}`}>
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={RADIUS}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
        />
        {/* Foreground circle */}
        <motion.circle
          cx="80"
          cy="80"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          transform="rotate(-90 80 80)"
        />
        {/* Score number */}
        <text
          x="80"
          y="80"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-4xl font-semibold"
          fill={color}
        >
          {score}
        </text>
      </svg>

      {/* Nivel badge */}
      <span
        className="inline-block rounded-full px-4 py-1.5 text-sm font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>

      {/* Disclaimer */}
      <p className="max-w-sm text-center text-xs text-[#6A778F]">
        Este es un resultado parcial. Una evaluación completa incluye exámenes de laboratorio y valoración médica.
      </p>
    </div>
  )
}

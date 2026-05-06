'use client'

import { AlertCircle } from 'lucide-react'
import { INSIGHTS_MAP } from '@/lib/chequeo/constants'

interface InsightCardProps {
  componentName: string
  score: number
}

function getColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score > 50) return '#EAB308'
  return '#EF4444'
}

export default function InsightCard({ componentName, score }: InsightCardProps) {
  const insight = INSIGHTS_MAP[componentName]
  if (!insight) return null

  const color = getColor(score)

  return (
    <div
      className="rounded-lg border border-gray-200 p-4"
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 h-5 w-5 shrink-0"
          style={{ color }}
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-[#212B52]">{insight.finding}</p>
          <p className="mt-1 text-sm text-[#6A778F]">{insight.help}</p>
        </div>
      </div>
    </div>
  )
}

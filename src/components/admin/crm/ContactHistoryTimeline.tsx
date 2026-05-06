'use client'

import { Phone, MessageSquare, Mail } from 'lucide-react'
import type { LeadContactEntry } from '@/types/database'

interface ContactHistoryTimelineProps {
  entries: LeadContactEntry[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function TypeIcon({ tipo }: { tipo: string }) {
  const cls = 'h-4 w-4 text-gray-500'
  if (tipo === 'llamada') return <Phone className={cls} />
  if (tipo === 'whatsapp') return <MessageSquare className={cls} />
  return <Mail className={cls} />
}

export default function ContactHistoryTimeline({
  entries,
}: ContactHistoryTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-400">Sin historial de contacto.</p>
    )
  }

  return (
    <div className="relative space-y-0">
      {entries.map((entry, idx) => (
        <div key={idx} className="relative flex gap-3 pb-6 last:pb-0">
          {/* Vertical line */}
          {idx < entries.length - 1 && (
            <div className="absolute left-[11px] top-6 h-full w-px bg-gray-200" />
          )}

          {/* Icon dot */}
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100">
            <TypeIcon tipo={entry.tipo} />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[10px] text-gray-400">
              {formatDate(entry.fecha)}
            </p>
            <p className="text-xs font-medium text-gray-700">
              {entry.resultado}
            </p>
            {entry.nota && (
              <p className="text-xs text-gray-500">{entry.nota}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

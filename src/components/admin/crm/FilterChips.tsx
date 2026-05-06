'use client'

const CHIPS = [
  { key: 'todos', label: 'Todos', color: 'bg-[#F0F4FA] text-[#212B52]' },
  { key: 'urgentes', label: 'Urgentes', color: 'bg-red-50 text-red-700' },
  { key: 'activos', label: 'Activos', color: 'bg-amber-50 text-amber-700' },
  { key: 'seguimiento', label: 'Seguimiento', color: 'bg-violet-50 text-violet-700' },
  { key: 'convertidos', label: 'Convertidos', color: 'bg-emerald-50 text-emerald-700' },
  { key: 'descartados', label: 'Descartados', color: 'bg-gray-100 text-gray-500' },
]

interface FilterChipsProps {
  active: string
  counts: Record<string, number>
  onChange: (key: string) => void
}

export default function FilterChips({
  active,
  counts,
  onChange,
}: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((chip) => {
        const isActive = active === chip.key
        return (
          <button
            key={chip.key}
            onClick={() => onChange(chip.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all ${
              isActive
                ? `${chip.color} shadow-sm ring-2 ring-[#06559F]/15`
                : 'bg-white/60 text-[#6A778F] backdrop-blur-lg hover:bg-white/80'
            }`}
          >
            {chip.label}
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold ${
                isActive ? 'bg-white/60' : 'bg-gray-200/50'
              }`}
            >
              {counts[chip.key] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}

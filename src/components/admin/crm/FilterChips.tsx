'use client'

const CHIPS = [
  { key: 'todos', label: 'Todos', color: 'bg-gray-100 text-gray-700' },
  { key: 'urgentes', label: 'Urgentes', color: 'bg-red-100 text-red-700' },
  { key: 'activos', label: 'Activos', color: 'bg-yellow-100 text-yellow-700' },
  {
    key: 'seguimiento',
    label: 'Seguimiento',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'convertidos',
    label: 'Convertidos',
    color: 'bg-green-100 text-green-700',
  },
  {
    key: 'descartados',
    label: 'Descartados',
    color: 'bg-gray-100 text-gray-500',
  },
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
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? `${chip.color} ring-2 ring-[#06559F]/20`
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {chip.label}
            <span
              className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                isActive ? 'bg-white/60' : 'bg-gray-200/60'
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

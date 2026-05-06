'use client'

import { ChequeoFormData } from '@/lib/chequeo/types'

interface StepProps {
  data: ChequeoFormData
  onChange: (patch: Partial<ChequeoFormData>) => void
}

const MIN_HORAS = 3
const MAX_HORAS = 12

// Color zones: red <6, yellow 6-7, green 7-9, yellow 9-10, red >10
// Expressed as % positions along the 3-12 range
function buildGradient(): string {
  const total = MAX_HORAS - MIN_HORAS // 9
  const pct = (h: number) => (((h - MIN_HORAS) / total) * 100).toFixed(2)

  // breakpoints: 3->6 red, 6->7 yellow, 7->9 green, 9->10 yellow, 10->12 red
  return `linear-gradient(to right,
    #ef4444 0%,
    #ef4444 ${pct(6)}%,
    #eab308 ${pct(6)}%,
    #eab308 ${pct(7)}%,
    #22c55e ${pct(7)}%,
    #22c55e ${pct(9)}%,
    #eab308 ${pct(9)}%,
    #eab308 ${pct(10)}%,
    #ef4444 ${pct(10)}%,
    #ef4444 100%
  )`
}

function getSuenoLabel(horas: number | null): { label: string; color: string } {
  if (horas === null) return { label: '', color: 'text-[#06559F]' }
  if (horas < 6) return { label: 'Poco sueño', color: 'text-red-500' }
  if (horas < 7) return { label: 'Algo bajo', color: 'text-yellow-500' }
  if (horas <= 9) return { label: 'Rango ideal', color: 'text-green-600' }
  if (horas <= 10) return { label: 'Algo alto', color: 'text-yellow-500' }
  return { label: 'Demasiado sueño', color: 'text-red-500' }
}

export default function StepSueno({ data, onChange }: StepProps) {
  const value = data.horasSueno ?? 7
  const { label, color } = getSuenoLabel(data.horasSueno)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#212B52]">Sueño</h2>
        <p className="mt-1 text-sm text-[#6A778F]">
          ¿Cuántas horas duermes por noche en promedio?
        </p>
      </div>

      {/* Prominent value display */}
      <div className="text-center py-2">
        <span className={`text-3xl font-semibold ${color}`}>{value}</span>
        <span className="text-base text-[#6A778F] ml-2">horas</span>
        {label && (
          <p className={`text-sm font-medium mt-1 ${color}`}>{label}</p>
        )}
      </div>

      {/* Color zone bar */}
      <div
        className="h-3 rounded-full w-full"
        style={{ background: buildGradient() }}
        aria-hidden="true"
      />

      {/* Range slider */}
      <input
        type="range"
        min={MIN_HORAS}
        max={MAX_HORAS}
        step={0.5}
        value={value}
        onChange={(e) =>
          onChange({ horasSueno: parseFloat(e.target.value) })
        }
        className="w-full h-2 rounded-full appearance-none bg-gray-200 cursor-pointer accent-[#06559F]"
      />

      {/* Scale labels */}
      <div className="flex justify-between text-xs text-[#6A778F]">
        <span>{MIN_HORAS}h</span>
        <span className="text-green-600 font-medium">7–9h recomendado</span>
        <span>{MAX_HORAS}h</span>
      </div>
    </div>
  )
}

'use client'

import { ChequeoFormData } from '@/lib/chequeo/types'

interface StepProps {
  data: ChequeoFormData
  onChange: (patch: Partial<ChequeoFormData>) => void
}

function getValueColor(minutos: number | null): string {
  if (minutos === null) return 'text-[#06559F]'
  if (minutos < 60) return 'text-red-500'
  if (minutos < 120) return 'text-yellow-500'
  return 'text-green-600'
}

export default function StepActividad({ data, onChange }: StepProps) {
  const value = data.actividadMinutos ?? 0
  const colorClass = getValueColor(data.actividadMinutos)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#212B52]">Actividad física</h2>
        <p className="mt-1 text-sm text-[#6A778F]">
          ¿Cuántos minutos de actividad física haces por semana?
        </p>
      </div>

      {/* Prominent value display */}
      <div className="text-center py-2">
        <span className={`text-3xl font-semibold ${colorClass}`}>{value}</span>
        <span className="text-base text-[#6A778F] ml-2">min/semana</span>
      </div>

      {/* Range slider */}
      <div className="space-y-3">
        <input
          type="range"
          min={0}
          max={300}
          step={10}
          value={value}
          onChange={(e) =>
            onChange({ actividadMinutos: parseInt(e.target.value, 10) })
          }
          className="w-full h-2 rounded-full appearance-none bg-gray-200 cursor-pointer accent-[#06559F]"
        />

        {/* Visual anchors */}
        <div className="flex justify-between text-xs text-[#6A778F]">
          <span>Sedentario (0)</span>
          <span>Activo (150+)</span>
          <span>Muy activo (300+)</span>
        </div>
      </div>

      {/* Helper text */}
      <p className="text-xs text-[#6A778F] text-center">
        Caminar, subir escaleras, bailar — todo cuenta.
      </p>
    </div>
  )
}

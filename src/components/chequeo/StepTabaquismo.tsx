'use client'

import { Cigarette, CigaretteOff } from 'lucide-react'
import { ChequeoFormData } from '@/lib/chequeo/types'
import { OPCIONES_TABAQUISMO } from '@/lib/chequeo/constants'

interface StepProps {
  data: ChequeoFormData
  onChange: (patch: Partial<ChequeoFormData>) => void
}

// Opciones que representan no-fumador o ex-fumador
const NO_SMOKING_VALORES = new Set([1, 2])

export default function StepTabaquismo({ data, onChange }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#212B52]">Tabaquismo</h2>
        <p className="mt-1 text-sm text-[#6A778F]">
          ¿Cuál es tu relación con el cigarrillo?
        </p>
      </div>

      <div className="space-y-2">
        {OPCIONES_TABAQUISMO.map((opcion) => {
          const isSelected = data.fumadorNivel === opcion.valor
          const isNonSmoking = NO_SMOKING_VALORES.has(opcion.valor)
          const Icon = isNonSmoking ? CigaretteOff : Cigarette

          return (
            <button
              key={opcion.valor}
              type="button"
              onClick={() => onChange({ fumadorNivel: opcion.valor })}
              className={`w-full text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[#F0F4FA] border-[#06559F] text-[#212B52]'
                  : 'border-gray-200 text-[#212B52] hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isSelected ? 'text-[#06559F]' : 'text-[#6A778F]'
                  }`}
                />
                <span className="text-sm font-medium">{opcion.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

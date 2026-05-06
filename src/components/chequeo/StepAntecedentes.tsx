'use client'

import { ChequeoFormData } from '@/lib/chequeo/types'
import { CONDICIONES_EXPRESS } from '@/lib/chequeo/constants'

interface StepProps {
  data: ChequeoFormData
  onChange: (patch: Partial<ChequeoFormData>) => void
}

const NINGUNA = 'Ninguna'

export default function StepAntecedentes({ data, onChange }: StepProps) {
  const selected = data.enfermedades
  const otraChecked = selected.includes('Otra')
  const ningunChecked = selected.includes(NINGUNA)

  function toggleCondicion(condicion: string) {
    if (condicion === NINGUNA) {
      // Selecting "Ninguna" clears all others
      onChange({ enfermedades: [NINGUNA], otraEnfermedad: '' })
      return
    }

    let next: string[]
    if (selected.includes(condicion)) {
      next = selected.filter((c) => c !== condicion)
    } else {
      // Selecting any condition clears "Ninguna"
      next = [...selected.filter((c) => c !== NINGUNA), condicion]
    }
    onChange({ enfermedades: next })
  }

  function toggleOtra() {
    if (otraChecked) {
      onChange({
        enfermedades: selected.filter((c) => c !== 'Otra'),
        otraEnfermedad: '',
      })
    } else {
      onChange({
        enfermedades: [...selected.filter((c) => c !== NINGUNA), 'Otra'],
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#212B52]">Antecedentes de salud</h2>
        <p className="mt-1 text-sm text-[#6A778F]">
          Selecciona todas las condiciones que apliquen en tu caso.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONDICIONES_EXPRESS.map((condicion) => {
          const isChecked = selected.includes(condicion)
          return (
            <button
              key={condicion}
              type="button"
              onClick={() => toggleCondicion(condicion)}
              className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                isChecked
                  ? 'bg-[#F0F4FA] border-[#06559F] text-[#212B52]'
                  : 'border-gray-200 text-[#212B52] hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-[#06559F] border-[#06559F]' : 'border-gray-300'
                  }`}
                >
                  {isChecked && (
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{condicion}</span>
              </div>
            </button>
          )
        })}

        {/* Otra */}
        <button
          type="button"
          onClick={toggleOtra}
          className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
            otraChecked
              ? 'bg-[#F0F4FA] border-[#06559F] text-[#212B52]'
              : 'border-gray-200 text-[#212B52] hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                otraChecked ? 'bg-[#06559F] border-[#06559F]' : 'border-gray-300'
              }`}
            >
              {otraChecked && (
                <svg
                  className="h-2.5 w-2.5 text-white"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">Otra</span>
          </div>
        </button>

        {/* Ninguna */}
        <button
          type="button"
          onClick={() => toggleCondicion(NINGUNA)}
          className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
            ningunChecked
              ? 'bg-[#F0F4FA] border-[#06559F] text-[#212B52]'
              : 'border-gray-200 text-[#212B52] hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                ningunChecked ? 'bg-[#06559F] border-[#06559F]' : 'border-gray-300'
              }`}
            >
              {ningunChecked && (
                <svg
                  className="h-2.5 w-2.5 text-white"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="1.5,5 4,7.5 8.5,2.5" />
                </svg>
              )}
            </div>
            <span className="text-sm font-medium">Ninguna</span>
          </div>
        </button>
      </div>

      {otraChecked && (
        <div>
          <label htmlFor="otra-enfermedad" className="block text-sm font-medium text-[#212B52] mb-1">
            Describe tu condicion
          </label>
          <input
            id="otra-enfermedad"
            type="text"
            placeholder="Escribe tu condicion aqui"
            value={data.otraEnfermedad}
            onChange={(e) => onChange({ otraEnfermedad: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#212B52] placeholder-gray-400 focus:ring-2 focus:ring-[#1E8DCE]/30 focus:border-[#1E8DCE] focus:outline-none transition-colors"
          />
        </div>
      )}
    </div>
  )
}

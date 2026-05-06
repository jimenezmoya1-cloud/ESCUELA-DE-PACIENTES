'use client'

import { ChequeoFormData } from '@/lib/chequeo/types'
import { OPCIONES_ACCESO } from '@/lib/chequeo/constants'

interface StepProps {
  data: ChequeoFormData
  onChange: (patch: Partial<ChequeoFormData>) => void
}

export default function StepMedicamentos({ data, onChange }: StepProps) {
  function handleTomaMedicamentos(value: boolean) {
    if (!value) {
      onChange({
        tomaMedicamentos: false,
        medicamentosTexto: '',
        accesoMedicamentos: null,
      })
    } else {
      onChange({ tomaMedicamentos: true })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#212B52]">Medicamentos</h2>
        <p className="mt-1 text-sm text-[#6A778F]">
          Cuéntanos sobre los medicamentos que tomas actualmente.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#212B52] mb-3">
          ¿Tomas medicamentos actualmente?
        </p>
        <div className="flex gap-3">
          {[
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ].map(({ label, value }) => {
            const isSelected = data.tomaMedicamentos === value
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleTomaMedicamentos(value)}
                className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#F0F4FA] border-[#06559F] text-[#06559F]'
                    : 'border-gray-200 text-[#6A778F] hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {data.tomaMedicamentos === true && (
        <div className="space-y-6">
          <div>
            <label htmlFor="medicamentos-texto" className="block text-sm font-medium text-[#212B52] mb-1">
              ¿Cuáles medicamentos tomas? (opcional)
            </label>
            <textarea
              id="medicamentos-texto"
              rows={3}
              placeholder="Ej. Metformina, Losartán, Atorvastatina..."
              value={data.medicamentosTexto}
              onChange={(e) => onChange({ medicamentosTexto: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#212B52] placeholder-gray-400 focus:ring-2 focus:ring-[#1E8DCE]/30 focus:border-[#1E8DCE] focus:outline-none transition-colors resize-none"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-[#212B52] mb-3">
              ¿Has tenido problemas para conseguir tus medicamentos?
            </p>
            <div className="space-y-2">
              {OPCIONES_ACCESO.map((opcion) => {
                const isSelected = data.accesoMedicamentos === opcion.valor
                return (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => onChange({ accesoMedicamentos: opcion.valor })}
                    className={`w-full text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0F4FA] border-[#06559F] text-[#212B52]'
                        : 'border-gray-200 text-[#212B52] hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#06559F]' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-[#06559F]" />
                        )}
                      </div>
                      <span className="text-sm">{opcion.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

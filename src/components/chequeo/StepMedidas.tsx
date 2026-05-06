'use client'

import { ChequeoFormData } from '@/lib/chequeo/types'

interface StepProps {
  data: ChequeoFormData
  onChange: (patch: Partial<ChequeoFormData>) => void
}

function calcularIMC(pesoKg: string, tallaCm: string): number | null {
  const peso = parseFloat(pesoKg)
  const talla = parseFloat(tallaCm)
  if (!peso || !talla || peso <= 0 || talla <= 0) return null
  return peso / Math.pow(talla / 100, 2)
}

function clasificarIMC(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Bajo peso', color: 'text-blue-600' }
  if (imc < 25) return { label: 'Peso normal', color: 'text-green-600' }
  if (imc < 30) return { label: 'Sobrepeso', color: 'text-yellow-600' }
  return { label: 'Obesidad', color: 'text-red-600' }
}

export default function StepMedidas({ data, onChange }: StepProps) {
  const imc = calcularIMC(data.pesoKg, data.tallaCm)
  const clasificacion = imc ? clasificarIMC(imc) : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#212B52]">Medidas básicas</h2>
        <p className="mt-1 text-sm text-[#6A778F]">
          Necesitamos estos datos para calcular tu índice de masa corporal.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="peso" className="block text-sm font-medium text-[#212B52] mb-1">
            Peso (kg)
          </label>
          <input
            id="peso"
            type="number"
            inputMode="decimal"
            min="20"
            max="300"
            placeholder="Ej. 72"
            value={data.pesoKg}
            onChange={(e) => onChange({ pesoKg: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#212B52] placeholder-gray-400 focus:ring-2 focus:ring-[#1E8DCE]/30 focus:border-[#1E8DCE] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="talla" className="block text-sm font-medium text-[#212B52] mb-1">
            Talla (cm)
          </label>
          <input
            id="talla"
            type="number"
            inputMode="decimal"
            min="100"
            max="250"
            placeholder="Ej. 165"
            value={data.tallaCm}
            onChange={(e) => onChange({ tallaCm: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-[#212B52] placeholder-gray-400 focus:ring-2 focus:ring-[#1E8DCE]/30 focus:border-[#1E8DCE] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {imc && clasificacion && (
        <div className="rounded-lg bg-[#F0F4FA] p-3 text-center">
          <p className="text-sm text-[#6A778F]">Tu IMC</p>
          <p className={`text-2xl font-semibold mt-0.5 ${clasificacion.color}`}>
            {imc.toFixed(1)}
          </p>
          <p className={`text-sm font-medium mt-0.5 ${clasificacion.color}`}>
            {clasificacion.label}
          </p>
        </div>
      )}
    </div>
  )
}

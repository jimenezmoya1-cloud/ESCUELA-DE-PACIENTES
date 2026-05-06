'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { ChequeoFormData } from '@/lib/chequeo/types'
import { CHEQUEO_STEPS } from '@/lib/chequeo/constants'

import ProgressBar from '@/components/chequeo/ProgressBar'
import StepCard from '@/components/chequeo/StepCard'
import StepMedidas from '@/components/chequeo/StepMedidas'
import StepAntecedentes from '@/components/chequeo/StepAntecedentes'
import StepMedicamentos from '@/components/chequeo/StepMedicamentos'
import StepTabaquismo from '@/components/chequeo/StepTabaquismo'
import StepActividad from '@/components/chequeo/StepActividad'
import StepSueno from '@/components/chequeo/StepSueno'

const INITIAL_FORM_DATA: ChequeoFormData = {
  pesoKg: '',
  tallaCm: '',
  enfermedades: [],
  otraEnfermedad: '',
  tomaMedicamentos: null,
  medicamentosTexto: '',
  accesoMedicamentos: null,
  fumadorNivel: null,
  actividadMinutos: null,
  horasSueno: null,
}

function isStepValid(step: number, data: ChequeoFormData): boolean {
  switch (step) {
    case 0: {
      const peso = parseFloat(data.pesoKg)
      const talla = parseFloat(data.tallaCm)
      return (
        data.pesoKg !== '' &&
        data.tallaCm !== '' &&
        !isNaN(peso) &&
        !isNaN(talla) &&
        peso > 0 &&
        talla > 0
      )
    }
    case 1:
      return data.enfermedades.length > 0
    case 2:
      if (data.tomaMedicamentos === null) return false
      if (data.tomaMedicamentos === true) {
        return data.accesoMedicamentos !== null
      }
      return true
    case 3:
      return data.fumadorNivel !== null
    case 4:
      return data.actividadMinutos !== null
    case 5:
      return data.horasSueno !== null
    default:
      return false
  }
}

export default function CuestionarioPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<ChequeoFormData>(INITIAL_FORM_DATA)
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  function handleChange(patch: Partial<ChequeoFormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  function handleNext() {
    if (!isStepValid(currentStep, formData)) return

    if (currentStep === 5) {
      // Final step: serialize and navigate to results
      const encoded = btoa(JSON.stringify(formData))
      router.push(`/chequeo/resultado?data=${encoded}`)
      return
    }

    setDirection('forward')
    setCurrentStep((prev) => prev + 1)
  }

  function handleBack() {
    if (currentStep === 0) return
    setDirection('back')
    setCurrentStep((prev) => prev - 1)
  }

  const stepIsValid = isStepValid(currentStep, formData)
  const isLastStep = currentStep === 5

  const stepProps = { data: formData, onChange: handleChange }

  return (
    <main className="min-h-dvh px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-xl space-y-4">
        {/* Progress bar */}
        <ProgressBar currentStep={currentStep} />

        {/* Step label */}
        <p className="text-xs font-medium text-[#6A778F] uppercase tracking-wide text-center">
          Paso {currentStep + 1} de {CHEQUEO_STEPS.length} — {CHEQUEO_STEPS[currentStep]}
        </p>

        {/* Animated step card */}
        <StepCard stepKey={currentStep} direction={direction}>
          {currentStep === 0 && <StepMedidas {...stepProps} />}
          {currentStep === 1 && <StepAntecedentes {...stepProps} />}
          {currentStep === 2 && <StepMedicamentos {...stepProps} />}
          {currentStep === 3 && <StepTabaquismo {...stepProps} />}
          {currentStep === 4 && <StepActividad {...stepProps} />}
          {currentStep === 5 && <StepSueno {...stepProps} />}
        </StepCard>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-[#6A778F] hover:text-[#212B52] transition-colors"
              >
                Atras
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            disabled={!stepIsValid}
            className={`bg-[#06559F] text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
              stepIsValid
                ? 'hover:bg-[#054A87]'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isLastStep ? 'Ver mi resultado' : 'Siguiente'}
          </button>
        </div>
      </div>
    </main>
  )
}

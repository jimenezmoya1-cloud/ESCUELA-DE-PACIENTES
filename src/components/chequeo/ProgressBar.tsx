'use client'

import { CHEQUEO_STEPS } from '@/lib/chequeo/constants'

interface ProgressBarProps {
  currentStep: number
}

export default function ProgressBar({ currentStep }: ProgressBarProps) {
  return (
    <div className="flex gap-1.5 w-full">
      {CHEQUEO_STEPS.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
            i <= currentStep ? 'bg-[#06559F]' : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

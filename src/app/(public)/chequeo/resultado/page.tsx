import { Suspense } from 'react'
import ResultadoContent from './ResultadoContent'

export default function ResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <p className="text-sm text-[#6A778F]">Cargando...</p>
        </div>
      }
    >
      <ResultadoContent />
    </Suspense>
  )
}

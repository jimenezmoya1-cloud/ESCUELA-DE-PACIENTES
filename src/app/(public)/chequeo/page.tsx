import Link from 'next/link'
import { Clock, ShieldCheck, Heart } from 'lucide-react'

export default function ChequeoPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-4 py-16">
      {/* Hero section */}
      <div className="w-full max-w-2xl">
        <div className="backdrop-blur-sm bg-white/80 border border-white/20 rounded-2xl shadow-lg p-8 flex flex-col items-center">
          {/* Heart illustration */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className="h-20 w-20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M50 85 C50 85 10 58 10 33 C10 20 20 12 32 12 C40 12 47 17 50 22 C53 17 60 12 68 12 C80 12 90 20 90 33 C90 58 50 85 50 85Z"
              stroke="#06559F"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="22,45 34,32 42,52 52,28 62,45 70,38 78,45"
              stroke="#06559F"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#212B52] text-center mt-6">
            Tu corazón te está hablando. ¿Lo estás escuchando?
          </h1>

          {/* Subhead */}
          <p className="text-base text-[#6A778F] text-center mt-3">
            Descubre en 3 minutos qué tan bien estás cuidando tu salud cardiovascular. Gratis. Sin compromiso.
          </p>

          {/* CTA */}
          <Link
            href="/chequeo/cuestionario"
            className="mx-auto block mt-6 bg-[#06559F] text-white rounded-lg px-8 py-3 text-lg font-semibold hover:bg-[#054A87] transition-colors text-center"
          >
            Quiero saber
          </Link>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="mt-12 flex flex-col sm:flex-row gap-6 sm:gap-10 items-center justify-center">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-[#1E8DCE] shrink-0" />
          <span className="text-sm text-[#6A778F]">Solo 3 minutos</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#1E8DCE] shrink-0" />
          <span className="text-sm text-[#6A778F]">Tus datos están protegidos</span>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-[#1E8DCE] shrink-0" />
          <span className="text-sm text-[#6A778F]">Diseñado por médicos</span>
        </div>
      </div>
    </main>
  )
}

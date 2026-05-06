import Link from 'next/link'
import { Clock, ShieldCheck, Heart } from 'lucide-react'

export default function ChequeoPage() {
  return (
    <main className="min-h-dvh flex flex-col bg-gradient-to-b from-[#F0F4FA] via-white to-[#F0F4FA]">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-lg flex flex-col items-center">
          {/* Heart + ECG illustration */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            className="h-28 w-28 sm:h-36 sm:w-36 drop-shadow-lg"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="heart-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#06559F" />
                <stop offset="100%" stopColor="#1E8DCE" />
              </linearGradient>
            </defs>
            <path
              d="M50 85 C50 85 10 58 10 33 C10 20 20 12 32 12 C40 12 47 17 50 22 C53 17 60 12 68 12 C80 12 90 20 90 33 C90 58 50 85 50 85Z"
              stroke="url(#heart-grad)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="22,45 34,32 42,52 52,28 62,45 70,38 78,45"
              stroke="url(#heart-grad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#212B52] text-center mt-8 leading-tight tracking-tight">
            Tu corazón te está hablando.
            <br />
            <span className="text-[#06559F]">¿Lo estás escuchando?</span>
          </h1>

          {/* Subhead */}
          <p className="text-lg sm:text-xl text-[#6A778F] text-center mt-5 max-w-md leading-relaxed">
            Descubre en 3 minutos qué tan bien estás cuidando tu salud cardiovascular.
            <span className="font-semibold text-[#212B52]"> Gratis. Sin compromiso.</span>
          </p>

          {/* CTA */}
          <Link
            href="/chequeo/cuestionario"
            className="mt-8 bg-[#06559F] text-white rounded-xl px-10 py-4 text-lg sm:text-xl font-bold hover:bg-[#054A87] transition-all hover:shadow-lg hover:shadow-[#06559F]/20 text-center"
          >
            Quiero saber
          </Link>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="pb-12 flex flex-col sm:flex-row gap-6 sm:gap-12 items-center justify-center">
        <div className="flex items-center gap-2.5">
          <Clock className="h-6 w-6 text-[#1E8DCE] shrink-0" />
          <span className="text-sm font-medium text-[#6A778F]">Solo 3 minutos</span>
        </div>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-[#1E8DCE] shrink-0" />
          <span className="text-sm font-medium text-[#6A778F]">Tus datos están protegidos</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Heart className="h-6 w-6 text-[#1E8DCE] shrink-0" />
          <span className="text-sm font-medium text-[#6A778F]">Diseñado por médicos</span>
        </div>
      </div>
    </main>
  )
}

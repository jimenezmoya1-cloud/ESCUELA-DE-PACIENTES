"use client"

import { DISCOUNT_THRESHOLDS, getProgressPercent } from "@/lib/rewards"

export default function DiscountMeter({
  totalPoints,
  discountTier,
}: {
  totalPoints: number
  discountTier: 'none' | '25' | '30'
}) {
  const progress = getProgressPercent(totalPoints)
  const pointsNeeded = Math.max(0, DISCOUNT_THRESHOLDS.TIER_25 - totalPoints)

  return (
    <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral">Descuento en CAIMED</h3>
        {discountTier !== 'none' && (
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${
            discountTier === '30'
              ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
              : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
          }`}>
            {discountTier}% OFF
          </span>
        )}
      </div>

      {/* Barra de progreso principal */}
      <div className="relative mb-3">
        <div className="h-4 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              discountTier === '30'
                ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500'
                : discountTier === '25'
                  ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                  : 'bg-gradient-to-r from-secondary to-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Marcador del 25% */}
        <div className="absolute top-0 h-4" style={{ left: '100%', transform: 'translateX(-100%)' }}>
          <div className="h-full w-0.5 bg-emerald-400" />
        </div>
      </div>

      {/* Indicadores de nivel */}
      <div className="mb-4 flex justify-between text-xs">
        <span className="text-tertiary">0</span>
        <span className={`font-semibold ${progress >= 100 ? 'text-emerald-600' : 'text-tertiary'}`}>
          {DISCOUNT_THRESHOLDS.TIER_25} pts = 25%
        </span>
      </div>

      {/* Estado actual */}
      {discountTier === '30' ? (
        <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
              <svg className="h-6 w-6 text-white" viewBox="0 0 48 48" fill="none">
                <path d="M14 6h20v14a10 10 0 01-20 0V6z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 10H8a4 4 0 000 8h2M34 10h6a4 4 0 010 8h-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M24 30v6M16 40h16M18 36h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-violet-800">30% de descuento desbloqueado</p>
              <p className="text-sm text-violet-600">En su próximo chequeo en CAIMED Cardiopreventiva</p>
            </div>
          </div>
        </div>
      ) : discountTier === '25' ? (
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-emerald-800">25% de descuento desbloqueado</p>
              <p className="text-sm text-emerald-600">Complete todo el programa para obtener el 30%</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
              <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral">
                Faltan <span className="text-secondary">{pointsNeeded} puntos</span> para el 25% de descuento
              </p>
              <p className="text-xs text-tertiary">Siga completando módulos, quizzes y tareas</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

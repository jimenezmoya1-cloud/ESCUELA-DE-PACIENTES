"use client"

import type { Achievement, AchievementTier } from "@/types/database"
import { TIER_COLORS } from "@/lib/rewards"
import { RewardIcon } from "./RewardIcons"

export default function AchievementBadge({
  achievement,
  unlocked,
  unlockedAt,
  size = "md",
  showDetails = true,
  animate = false,
}: {
  achievement: Achievement
  unlocked: boolean
  unlockedAt?: string
  size?: "sm" | "md" | "lg"
  showDetails?: boolean
  animate?: boolean
}) {
  const colors = TIER_COLORS[achievement.tier]
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
  }
  const iconSizes = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${animate ? 'animate-bounce-in' : ''}`}>
      {/* Badge circular */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} flex items-center justify-center rounded-full border-2 transition-all duration-500 ${
            unlocked
              ? `${colors.bg} ${colors.border} ${colors.text} shadow-lg ${colors.glow}`
              : "border-gray-200 bg-gray-100 text-gray-300"
          }`}
        >
          {unlocked ? (
            <RewardIcon name={achievement.icon} className={iconSizes[size]} />
          ) : (
            <svg className={iconSizes[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          )}
        </div>

        {/* Indicador de tier */}
        {unlocked && (
          <TierIndicator tier={achievement.tier} size={size} />
        )}

        {/* Puntos */}
        {unlocked && size !== "sm" && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-yellow-600 shadow-sm">
            +{achievement.points}
          </div>
        )}
      </div>

      {/* Detalles */}
      {showDetails && (
        <div className="text-center">
          <p className={`font-semibold leading-tight ${unlocked ? 'text-neutral' : 'text-gray-400'} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {achievement.title}
          </p>
          {size !== "sm" && (
            <p className={`mt-0.5 text-xs ${unlocked ? 'text-tertiary' : 'text-gray-300'}`}>
              {unlocked && unlockedAt
                ? new Date(unlockedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                : achievement.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TierIndicator({ tier, size }: { tier: AchievementTier; size: string }) {
  const dotSize = size === "lg" ? "h-4 w-4" : "h-3 w-3"
  const position = size === "lg" ? "-top-1 -right-1" : "-top-0.5 -right-0.5"

  const tierGradients: Record<AchievementTier, string> = {
    bronze: "from-amber-400 to-amber-600",
    silver: "from-slate-300 to-slate-500",
    gold: "from-yellow-300 to-yellow-500",
    platinum: "from-cyan-300 to-cyan-500",
    diamond: "from-violet-400 to-violet-600",
  }

  return (
    <div className={`absolute ${position} ${dotSize} rounded-full bg-gradient-to-br ${tierGradients[tier]} ring-2 ring-white`} />
  )
}

// Componente para mostrar nuevo logro desbloqueado (modal/toast)
export function AchievementUnlockToast({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  const colors = TIER_COLORS[achievement.tier]

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm animate-scale-in rounded-2xl bg-white p-8 text-center shadow-2xl">
        {/* Glow de fondo */}
        <div className={`mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full ${colors.bg} ${colors.border} border-2 shadow-xl ${colors.glow}`}>
          <div className={colors.text}>
            <RewardIcon name={achievement.icon} className="h-14 w-14" />
          </div>
        </div>

        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-secondary">
          Logro desbloqueado
        </p>
        <h3 className="mb-2 text-xl font-bold text-neutral">{achievement.title}</h3>
        <p className="mb-4 text-sm text-tertiary">{achievement.description}</p>

        <div className="mb-6 inline-flex items-center gap-1 rounded-full bg-yellow-50 px-4 py-1.5">
          <span className="text-lg font-bold text-yellow-600">+{achievement.points}</span>
          <span className="text-sm text-yellow-600">puntos</span>
        </div>

        <button
          onClick={onClose}
          className="block w-full rounded-xl bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-primary/90"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

"use client"

import { useState } from "react"
import type { Achievement, UserAchievement, PointsLog } from "@/types/database"
import { CATEGORY_LABELS, TIER_LABELS } from "@/lib/rewards"
import PointsDisplay from "@/components/rewards/PointsDisplay"
import DiscountMeter from "@/components/rewards/DiscountMeter"
import AchievementBadge from "@/components/rewards/AchievementBadge"

type CategoryFilter = 'all' | 'modules' | 'quizzes' | 'tasks' | 'streaks' | 'special'

export default function RewardsPageClient({
  totalPoints,
  currentStreak,
  modulesCompleted,
  totalModules,
  quizzesCompleted,
  quizzesPerfect,
  tasksSubmitted,
  discountTier,
  allAchievements,
  userAchievements,
  pointsLog,
}: {
  totalPoints: number
  currentStreak: number
  modulesCompleted: number
  totalModules: number
  quizzesCompleted: number
  quizzesPerfect: number
  tasksSubmitted: number
  discountTier: 'none' | '25' | '30'
  allAchievements: Achievement[]
  userAchievements: UserAchievement[]
  pointsLog: PointsLog[]
}) {
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id))
  const unlockedMap = new Map(userAchievements.map(ua => [ua.achievement_id, ua]))

  const filteredAchievements = allAchievements.filter(
    a => filter === 'all' || a.category === filter
  )

  const unlockedCount = userAchievements.length
  const totalCount = allAchievements.length

  const categories: CategoryFilter[] = ['all', 'modules', 'quizzes', 'tasks', 'streaks', 'special']
  const categoryLabels: Record<CategoryFilter, string> = {
    all: 'Todos',
    ...CATEGORY_LABELS,
  } as Record<CategoryFilter, string>

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-neutral">Recompensas</h1>
        <p className="text-sm text-tertiary">
          {unlockedCount} de {totalCount} logros desbloqueados
        </p>
      </div>

      {/* Stats cards */}
      <PointsDisplay
        totalPoints={totalPoints}
        currentStreak={currentStreak}
        modulesCompleted={modulesCompleted}
        totalModules={totalModules}
      />

      {/* Descuento */}
      <DiscountMeter totalPoints={totalPoints} discountTier={discountTier} />

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              filter === cat
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-tertiary hover:bg-gray-50'
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Grid de logros */}
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        {filteredAchievements.map(achievement => {
          const isUnlocked = unlockedIds.has(achievement.id)
          const ua = unlockedMap.get(achievement.id)
          return (
            <AchievementBadge
              key={achievement.id}
              achievement={achievement}
              unlocked={isUnlocked}
              unlockedAt={ua?.unlocked_at}
              size="md"
              showDetails
            />
          )
        })}
      </div>

      {/* Historial de puntos */}
      {pointsLog.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-neutral">Historial de puntos</h3>
          <div className="space-y-3">
            {pointsLog.map(entry => (
              <div key={entry.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    entry.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {entry.points > 0 ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral">{getReasonLabel(entry.reason)}</p>
                    <p className="text-xs text-tertiary">
                      {new Date(entry.created_at).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${entry.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {entry.points > 0 ? '+' : ''}{entry.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leyenda de tiers */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-tertiary">Niveles de logros</h3>
        <div className="flex flex-wrap gap-3">
          {(['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const).map(tier => {
            const colors: Record<string, string> = {
              bronze: 'bg-amber-100 text-amber-700 border-amber-300',
              silver: 'bg-slate-100 text-slate-600 border-slate-300',
              gold: 'bg-yellow-50 text-yellow-700 border-yellow-400',
              platinum: 'bg-cyan-50 text-cyan-700 border-cyan-400',
              diamond: 'bg-violet-50 text-violet-700 border-violet-400',
            }
            return (
              <span key={tier} className={`rounded-full border px-3 py-1 text-xs font-semibold ${colors[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    module_complete: 'Módulo completado',
    quiz_complete: 'Quiz completado',
    quiz_perfect: 'Quiz perfecto',
    task_submit: 'Tarea enviada',
    streak_bonus: 'Bonus de racha',
    achievement_unlock: 'Logro desbloqueado',
  }
  return labels[reason] ?? reason
}

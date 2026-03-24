import type { Achievement, UserAchievement, AchievementTier } from "@/types/database"

// Puntos por acción
export const POINTS = {
  MODULE_COMPLETE: 100,
  QUIZ_COMPLETE: 50,
  QUIZ_PERFECT: 100,
  TASK_SUBMIT: 75,
  STREAK_BONUS_3: 50,
  STREAK_BONUS_7: 100,
} as const

// Umbrales de descuento
export const DISCOUNT_THRESHOLDS = {
  TIER_25: 1500,  // 25% de descuento
  TIER_30: 'all_complete', // 30% requiere completar TODO
} as const

export function getDiscountTier(
  totalPoints: number,
  allComplete: boolean
): 'none' | '25' | '30' {
  if (allComplete) return '30'
  if (totalPoints >= DISCOUNT_THRESHOLDS.TIER_25) return '25'
  return 'none'
}

export function getPointsToNextDiscount(totalPoints: number): number {
  if (totalPoints >= DISCOUNT_THRESHOLDS.TIER_25) return 0
  return DISCOUNT_THRESHOLDS.TIER_25 - totalPoints
}

export function getProgressPercent(totalPoints: number): number {
  return Math.min(100, Math.round((totalPoints / DISCOUNT_THRESHOLDS.TIER_25) * 100))
}

// Colores por tier
export const TIER_COLORS: Record<AchievementTier, { bg: string; border: string; text: string; glow: string }> = {
  bronze: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', glow: 'shadow-amber-200' },
  silver: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', glow: 'shadow-slate-200' },
  gold: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', glow: 'shadow-yellow-200' },
  platinum: { bg: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-700', glow: 'shadow-cyan-200' },
  diamond: { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', glow: 'shadow-violet-200' },
}

export const TIER_LABELS: Record<AchievementTier, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
  platinum: 'Platino',
  diamond: 'Diamante',
}

export const CATEGORY_LABELS: Record<string, string> = {
  modules: 'Módulos',
  quizzes: 'Evaluaciones',
  tasks: 'Tareas',
  streaks: 'Rachas',
  special: 'Especiales',
}

export function isUnlocked(
  achievement: Achievement,
  unlockedIds: Set<string>
): boolean {
  return unlockedIds.has(achievement.id)
}

export function getNewlyUnlockedAchievements(
  allAchievements: Achievement[],
  previouslyUnlocked: UserAchievement[],
  stats: {
    modulesCompleted: number
    quizzesCompleted: number
    quizzesPerfect: number
    tasksSubmitted: number
    streakDays: number
    allComplete: boolean
    speedComplete: boolean
  }
): Achievement[] {
  const unlockedIds = new Set(previouslyUnlocked.map(ua => ua.achievement_id))
  const newlyUnlocked: Achievement[] = []

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue

    let shouldUnlock = false
    switch (achievement.requirement_type) {
      case 'modules_completed':
        shouldUnlock = stats.modulesCompleted >= achievement.requirement_value
        break
      case 'quizzes_completed':
        shouldUnlock = stats.quizzesCompleted >= achievement.requirement_value
        break
      case 'quizzes_perfect':
        shouldUnlock = stats.quizzesPerfect >= achievement.requirement_value
        break
      case 'tasks_submitted':
        shouldUnlock = stats.tasksSubmitted >= achievement.requirement_value
        break
      case 'streak_days':
        shouldUnlock = stats.streakDays >= achievement.requirement_value
        break
      case 'speed_complete':
        shouldUnlock = stats.speedComplete
        break
      case 'all_complete':
        shouldUnlock = stats.allComplete
        break
    }

    if (shouldUnlock) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

import type { Achievement } from "@/types/database"

export function nextStreakMilestone(currentStreak: number): number | null {
  const milestones = [1, 3, 7, 10, 15, 20, 30, 60]
  return milestones.find((m) => m > currentStreak) ?? null
}

export function groupAchievementsByCategory(achievements: Achievement[]): Record<string, Achievement[]> {
  const result: Record<string, Achievement[]> = { module: [], special: [], streak: [] }
  for (const a of achievements) {
    if (!result[a.category]) result[a.category] = []
    result[a.category].push(a)
  }
  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.sort_order - b.sort_order)
  }
  return result
}

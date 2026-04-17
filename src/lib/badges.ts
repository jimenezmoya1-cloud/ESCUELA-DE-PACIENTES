import type { AchievementCategory } from "@/types/database"

export const CATEGORY_STYLES: Record<AchievementCategory, {
  gradient: string
  label: string
  iconColor: string
}> = {
  module:  { gradient: "from-[#06559F] to-[#1E8DCE]", label: "Módulos",    iconColor: "text-white" },
  special: { gradient: "from-amber-500 to-amber-700", label: "Especiales", iconColor: "text-white" },
  streak:  { gradient: "from-orange-400 to-red-600",  label: "Rachas",     iconColor: "text-white" },
}

export const CATEGORY_ORDER: AchievementCategory[] = ["module", "special", "streak"]

export const BADGE_ICON_NAMES = [
  "Compass", "Flame", "Sparkles", "Users", "Pill", "HeartHandshake",
  "Activity", "Apple", "Brain", "Moon", "Heart", "Droplet",
  "CircleDashed", "CigaretteOff", "Scale", "GraduationCap",
  "Handshake", "Leaf", "Sprout", "TreePalm", "Siren",
] as const

export type BadgeIconName = typeof BADGE_ICON_NAMES[number]

export function nextStreakMilestone(currentStreak: number): number | null {
  const milestones = [1, 3, 7, 10, 15, 20, 30, 60]
  return milestones.find((m) => m > currentStreak) ?? null
}

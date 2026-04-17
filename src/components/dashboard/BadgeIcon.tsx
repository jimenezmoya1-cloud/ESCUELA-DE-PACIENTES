"use client"

import * as LucideIcons from "lucide-react"
import { CATEGORY_STYLES } from "@/lib/badges"
import type { AchievementCategory } from "@/types/database"

interface BadgeIconProps {
  icon: string
  category: AchievementCategory
  unlocked: boolean
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-32 w-32",
}

const ICON_SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
}

export function BadgeIcon({ icon, category, unlocked, size = "md" }: BadgeIconProps) {
  const styles = CATEGORY_STYLES[category]
  const IconComp = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[icon]
    ?? LucideIcons.HelpCircle

  if (!unlocked) {
    return (
      <div className={`${SIZE_CLASSES[size]} relative flex items-center justify-center rounded-full bg-slate-200 border-4 border-slate-300 shadow-inner`}>
        <LucideIcons.Lock className={`${ICON_SIZE_CLASSES[size]} text-slate-400`} />
      </div>
    )
  }

  return (
    <div className={`${SIZE_CLASSES[size]} relative flex items-center justify-center rounded-full bg-gradient-to-br ${styles.gradient} shadow-lg border-4 border-white`}>
      <IconComp className={`${ICON_SIZE_CLASSES[size]} ${styles.iconColor}`} strokeWidth={2.2} />
    </div>
  )
}

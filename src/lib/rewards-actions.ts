"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Achievement } from "@/types/database"

export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createAdminClient()

  const { data: allAchievements } = await supabase.from("achievements").select("*")
  if (!allAchievements) return []

  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)

  const unlockedIds = new Set((userAchievements ?? []).map((ua) => ua.achievement_id))

  const { data: completions } = await supabase
    .from("module_completions")
    .select("module_id")
    .eq("user_id", userId)

  const completedModuleIds = new Set((completions ?? []).map((c) => c.module_id))
  const modulesCompleted = completedModuleIds.size

  const completedModulesResult = completedModuleIds.size > 0
    ? await supabase
        .from("modules")
        .select("id, component_key")
        .in("id", Array.from(completedModuleIds))
    : { data: [] as Array<{ id: string; component_key: string | null }> }

  const completedComponentKeys = new Set(
    (completedModulesResult.data ?? [])
      .map((m) => m.component_key)
      .filter((k): k is string => !!k)
  )

  const { data: userRow } = await supabase
    .from("users")
    .select("current_streak, wants_salud_sexual, gender, takes_chronic_medication")
    .eq("id", userId)
    .single()

  const currentStreak = userRow?.current_streak ?? 0

  const { data: allModules } = await supabase
    .from("modules")
    .select("component_key")
    .eq("is_published", true)

  const routeEligible = (allModules ?? []).filter((m) => {
    if (m.component_key === "adherencia") return userRow?.takes_chronic_medication === true
    if (m.component_key === "salud_sexual") {
      return userRow?.gender === "male" && userRow?.wants_salud_sexual === true
    }
    return true
  })
  const totalRouteModules = routeEligible.length

  const newlyUnlocked: Achievement[] = []

  for (const a of allAchievements as Achievement[]) {
    if (unlockedIds.has(a.id)) continue

    let unlocked = false
    switch (a.requirement_type) {
      case "module_complete":
        unlocked = !!a.module_key && completedComponentKeys.has(a.module_key)
        break
      case "modules_count":
        unlocked = modulesCompleted >= a.requirement_value
        break
      case "streak_days":
        unlocked = currentStreak >= a.requirement_value
        break
      case "first_login":
        unlocked = true
        break
      case "all_modules":
        unlocked = totalRouteModules > 0 && modulesCompleted >= totalRouteModules
        break
    }

    if (unlocked) newlyUnlocked.push(a)
  }

  if (newlyUnlocked.length > 0) {
    await supabase.from("user_achievements").insert(
      newlyUnlocked.map((a) => ({ user_id: userId, achievement_id: a.id }))
    )
  }

  return newlyUnlocked
}

export async function updateStreak(userId: string): Promise<number> {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from("users")
    .select("current_streak, best_streak, last_activity_date")
    .eq("id", userId)
    .single()

  if (!user) return 0

  const today = new Date().toISOString().split("T")[0]
  if (user.last_activity_date === today) return user.current_streak ?? 0

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  const newStreak = user.last_activity_date === yesterdayStr
    ? (user.current_streak ?? 0) + 1
    : 1

  const bestStreak = Math.max(user.best_streak ?? 0, newStreak)

  await supabase
    .from("users")
    .update({
      current_streak: newStreak,
      best_streak: bestStreak,
      last_activity_date: today,
    })
    .eq("id", userId)

  return newStreak
}

export async function onModuleComplete(userId: string, moduleId: string): Promise<Achievement[]> {
  const supabase = createAdminClient()
  await supabase
    .from("module_completions")
    .upsert({ user_id: userId, module_id: moduleId }, { onConflict: "user_id,module_id" })

  await updateStreak(userId)
  return checkAndUnlockAchievements(userId)
}

export async function onPatientDashboardLoad(userId: string): Promise<Achievement[]> {
  await updateStreak(userId)
  return checkAndUnlockAchievements(userId)
}

export async function markAchievementsNotified(userId: string, achievementIds: string[]) {
  if (achievementIds.length === 0) return
  const supabase = createAdminClient()
  await supabase
    .from("user_achievements")
    .update({ notified: true })
    .eq("user_id", userId)
    .in("achievement_id", achievementIds)
}

"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { POINTS, getNewlyUnlockedAchievements } from "@/lib/rewards"

export async function awardPointsAndCheckAchievements(
  userId: string,
  reason: string,
  points: number,
  referenceId?: string
) {
  const supabase = createAdminClient()

  // Registrar puntos
  await supabase.from("points_log").insert({
    user_id: userId,
    points,
    reason,
    reference_id: referenceId ?? null,
  })

  // Actualizar total del usuario
  const { data: user } = await supabase
    .from("users")
    .select("total_points")
    .eq("id", userId)
    .single()

  const newTotal = (user?.total_points ?? 0) + points

  await supabase
    .from("users")
    .update({ total_points: newTotal })
    .eq("id", userId)

  // Verificar logros
  await checkAndUnlockAchievements(userId)

  return { newTotal }
}

export async function checkAndUnlockAchievements(userId: string) {
  const supabase = createAdminClient()

  // Obtener todos los logros
  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*")

  if (!allAchievements) return []

  // Obtener logros ya desbloqueados
  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)

  // Obtener stats
  const { count: modulesCompleted } = await supabase
    .from("module_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  const { count: tasksSubmitted } = await supabase
    .from("task_submissions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  const { data: quizData } = await supabase
    .from("quiz_responses")
    .select("module_id, is_correct")
    .eq("user_id", userId)

  const quizByModule = new Map<string, { total: number; correct: number }>()
  quizData?.forEach(q => {
    const current = quizByModule.get(q.module_id) ?? { total: 0, correct: 0 }
    current.total++
    if (q.is_correct) current.correct++
    quizByModule.set(q.module_id, current)
  })

  const quizzesCompleted = quizByModule.size
  const quizzesPerfect = Array.from(quizByModule.values())
    .filter(q => q.total > 0 && q.correct === q.total).length

  const { data: userData } = await supabase
    .from("users")
    .select("current_streak")
    .eq("id", userId)
    .single()

  const { count: totalModules } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true)

  const allComplete = (modulesCompleted ?? 0) >= (totalModules ?? 14) &&
    (tasksSubmitted ?? 0) >= (totalModules ?? 14)

  const stats = {
    modulesCompleted: modulesCompleted ?? 0,
    quizzesCompleted,
    quizzesPerfect,
    tasksSubmitted: tasksSubmitted ?? 0,
    streakDays: userData?.current_streak ?? 0,
    allComplete,
    speedComplete: false, // Handled separately on module complete
  }

  const newlyUnlocked = getNewlyUnlockedAchievements(
    allAchievements,
    userAchievements ?? [],
    stats
  )

  // Desbloquear logros nuevos
  for (const achievement of newlyUnlocked) {
    await supabase.from("user_achievements").insert({
      user_id: userId,
      achievement_id: achievement.id,
    })

    // Dar puntos por el logro
    await supabase.from("points_log").insert({
      user_id: userId,
      points: achievement.points,
      reason: "achievement_unlock",
      reference_id: achievement.id,
    })

    await supabase
      .from("users")
      .update({
        total_points: (await supabase.from("users").select("total_points").eq("id", userId).single()).data?.total_points ?? 0 + achievement.points,
      })
      .eq("id", userId)
  }

  return newlyUnlocked
}

export async function updateStreak(userId: string) {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from("users")
    .select("current_streak, best_streak, last_activity_date")
    .eq("id", userId)
    .single()

  if (!user) return

  const today = new Date().toISOString().split('T')[0]
  const lastActivity = user.last_activity_date

  if (lastActivity === today) return // Ya se registró hoy

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  let newStreak = 1
  if (lastActivity === yesterdayStr) {
    newStreak = (user.current_streak ?? 0) + 1
  }

  const bestStreak = Math.max(user.best_streak ?? 0, newStreak)

  await supabase
    .from("users")
    .update({
      current_streak: newStreak,
      best_streak: bestStreak,
      last_activity_date: today,
    })
    .eq("id", userId)

  // Verificar logros de racha
  await checkAndUnlockAchievements(userId)
}

export async function onModuleComplete(userId: string, moduleId: string) {
  await awardPointsAndCheckAchievements(userId, "module_complete", POINTS.MODULE_COMPLETE, moduleId)
  await updateStreak(userId)
}

export async function onQuizComplete(userId: string, moduleId: string, isPerfect: boolean) {
  const points = isPerfect ? POINTS.QUIZ_PERFECT : POINTS.QUIZ_COMPLETE
  const reason = isPerfect ? "quiz_perfect" : "quiz_complete"
  await awardPointsAndCheckAchievements(userId, reason, points, moduleId)
  await updateStreak(userId)
}

export async function onTaskSubmit(userId: string, moduleId: string) {
  await awardPointsAndCheckAchievements(userId, "task_submit", POINTS.TASK_SUBMIT, moduleId)
  await updateStreak(userId)
}

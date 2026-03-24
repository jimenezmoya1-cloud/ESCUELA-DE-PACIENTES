import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getDiscountTier } from "@/lib/rewards"
import RewardsPageClient from "./RewardsPageClient"

export default async function RecompensasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Datos del usuario
  const { data: profile } = await supabase
    .from("users")
    .select("total_points, current_streak, best_streak")
    .eq("id", user.id)
    .single()

  // Todos los logros
  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*")
    .order("sort_order")

  // Logros del usuario
  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("*, achievement:achievements(*)")
    .eq("user_id", user.id)

  // Stats
  const { count: modulesCompleted } = await supabase
    .from("module_completions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const { count: totalModules } = await supabase
    .from("modules")
    .select("*", { count: "exact", head: true })
    .eq("is_published", true)

  const { count: tasksSubmitted } = await supabase
    .from("task_submissions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const { data: quizData } = await supabase
    .from("quiz_responses")
    .select("module_id, is_correct")
    .eq("user_id", user.id)

  // Contar quizzes completados y perfectos por módulo
  const quizByModule = new Map<string, { total: number; correct: number }>()
  quizData?.forEach(q => {
    const current = quizByModule.get(q.module_id) ?? { total: 0, correct: 0 }
    current.total++
    if (q.is_correct) current.correct++
    quizByModule.set(q.module_id, current)
  })
  const quizzesCompleted = quizByModule.size
  const quizzesPerfect = Array.from(quizByModule.values()).filter(q => q.total > 0 && q.correct === q.total).length

  // Historial de puntos recientes
  const { data: pointsLog } = await supabase
    .from("points_log")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  const totalPoints = profile?.total_points ?? 0
  const allComplete = (modulesCompleted ?? 0) >= (totalModules ?? 14) &&
    (tasksSubmitted ?? 0) >= (totalModules ?? 14)
  const discountTier = getDiscountTier(totalPoints, allComplete)

  return (
    <RewardsPageClient
      totalPoints={totalPoints}
      currentStreak={profile?.current_streak ?? 0}
      modulesCompleted={modulesCompleted ?? 0}
      totalModules={totalModules ?? 14}
      quizzesCompleted={quizzesCompleted}
      quizzesPerfect={quizzesPerfect}
      tasksSubmitted={tasksSubmitted ?? 0}
      discountTier={discountTier}
      allAchievements={allAchievements ?? []}
      userAchievements={userAchievements ?? []}
      pointsLog={pointsLog ?? []}
    />
  )
}

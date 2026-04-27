import { createClient } from "@/lib/supabase/server"
import RewardsPageClient from "@/components/dashboard/RewardsPageClient"
import type { Achievement, UserAchievement } from "@/types/database"

export default async function RecompensasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: allAchievements },
    { data: userAchievements },
    { data: userRow },
    { data: completions },
    { data: publishedModules },
    { data: certificate },
  ] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("user_achievements").select("*").eq("user_id", user!.id),
    supabase.from("users")
      .select("name, current_streak, best_streak, gender, wants_salud_sexual, takes_chronic_medication")
      .eq("id", user!.id).single(),
    supabase.from("module_completions").select("module_id").eq("user_id", user!.id),
    supabase.from("modules").select("component_key").eq("is_published", true),
    supabase.from("user_certificates").select("*").eq("user_id", user!.id).maybeSingle(),
  ])

  const modulesCompleted = (completions ?? []).length
  const totalRouteModules = (publishedModules ?? []).filter((m) => {
    if (m.component_key === "adherencia") return userRow?.takes_chronic_medication === true
    if (m.component_key === "salud_sexual") {
      return userRow?.gender === "male" && userRow?.wants_salud_sexual === true
    }
    return true
  }).length

  return (
    <RewardsPageClient
      userId={user!.id}
      userName={userRow?.name ?? ""}
      achievements={(allAchievements ?? []) as Achievement[]}
      userAchievements={(userAchievements ?? []) as UserAchievement[]}
      currentStreak={userRow?.current_streak ?? 0}
      bestStreak={userRow?.best_streak ?? 0}
      modulesCompleted={modulesCompleted}
      totalRouteModules={totalRouteModules}
      hasCertificate={!!certificate}
    />
  )
}

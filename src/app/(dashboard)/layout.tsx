import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { onPatientDashboardLoad } from "@/lib/rewards-actions"
import DashboardShell from "@/components/dashboard/DashboardShell"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/login")
  }

  if (profile.role === "admin") {
    redirect("/admin")
  }

  await onPatientDashboardLoad(user.id)

  const admin = createAdminClient()
  const [{ data: completions }, { data: publishedModules }, { data: pendingUnlocks }, { data: freshProfile }] = await Promise.all([
    supabase.from("module_completions").select("module_id").eq("user_id", user.id),
    supabase.from("modules").select("component_key").eq("is_published", true),
    admin
      .from("user_achievements")
      .select("id, achievement_id, achievement:achievements(*)")
      .eq("user_id", user.id)
      .eq("notified", false),
    supabase.from("users").select("current_streak, best_streak").eq("id", user.id).single(),
  ])

  const modulesCompleted = completions?.length ?? 0
  const totalRouteModules = (publishedModules ?? []).filter((m) => {
    if (m.component_key === "adherencia") return profile.takes_chronic_medication === true
    if (m.component_key === "salud_sexual") {
      return profile.gender === "male" && profile.wants_salud_sexual === true
    }
    return true
  }).length

  const newlyUnlockedAchievements = (pendingUnlocks ?? [])
    .map((u: { achievement: unknown }) => u.achievement)
    .filter((a): a is NonNullable<typeof a> => !!a) as import("@/types/database").Achievement[]

  return (
    <DashboardShell
      userId={user.id}
      userName={profile.name}
      currentStreak={freshProfile?.current_streak ?? profile.current_streak ?? 0}
      bestStreak={freshProfile?.best_streak ?? profile.best_streak ?? 0}
      modulesCompleted={modulesCompleted}
      totalRouteModules={totalRouteModules}
      newlyUnlockedAchievements={newlyUnlockedAchievements}
    >
      {children}
    </DashboardShell>
  )
}

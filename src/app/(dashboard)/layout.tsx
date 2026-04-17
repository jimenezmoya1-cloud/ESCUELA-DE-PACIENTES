import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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

  const [{ data: completions }, { data: publishedModules }] = await Promise.all([
    supabase.from("module_completions").select("module_id").eq("user_id", user.id),
    supabase.from("modules").select("component_key").eq("is_published", true),
  ])

  const modulesCompleted = completions?.length ?? 0
  const totalRouteModules = (publishedModules ?? []).filter((m) => {
    if (m.component_key === "adherencia") return profile.takes_chronic_medication === true
    if (m.component_key === "salud_sexual") {
      return profile.gender === "male" && profile.wants_salud_sexual === true
    }
    return true
  }).length

  return (
    <DashboardShell
      userName={profile.name}
      currentStreak={profile.current_streak ?? 0}
      bestStreak={profile.best_streak ?? 0}
      modulesCompleted={modulesCompleted}
      totalRouteModules={totalRouteModules}
    >
      {children}
    </DashboardShell>
  )
}

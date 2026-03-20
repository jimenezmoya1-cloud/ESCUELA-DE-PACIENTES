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

  // Si es admin, redirigir al panel de admin
  if (profile.role === "admin") {
    redirect("/admin")
  }

  // Contar mensajes sin leer
  const { count: unreadCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("to_user_id", user.id)
    .is("read_at", null)

  return (
    <DashboardShell
      userName={profile.name}
      unreadMessages={unreadCount ?? 0}
    >
      {children}
    </DashboardShell>
  )
}

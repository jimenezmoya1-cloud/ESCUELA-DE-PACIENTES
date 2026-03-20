import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminShell from "@/components/admin/AdminShell"

export const dynamic = "force-dynamic"

export default async function AdminLayout({
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

  if (!profile || profile.role !== "admin") {
    redirect("/mi-camino")
  }

  return (
    <AdminShell adminName={profile.name}>{children}</AdminShell>
  )
}

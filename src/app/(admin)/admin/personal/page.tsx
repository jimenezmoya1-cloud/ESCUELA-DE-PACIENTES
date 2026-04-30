import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import StaffList from "@/components/admin/StaffList"
import InviteStaffForm from "@/components/admin/InviteStaffForm"

export const dynamic = "force-dynamic"

export default async function PersonalPage() {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) {
    redirect("/admin")
  }

  const supabase = await createClient()
  const { data: staff } = await supabase
    .from("users")
    .select("id, name, email, role, profession, specialty, medical_registration, professional_id_card, is_active, registered_at")
    .in("role", ["admin", "clinico"])
    .order("registered_at", { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral mb-6">Personal</h1>
      <div className="mb-8">
        <InviteStaffForm />
      </div>
      <StaffList staff={staff ?? []} />
    </div>
  )
}

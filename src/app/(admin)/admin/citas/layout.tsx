import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import CitasTabs from "@/components/admin/CitasTabs"

export default async function CitasLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Citas</h1>
        <p className="text-sm text-tertiary">
          Calendario maestro, tabla de citas y gestión de pagos y créditos.
        </p>
      </header>

      <CitasTabs />

      <div>{children}</div>
    </div>
  )
}

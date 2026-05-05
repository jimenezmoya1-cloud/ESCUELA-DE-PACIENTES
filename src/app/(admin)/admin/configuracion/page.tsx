import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { getSchedulingConfig } from "@/lib/payments/config"
import ConfiguracionForm from "@/components/admin/ConfiguracionForm"

export const dynamic = "force-dynamic"

export default async function ConfiguracionPage() {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const config = await getSchedulingConfig()

  return (
    <div className="space-y-8 p-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Configuración</h1>
        <p className="text-sm text-tertiary">
          Ajustes globales del sistema de agendamiento. Los cambios afectan a todos los pacientes.
        </p>
      </header>

      <ConfiguracionForm initial={config} />
    </div>
  )
}

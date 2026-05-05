import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"

export default async function CitasLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const tabs = [
    { href: "/admin/citas/calendario", label: "Calendario" },
    { href: "/admin/citas/tabla", label: "Tabla de citas" },
    { href: "/admin/citas/pagos", label: "Pagos y créditos" },
  ]

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Citas</h1>
        <p className="text-sm text-tertiary">
          Calendario maestro, tabla de citas y gestión de pagos y créditos.
        </p>
      </header>

      <nav className="flex gap-1 border-b border-tertiary/10">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-t-lg px-4 py-2 text-sm font-medium text-tertiary hover:text-neutral data-[active=true]:border-b-2 data-[active=true]:border-primary data-[active=true]:text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  )
}

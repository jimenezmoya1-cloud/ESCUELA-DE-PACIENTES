"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { href: "/admin/citas/calendario", label: "Calendario" },
  { href: "/admin/citas/tabla", label: "Tabla de citas" },
  { href: "/admin/citas/pagos", label: "Pagos y créditos" },
]

export default function CitasTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-1 border-b border-tertiary/10">
      {tabs.map((t) => {
        const active = pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              active
                ? "border-b-2 border-primary text-primary"
                : "text-tertiary hover:text-neutral"
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

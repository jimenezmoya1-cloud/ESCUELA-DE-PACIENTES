"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { StaffProfile } from "@/lib/auth/profile"
import { Contact } from "lucide-react"

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
  visibleTo: ReadonlyArray<"admin" | "clinico">
}

const homeIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
  </svg>
)
const contentIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)
const blogIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
)
const conveniosIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)
const codesIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)
const personalIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)
const patientsIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)
const stethoscopeIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const calendarIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const settingsIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const homeItemByRole: Record<"admin" | "clinico", NavItem> = {
  admin: { href: "/admin", label: "Inicio", icon: homeIcon, exact: true },
  clinico: { href: "/admin/clinico/dashboard", label: "Inicio", icon: homeIcon, exact: true },
}

const navGroups: NavGroup[] = [
  {
    label: "Escuela de pacientes",
    visibleTo: ["admin"],
    items: [
      { href: "/admin/contenido", label: "Contenido", icon: contentIcon },
      { href: "/admin/blog", label: "Blog", icon: blogIcon },
    ],
  },
  {
    label: "Gestión administrativa",
    visibleTo: ["admin"],
    items: [
      { href: "/admin/convenios", label: "Convenios", icon: conveniosIcon },
      { href: "/admin/codigos", label: "Códigos de acceso", icon: codesIcon },
      { href: "/admin/personal", label: "Personal", icon: personalIcon },
      { href: "/admin/citas", label: "Citas", icon: calendarIcon },
      { href: "/admin/crm", label: "CRM Leads", icon: <Contact className="h-5 w-5" /> },
    ],
  },
  {
    label: "Sistema",
    visibleTo: ["admin"],
    items: [
      { href: "/admin/configuracion", label: "Configuración", icon: settingsIcon },
      { href: "/admin/auditoria", label: "Auditoría", icon: settingsIcon },
    ],
  },
  {
    label: "Clínico",
    visibleTo: ["admin", "clinico"],
    items: [
      { href: "/admin/clinico/dashboard", label: "Dashboard clínico", icon: stethoscopeIcon },
      { href: "/admin/pacientes", label: "Pacientes", icon: patientsIcon },
      { href: "/admin/clinico/disponibilidad", label: "Mi disponibilidad", icon: calendarIcon },
      { href: "/admin/clinico/agenda", label: "Mi agenda", icon: calendarIcon },
    ],
  },
]

export default function AdminShell({
  profile,
  children,
}: {
  profile: Pick<StaffProfile, "name" | "role">
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const homeItem =
    profile.role === "admin" || profile.role === "clinico"
      ? homeItemByRole[profile.role]
      : null

  const visibleGroups = navGroups
    .filter((g) =>
      profile.role === "admin" || profile.role === "clinico"
        ? g.visibleTo.includes(profile.role)
        : false
    )
    .map((g) => ({
      ...g,
      items: homeItem ? g.items.filter((i) => i.href !== homeItem.href) : g.items,
    }))
    .filter((g) => g.items.length > 0)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const renderNavItem = (item: NavItem, isMobile: boolean) => {
    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
    if (isMobile) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            isActive ? "bg-primary/10 text-primary" : "text-tertiary hover:bg-background"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      )
    }
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive ? "bg-primary/10 text-primary" : "text-tertiary hover:bg-background hover:text-neutral"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      </li>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-tertiary/10 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-tertiary/10 px-6 gap-3">
          <img
            src="/logo-medicina-preventiva.png"
            alt="Logo Medicina Preventiva CAIMED"
            className="h-14 w-auto object-contain"
          />
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {profile.role === "admin" ? "Admin" : "Clínico"}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {homeItem && (
            <ul className="mb-6 space-y-1">
              {renderNavItem(homeItem, false)}
            </ul>
          )}
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {visibleGroups.length > 1 && (
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-tertiary/60">
                  {group.label}
                </div>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => renderNavItem(item, false))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-tertiary/10 p-4">
          <div className="mb-2 text-sm text-tertiary">{profile.name}</div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-tertiary transition-colors hover:bg-background hover:text-error"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header + nav mobile */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-tertiary/10 bg-white px-4 lg:hidden">
          <img
            src="/logo-medicina-preventiva.png"
            alt="Logo Medicina Preventiva CAIMED"
            className="h-14 w-auto object-contain"
          />
          <button onClick={handleLogout} className="text-sm text-tertiary hover:text-error">
            Salir
          </button>
        </header>

        <nav className="flex items-center gap-1 overflow-x-auto border-b border-tertiary/10 bg-white px-4 py-2 lg:hidden">
          {homeItem && renderNavItem(homeItem, true)}
          {visibleGroups.flatMap((g) => g.items).map((item) => renderNavItem(item, true))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

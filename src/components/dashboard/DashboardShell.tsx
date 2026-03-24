"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  {
    href: "/mi-camino",
    label: "Mi Camino",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    href: "/mensajes",
    label: "Mensajes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    href: "/recompensas",
    label: "Recompensas",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 48 48" fill="none" stroke="currentColor">
        <path d="M14 6h20v14a10 10 0 01-20 0V6z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 10H8a4 4 0 000 8h2M34 10h6a4 4 0 010 8h-2" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 30v6M16 40h16" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/progreso",
    label: "Mi Progreso",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

export default function DashboardShell({
  userName,
  unreadMessages,
  totalPoints = 0,
  children,
}: {
  userName: string
  unreadMessages: number
  totalPoints?: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-tertiary/10 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/mi-camino" className="flex items-center gap-2">
            {/* TODO: reemplazar con /public/logo.svg */}
            <span className="text-xl font-bold text-primary">CAIMED</span>
          </Link>

          {/* Saludo + acciones */}
          <div className="flex items-center gap-4">
            {/* Badge de puntos */}
            <Link
              href="/recompensas"
              className="flex items-center gap-1.5 rounded-full bg-yellow-50 px-3 py-1.5 text-sm font-bold text-yellow-700 transition-colors hover:bg-yellow-100"
            >
              <svg className="h-4 w-4" viewBox="0 0 48 48" fill="none">
                <path d="M24 4l6 14h14l-11 9 4 15-13-9-13 9 4-15L4 18h14z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {totalPoints}
            </Link>
            <span className="hidden text-sm text-tertiary sm:block">
              Hola, <span className="font-medium text-neutral">{userName.split(" ")[0]}</span>
            </span>

            {/* Notificaciones de mensajes */}
            <Link
              href="/mensajes"
              className="relative rounded-lg p-2 text-tertiary transition-colors hover:bg-background hover:text-secondary"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </Link>

            {/* Cerrar sesión */}
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm text-tertiary transition-colors hover:bg-background hover:text-error"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <nav className="hidden w-56 shrink-0 border-r border-tertiary/10 bg-white p-4 lg:block">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-secondary/10 text-secondary"
                        : "text-tertiary hover:bg-background hover:text-neutral"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.href === "/mensajes" && unreadMessages > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                        {unreadMessages > 9 ? "9+" : unreadMessages}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-tertiary/10 bg-white lg:hidden">
        <ul className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
                    isActive ? "text-secondary" : "text-tertiary"
                  }`}
                >
                  {item.icon}
                  {item.label}
                  {item.href === "/mensajes" && unreadMessages > 0 && (
                    <span className="absolute -top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

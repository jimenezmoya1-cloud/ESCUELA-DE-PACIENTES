"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { StreakCounter } from "./StreakCounter"
import { BadgeUnlockOverlay } from "./BadgeUnlockOverlay"
import { BadgeShareModal } from "./BadgeShareModal"
import type { Achievement } from "@/types/database"

const evaluacionItems = [
  {
    href: "/agendar",
    label: "Agendar evaluación",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/mi-historia-clinica",
    label: "Mi Evaluación",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

const escuelaItems = [
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
    href: "/comunidad",
    label: "Comunidad",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    href: "/mensajes",
    label: "Mensajes",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

const allNavItems = [...evaluacionItems, ...escuelaItems]

function NavLink({ item, pathname }: { item: typeof allNavItems[0]; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-[#06559F]/10 text-[#06559F]"
          : "text-tertiary hover:bg-background hover:text-[#212B52]"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  )
}

export default function DashboardShell({
  userId,
  userName,
  currentStreak,
  bestStreak,
  modulesCompleted,
  totalRouteModules,
  newlyUnlockedAchievements,
  children,
}: {
  userId: string
  userName: string
  currentStreak: number
  bestStreak: number
  modulesCompleted: number
  totalRouteModules: number
  newlyUnlockedAchievements: Achievement[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [queue, setQueue] = useState<Achievement[]>(newlyUnlockedAchievements)
  const [shareBadge, setShareBadge] = useState<Achievement | null>(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-tertiary/10 bg-white shadow-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <Link href="/mi-historia-clinica" className="flex items-center gap-3">
            <img
              src="/logo-medicina-preventiva.png"
              alt="Logo CAIMED Preventiva"
              className="h-16 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold text-[#06559F] sm:block">CAIMED Preventiva App</span>
          </Link>

          {/* Saludo + acciones */}
          <div className="flex items-center gap-4">
            <StreakCounter
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              modulesCompleted={modulesCompleted}
              totalRouteModules={totalRouteModules}
            />
            <span className="hidden text-sm text-tertiary sm:block">
              Hola, <span className="font-medium text-[#212B52]">{(userName || "Usuario").split(" ")[0]}</span>
            </span>
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
        <nav className="hidden w-60 shrink-0 border-r border-tertiary/10 bg-white p-4 lg:block">
          {/* Sección Mi Evaluación */}
          <div className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-[#06559F]">
              Mi Evaluación
            </p>
            <ul className="space-y-0.5">
              {evaluacionItems.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>

          <div className="my-3 border-t border-tertiary/10" />

          {/* Sección Escuela de Pacientes */}
          <div>
            <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-tertiary">
              Escuela de Pacientes
            </p>
            <ul className="space-y-0.5">
              {escuelaItems.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} pathname={pathname} />
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>

      {queue.length > 0 && (
        <BadgeUnlockOverlay
          queue={queue}
          userId={userId}
          onShareClick={(a) => setShareBadge(a)}
          onDone={() => setQueue([])}
        />
      )}

      {shareBadge && (
        <BadgeShareModal
          achievement={shareBadge}
          userId={userId}
          userName={userName}
          unlockedAt={new Date().toISOString()}
          onClose={() => setShareBadge(null)}
        />
      )}

      {/* Bottom nav mobile — Mi Evaluación primero */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-tertiary/10 bg-white lg:hidden">
        <ul className="flex items-center justify-around py-2">
          {allNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                    isActive ? "text-[#06559F]" : "text-tertiary"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

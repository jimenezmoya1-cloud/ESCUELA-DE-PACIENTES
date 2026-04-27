"use client"

import { useState } from "react"
import { FireLottie } from "./FireLottie"
import { BadgeIcon } from "./BadgeIcon"
import { BadgeShareModal } from "./BadgeShareModal"
import { groupAchievementsByCategory, nextStreakMilestone } from "@/lib/rewards"
import { CATEGORY_STYLES, CATEGORY_ORDER } from "@/lib/badges"
import type { Achievement, UserAchievement } from "@/types/database"
import { Flame, Trophy, Download } from "lucide-react"

interface Props {
  userId: string
  userName: string
  achievements: Achievement[]
  userAchievements: UserAchievement[]
  currentStreak: number
  bestStreak: number
  modulesCompleted: number
  totalRouteModules: number
  hasCertificate: boolean
}

export default function RewardsPageClient({
  userId, userName, achievements, userAchievements, currentStreak, bestStreak,
  modulesCompleted, totalRouteModules,
}: Props) {
  const [shareBadge, setShareBadge] = useState<Achievement | null>(null)
  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua]))
  const grouped = groupAchievementsByCategory(achievements)
  const progress = totalRouteModules > 0 ? modulesCompleted / totalRouteModules : 0
  const firefighterAch = achievements.find((a) => a.key === "special_firefighter")
  const firefighterUnlocked = firefighterAch ? unlockedMap.has(firefighterAch.id) : false
  const nextStreak = nextStreakMilestone(currentStreak)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[#212B52]">Tu progreso</h1>
        <p className="text-tertiary">Escuela de Pacientes — Salud Cardiovascular</p>
      </div>

      {/* FIRE HERO */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 p-8 text-center shadow-lg">
        <FireLottie progress={progress} baseSize={280} />
        <p className="mt-4 text-lg font-semibold text-[#212B52]">
          Módulos completados: <span className="text-orange-600">{modulesCompleted} / {totalRouteModules}</span>
        </p>
        <p className="mt-1 text-sm text-tertiary">
          El fuego se va apagando a medida que avanzas en tu camino.
        </p>
      </div>

      {/* STREAK CARD */}
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Flame className="h-10 w-10 text-orange-500" />
            <div>
              <p className="text-sm text-tertiary">Racha actual</p>
              <p className="text-3xl font-extrabold text-orange-600">{currentStreak} días</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-tertiary">Mejor racha</p>
            <p className="flex items-center gap-1 text-lg font-bold text-[#212B52]">
              <Trophy className="h-5 w-5 text-amber-500" /> {bestStreak}
            </p>
          </div>
        </div>
        {nextStreak && (
          <p className="mt-3 text-center text-sm text-tertiary">
            Próxima insignia a los <strong>{nextStreak} días</strong> (faltan {nextStreak - currentStreak}).
          </p>
        )}
      </div>

      {/* BADGES */}
      {CATEGORY_ORDER.map((cat) => (
        <div key={cat}>
          <h2 className="mb-4 text-xl font-bold text-[#212B52]">{CATEGORY_STYLES[cat].label}</h2>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
            {(grouped[cat] ?? []).map((a) => {
              const ua = unlockedMap.get(a.id)
              const unlocked = !!ua
              return (
                <button
                  key={a.id}
                  onClick={() => unlocked && setShareBadge(a)}
                  disabled={!unlocked}
                  className={`flex flex-col items-center gap-2 rounded-xl p-3 transition-transform ${unlocked ? "hover:scale-105 cursor-pointer" : "cursor-default opacity-70"}`}
                >
                  <BadgeIcon icon={a.icon} category={a.category} unlocked={unlocked} size="md" />
                  <p className="text-center text-xs font-semibold text-[#212B52] line-clamp-2">{a.title}</p>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* CERTIFICATE */}
      {firefighterUnlocked && (
        <div className="rounded-2xl border-2 border-[#06559F] bg-[#06559F]/5 p-6 text-center">
          <h2 className="text-2xl font-bold text-[#06559F]">¡Apagaste el incendio!</h2>
          <p className="mt-2 text-tertiary">Completaste todos los módulos. Descarga tu certificado oficial CAIMED.</p>
          <a
            href={`/api/certificate/${userId}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#06559F] px-6 py-3 font-bold text-white shadow-lg hover:bg-[#054a8a]"
          >
            <Download className="h-5 w-5" /> Descargar certificado
          </a>
        </div>
      )}

      {shareBadge && (
        <BadgeShareModal
          achievement={shareBadge}
          userId={userId}
          userName={userName}
          unlockedAt={unlockedMap.get(shareBadge.id)?.unlocked_at ?? null}
          onClose={() => setShareBadge(null)}
        />
      )}
    </div>
  )
}

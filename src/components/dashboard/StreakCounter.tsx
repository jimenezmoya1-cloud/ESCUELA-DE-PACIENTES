"use client"

import { useState } from "react"
import Link from "next/link"
import { Flame } from "lucide-react"
import { FireLottie } from "./FireLottie"
import { nextStreakMilestone } from "@/lib/rewards"

interface StreakCounterProps {
  currentStreak: number
  bestStreak: number
  modulesCompleted: number
  totalRouteModules: number
}

export function StreakCounter({ currentStreak, bestStreak, modulesCompleted, totalRouteModules }: StreakCounterProps) {
  const [open, setOpen] = useState(false)
  const progress = totalRouteModules > 0 ? modulesCompleted / totalRouteModules : 0
  const nextMilestone = nextStreakMilestone(currentStreak)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
          aria-label={`Racha de ${currentStreak} días`}
        >
          <Flame className="h-4 w-4" strokeWidth={2.5} />
          <span>{currentStreak}</span>
        </button>

        <Link href="/recompensas" className="flex items-center" aria-label="Ver recompensas">
          <FireLottie progress={progress} baseSize={40} />
        </Link>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-3">
              <Flame className="h-12 w-12 text-orange-500" strokeWidth={2} />
              <h2 className="text-2xl font-bold text-[#212B52]">Racha actual</h2>
              <p className="text-4xl font-extrabold text-orange-600">{currentStreak} días</p>
              <p className="text-sm text-tertiary">Mejor racha: {bestStreak} días</p>
              {nextMilestone && (
                <p className="text-sm text-center text-tertiary">
                  Próxima insignia a los <strong>{nextMilestone} días</strong> — te faltan {nextMilestone - currentStreak}.
                </p>
              )}
              <button
                onClick={() => setOpen(false)}
                className="mt-2 w-full rounded-xl bg-[#06559F] py-2 font-semibold text-white hover:bg-[#054a8a]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

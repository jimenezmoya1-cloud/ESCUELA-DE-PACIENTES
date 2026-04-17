"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { BadgeIcon } from "./BadgeIcon"
import type { Achievement } from "@/types/database"
import { markAchievementsNotified } from "@/lib/rewards-actions"

interface Props {
  queue: Achievement[]
  userId: string
  onShareClick: (achievement: Achievement) => void
  onDone: () => void
}

export function BadgeUnlockOverlay({ queue, userId, onShareClick, onDone }: Props) {
  const [index, setIndex] = useState(0)
  const current = queue[index]

  useEffect(() => {
    if (!current) return
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.4 },
      colors: ["#06559F", "#1E8DCE", "#FFD700", "#FF6B35"],
    })
  }, [current])

  if (!current) return null

  async function handleContinue() {
    if (index + 1 < queue.length) {
      setIndex(index + 1)
    } else {
      await markAchievementsNotified(userId, queue.map((a) => a.id))
      onDone()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key={current.id}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="flex flex-col items-center gap-4 rounded-3xl bg-white p-8 shadow-2xl max-w-sm w-full"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <motion.div
            initial={{ scale: 0.6, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
          >
            <BadgeIcon icon={current.icon} category={current.category} unlocked size="lg" />
          </motion.div>

          <h2 className="text-center text-2xl font-extrabold text-[#212B52]">
            ¡Nueva insignia!
          </h2>
          <p className="text-center text-lg font-semibold text-[#06559F]">{current.title}</p>
          <p className="text-center text-sm text-tertiary">{current.description}</p>

          <div className="mt-2 flex w-full flex-col gap-2">
            <button
              onClick={() => onShareClick(current)}
              className="w-full rounded-xl bg-green-600 py-3 font-bold text-white shadow-lg hover:bg-green-700"
            >
              Compartir en WhatsApp
            </button>
            <button
              onClick={handleContinue}
              className="w-full rounded-xl bg-[#06559F] py-3 font-bold text-white shadow-lg hover:bg-[#054a8a]"
            >
              {index + 1 < queue.length ? "Siguiente" : "Continuar"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

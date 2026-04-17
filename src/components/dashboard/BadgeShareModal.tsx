"use client"

import { BadgeIcon } from "./BadgeIcon"
import type { Achievement } from "@/types/database"
import { X, Share2 } from "lucide-react"

interface Props {
  achievement: Achievement
  userId: string
  userName: string
  unlockedAt: string | null
  onClose: () => void
}

export function BadgeShareModal({ achievement, userId, userName, unlockedAt, onClose }: Props) {
  const dateLabel = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
    : ""

  async function handleShare() {
    const imageUrl = `/api/badge-image?badge=${encodeURIComponent(achievement.key)}&user=${encodeURIComponent(userId)}`
    const text = `¡Desbloqueé la insignia "${achievement.title}" en Escuela de Pacientes CAIMED! 🎉`

    try {
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error("Image not ready")
      const blob = await response.blob()
      const file = new File([blob], `${achievement.key}.png`, { type: "image/png" })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "¡Gané una insignia!", text, files: [file] })
        return
      }
    } catch {
      // fall through to URL-based fallback
    }

    const fallback = `${text}\n${window.location.origin}${imageUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(fallback)}`, "_blank")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5 text-tertiary" /></button>
        </div>
        <div className="flex flex-col items-center gap-3">
          <BadgeIcon icon={achievement.icon} category={achievement.category} unlocked size="lg" />
          <h2 className="text-center text-xl font-extrabold text-[#212B52]">{achievement.title}</h2>
          <p className="text-center text-sm text-tertiary">{achievement.description}</p>
          {dateLabel && <p className="text-center text-xs text-tertiary">Desbloqueada el {dateLabel}</p>}
          {userName && <p className="sr-only">{userName}</p>}
          <button
            onClick={handleShare}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white shadow-lg hover:bg-green-700"
          >
            <Share2 className="h-5 w-5" /> Compartir en WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

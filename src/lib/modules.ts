import type { Module, ModuleCompletion, ModuleWithStatus } from "@/types/database"

/**
 * Calcula el estado de cada módulo basado en la fecha de registro del paciente.
 * Regla: módulo N se desbloquea en fecha_registro + (N-1) * 7 días
 */
export function getModulesWithStatus(
  modules: Module[],
  completions: ModuleCompletion[],
  registeredAt: string
): ModuleWithStatus[] {
  const now = new Date()
  const regDate = new Date(registeredAt)
  const completionMap = new Map(
    completions.map((c) => [c.module_id, c.completed_at])
  )

  const sorted = [...modules].sort((a, b) => a.order - b.order)

  // Encontrar el primer módulo desbloqueado y no completado
  let currentFound = false

  return sorted.map((mod) => {
    const unlockDate = new Date(regDate)
    unlockDate.setDate(unlockDate.getDate() + mod.days_to_unlock)

    const isUnlocked = now >= unlockDate
    const completedAt = completionMap.get(mod.id)
    const isCompleted = !!completedAt

    let status: ModuleWithStatus["status"]

    if (isCompleted) {
      status = "completed"
    } else if (isUnlocked && !currentFound) {
      status = "current"
      currentFound = true
    } else if (isUnlocked) {
      // Desbloqueado pero hay uno anterior sin completar: sigue siendo accesible
      status = "current"
    } else {
      // Calcular si es el próximo a desbloquearse
      const daysDiff = Math.ceil(
        (unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      status = daysDiff <= 7 ? "locked_next" : "locked_future"
    }

    return {
      ...mod,
      status,
      unlock_date: unlockDate,
      completed_at: completedAt,
    }
  })
}

/**
 * Formatea una fecha en formato legible en español
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Calcula el porcentaje de progreso del paciente
 */
export function calculateProgress(
  totalModules: number,
  completedModules: number
): number {
  if (totalModules === 0) return 0
  return Math.round((completedModules / totalModules) * 100)
}

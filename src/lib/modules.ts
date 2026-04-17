import type { Module, ModuleCompletion, ModuleWithStatus, PatientComponent, PatientModuleUnlock } from "@/types/database"
import { COMPONENT_TO_MODULE_KEY } from "@/types/database"

/**
 * Fixed order for remaining modules (after priorities).
 * 'adherencia' is conditional: only included if takes_chronic_medication === true
 * 'salud_sexual' is conditional: only included if gender === 'male' && wants_salud_sexual
 * 'control_peso' is NOT here — it can only appear as a patient-selected priority
 */
const REMAINING_MODULES_FIXED_ORDER: string[] = [
  'empoderamiento_salud',
  'red_de_apoyo',
  'adherencia',      // conditional
  'salud_sexual',    // conditional
  'actividad_fisica',
  'alimentacion',
  'salud_mental',
  'sueno',
  'presion_arterial',
  'glucosa',
  'colesterol',
  'nicotina',
]

/**
 * Builds the personalized route for a patient:
 * 1. "Inicio de ciclo: Tu mapa de salud" (empowerment) — always first
 * 2. "El incendio que vamos a apagar" (el_incendio) — always second (if module exists)
 * 3. Priority 1 module (patient selected)
 * 4. Priority 2 module (patient selected)
 * 5. Priority 3 module (patient selected)
 * 6+. Remaining modules in fixed order:
 *     empoderamiento_salud, red_de_apoyo,
 *     adherencia (only if takes_chronic_medication),
 *     salud_sexual (only if male && opted in),
 *     actividad_fisica, alimentacion, salud_mental, sueno,
 *     presion_arterial, glucosa, colesterol, nicotina
 * Last. "Cierre de ciclo" — always last
 */
export function buildPersonalizedRoute(
  allModules: Module[],
  patientComponents: PatientComponent[],
  wantsSaludSexual: boolean = false,
  gender: string | null = null,
  takesChronicMedication: boolean | null = null
): Module[] {
  if (patientComponents.length === 0) {
    // If no components selected yet, only show Module 1
    const mod1 = allModules.find((m) => m.component_key === 'empowerment' || m.order === 1)
    return mod1 ? [mod1] : []
  }

  const route: Module[] = []
  const usedIds = new Set<string>()

  // 1. "Inicio de ciclo" (always first)
  const mod1 = allModules.find((m) => m.component_key === 'empowerment' || m.order === 1)
  if (mod1) {
    route.push(mod1)
    usedIds.add(mod1.id)
  }

  // 2. "El incendio que vamos a apagar" (always second, if it exists in DB)
  const elIncendio = allModules.find((m) => m.component_key === 'el_incendio')
  if (elIncendio && !usedIds.has(elIncendio.id)) {
    route.push(elIncendio)
    usedIds.add(elIncendio.id)
  }

  // 3-5. Selected priority components (in priority order)
  const sortedComponents = [...patientComponents]
    .filter((c) => c.priority_order <= 3)
    .sort((a, b) => a.priority_order - b.priority_order)

  for (const comp of sortedComponents) {
    const key = COMPONENT_TO_MODULE_KEY[comp.component_name]
    if (key) {
      const mod = allModules.find((m) => m.component_key === key && !usedIds.has(m.id))
      if (mod) {
        route.push(mod)
        usedIds.add(mod.id)
      }
    }
  }

  // 6+. Remaining modules in FIXED order with conditional filtering
  for (const componentKey of REMAINING_MODULES_FIXED_ORDER) {
    // Skip adherencia if patient doesn't take chronic medication
    if (componentKey === 'adherencia' && takesChronicMedication !== true) continue
    // Skip salud_sexual if not male or not opted in
    if (componentKey === 'salud_sexual' && !(gender === 'male' && wantsSaludSexual)) continue

    const mod = allModules.find((m) => m.component_key === componentKey && !usedIds.has(m.id))
    if (mod) {
      route.push(mod)
      usedIds.add(mod.id)
    }
  }

  // Last. "Cierre de ciclo" — always at the end
  const cierre = allModules.find((m) => m.component_key === 'empowerment_cierre')
  if (cierre && !usedIds.has(cierre.id)) {
    route.push(cierre)
  }

  return route
}

/**
 * Checks if today is Monday (for unlock logic)
 */
export function isMonday(): boolean {
  return new Date().getDay() === 1
}

/**
 * Calculates module unlock status based on entry-based unlocking.
 *
 * Logic:
 * - Module 1: always unlocked immediately
 * - When patient enters Module 1, Module 2 (first priority) unlocks
 * - Modules 2 through penultimate: completing one unlocks the next
 * - When patient enters the penultimate module, the last (Cierre) unlocks
 * - Cierre NEVER unlocks before entering the penultimate module
 */
export function getModulesWithStatus(
  routeModules: Module[],
  completions: ModuleCompletion[],
  unlocks: PatientModuleUnlock[],
  submoduleCounts: Record<string, { total: number; completed: number }>,
): ModuleWithStatus[] {
  const completionMap = new Map(
    completions.map((c) => [c.module_id, c.completed_at])
  )
  const unlockMap = new Map(
    unlocks.map((u) => [u.module_id, u.unlocked_at])
  )

  let currentFound = false

  return routeModules.map((mod, index) => {
    // Module 1 (index 0) is always unlocked
    const isUnlocked = index === 0 || unlockMap.has(mod.id)
    const completedAt = completionMap.get(mod.id)
    const isCompleted = !!completedAt
    const unlockDate = unlockMap.get(mod.id)

    // Submodule progress
    const subProgress = submoduleCounts[mod.id] ?? { total: 0, completed: 0 }
    const progressPercent = subProgress.total > 0
      ? Math.round((subProgress.completed / subProgress.total) * 100)
      : (isCompleted ? 100 : 0)

    let status: ModuleWithStatus["status"]

    if (isCompleted) {
      status = "completed"
    } else if (isUnlocked && !currentFound) {
      status = "current"
      currentFound = true
    } else if (isUnlocked) {
      status = "current"
    } else {
      // Check if this is the next one to unlock
      const prevUnlocked = index === 0 || unlockMap.has(routeModules[index - 1]?.id)
      status = prevUnlocked ? "locked_next" : "locked_future"
    }

    return {
      ...mod,
      status,
      unlock_date: unlockDate ? new Date(unlockDate) : null,
      completed_at: completedAt,
      progress_percent: progressPercent,
      submodules_total: subProgress.total,
      submodules_completed: subProgress.completed,
    }
  })
}

/**
 * Determines which modules should be unlocked based on access/entry logic.
 *
 * New logic (Correction 1):
 * - Module 1: always unlocked
 * - When Module 1 is accessed (unlocked), Module 2 unlocks
 * - Completing a module (2 through penultimate-1) unlocks the next
 * - Entering the penultimate module unlocks "Cierre de ciclo"
 *
 * For backwards compatibility, we also keep the Monday-based system
 * as a fallback.
 */
export function getModulesToUnlock(
  routeModules: Module[],
  existingUnlocks: PatientModuleUnlock[],
  registeredAt: string,
  completions: ModuleCompletion[] = [],
  accessedModuleIds: string[] = []
): string[] {
  const unlockSet = new Set(existingUnlocks.map((u) => u.module_id))
  const completionSet = new Set(completions.map((c) => c.module_id))
  const accessedSet = new Set(accessedModuleIds)
  const newUnlocks: string[] = []

  if (routeModules.length === 0) return newUnlocks

  // Module 1 is always unlocked
  if (!unlockSet.has(routeModules[0].id)) {
    newUnlocks.push(routeModules[0].id)
    unlockSet.add(routeModules[0].id)
  }

  // When Module 1 is accessed/unlocked, unlock Module 2
  if (routeModules.length > 1) {
    const mod1 = routeModules[0]
    if ((unlockSet.has(mod1.id) || accessedSet.has(mod1.id)) && !unlockSet.has(routeModules[1].id)) {
      newUnlocks.push(routeModules[1].id)
      unlockSet.add(routeModules[1].id)
    }
  }

  // For modules 2 through the end: completing one unlocks the next
  for (let i = 1; i < routeModules.length - 1; i++) {
    const currentMod = routeModules[i]
    const nextMod = routeModules[i + 1]

    if (completionSet.has(currentMod.id) && !unlockSet.has(nextMod.id)) {
      newUnlocks.push(nextMod.id)
      unlockSet.add(nextMod.id)
    }
  }

  // Special rule: entering the penultimate module unlocks the last (Cierre)
  if (routeModules.length >= 2) {
    const penultimate = routeModules[routeModules.length - 2]
    const last = routeModules[routeModules.length - 1]

    if ((accessedSet.has(penultimate.id) || unlockSet.has(penultimate.id)) && !unlockSet.has(last.id)) {
      // Only unlock cierre if the penultimate is actually accessed (unlocked counts as accessed)
      if (unlockSet.has(penultimate.id)) {
        newUnlocks.push(last.id)
        unlockSet.add(last.id)
      }
    }
  }

  // Fallback: Monday-based progressive unlock (keeps existing behavior working)
  const now = new Date()
  let regDate = new Date(registeredAt)
  if (isNaN(regDate.getTime())) {
    regDate = new Date()
  }

  let mondayCount = 0
  const checkDate = new Date(regDate)
  let loopCount = 0
  while (checkDate.getDay() !== 1 && loopCount < 7) {
    checkDate.setDate(checkDate.getDate() + 1)
    loopCount++
  }
  while (checkDate <= now) {
    mondayCount++
    checkDate.setDate(checkDate.getDate() + 7)
  }

  const maxUnlocked = 1 + mondayCount
  for (let i = 1; i < routeModules.length && i < maxUnlocked; i++) {
    // Don't auto-unlock "Cierre de ciclo" (last module) via Monday system
    const isLastModule = i === routeModules.length - 1
    if (isLastModule) continue

    if (!unlockSet.has(routeModules[i].id)) {
      newUnlocks.push(routeModules[i].id)
      unlockSet.add(routeModules[i].id)
    }
  }

  return newUnlocks
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

/**
 * Returns the name of next Monday
 */
export function getNextMonday(): Date {
  const now = new Date()
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7
  const nextMon = new Date(now)
  nextMon.setDate(now.getDate() + daysUntilMonday)
  nextMon.setHours(0, 0, 0, 0)
  return nextMon
}

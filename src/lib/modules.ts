import type { Module, ModuleCompletion, ModuleWithStatus, PatientComponent, PatientModuleUnlock } from "@/types/database"

/**
 * Component key mapping from component names to module component_keys
 */
const COMPONENT_NAME_TO_KEY: Record<string, string> = {
  'Acceso a medicamentos': 'adherencia',
  'Nicotina': 'nicotina',
  'Glucosa': 'glucosa',
  'Alimentación': 'alimentacion',
  'Actividad física': 'actividad_fisica',
  'Adherencia': 'adherencia',
  'Colesterol': 'colesterol',
  'Red de apoyo': 'red_de_apoyo',
  'Peso': 'peso',
  'Sueño': 'sueno',
  'Salud mental': 'salud_mental',
  'Empoderamiento': 'empowerment',
  'Presión arterial': 'presion_arterial',
}

/**
 * Builds the personalized route for a patient:
 * 1. Module 1 (empowerment) — always first
 * 2. Component 1 module (patient selected)
 * 3. Component 2 module (patient selected)
 * 4. Component 3 module (patient selected)
 * 5. Salud Sexual module — always last
 */
export function buildPersonalizedRoute(
  allModules: Module[],
  patientComponents: PatientComponent[]
): Module[] {
  if (patientComponents.length === 0) {
    // If no components selected yet, only show Module 1
    const mod1 = allModules.find((m) => m.order === 1)
    return mod1 ? [mod1] : []
  }

  const route: Module[] = []

  // 1. Module 1 (empowerment)
  const mod1 = allModules.find((m) => m.component_key === 'empowerment' || m.order === 1)
  if (mod1) route.push(mod1)

  // 2-4. Selected components (in priority order)
  const sortedComponents = [...patientComponents]
    .filter((c) => c.priority_order <= 3)
    .sort((a, b) => a.priority_order - b.priority_order)

  for (const comp of sortedComponents) {
    const key = COMPONENT_NAME_TO_KEY[comp.component_name]
    if (key) {
      const mod = allModules.find((m) => m.component_key === key && m.id !== mod1?.id)
      if (mod) route.push(mod)
    }
  }

  // 5. Salud Sexual — always at the end
  const saludSexual = allModules.find((m) => m.component_key === 'salud_sexual')
  if (saludSexual && !route.find((m) => m.id === saludSexual.id)) {
    route.push(saludSexual)
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
 * Calculates module unlock status based on Monday-progressive unlocking.
 * 
 * Logic:
 * - Module 1: always unlocked immediately
 * - Each subsequent Monday: unlock the next module in the route
 * - Unlocking is NOT dependent on completing the previous module
 * - Unlocking is tracked via patient_module_unlocks table
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
      // Check if this is the next one to unlock (next Monday)
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
 * Determines which modules should be unlocked on login.
 * Called on every login — if it's Monday and there are pending modules, unlock the next one.
 * Returns the list of module IDs that should be newly unlocked.
 */
export function getModulesToUnlock(
  routeModules: Module[],
  existingUnlocks: PatientModuleUnlock[],
  registeredAt: string
): string[] {
  const unlockSet = new Set(existingUnlocks.map((u) => u.module_id))
  const newUnlocks: string[] = []

  // Module 1 is always unlocked
  if (routeModules.length > 0 && !unlockSet.has(routeModules[0].id)) {
    newUnlocks.push(routeModules[0].id)
    unlockSet.add(routeModules[0].id)
  }

  const now = new Date()
  let regDate = new Date(registeredAt)
  
  // Safe fallback if date is completely invalid to prevent infinite loops
  if (isNaN(regDate.getTime())) {
    regDate = new Date()
  }

  // Count how many Mondays have passed since registration
  let mondayCount = 0
  const checkDate = new Date(regDate)
  
  // Move to first Monday after registration (circuit breaker at 7 days to guarantee safety)
  let loopCount = 0
  while (checkDate.getDay() !== 1 && loopCount < 7) {
    checkDate.setDate(checkDate.getDate() + 1)
    loopCount++
  }
  
  // Count Mondays
  while (checkDate <= now) {
    mondayCount++
    checkDate.setDate(checkDate.getDate() + 7)
  }

  // We can unlock up to (1 + mondayCount) modules total
  // Module 1 is the base (already counted), then one more per Monday
  const maxUnlocked = 1 + mondayCount

  for (let i = 1; i < routeModules.length && i < maxUnlocked; i++) {
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

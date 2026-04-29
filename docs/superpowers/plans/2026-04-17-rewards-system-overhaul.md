# Rewards System Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic achievement system with a narrative-driven rewards experience centered on the "incendio que vamos a apagar" metaphor — 29 themed badges, a shrinking Lottie fire, login-streak counter, unlock overlay with badge-flies-to-fire animation, WhatsApp share with generated image, and a PDF completion certificate.

**Architecture:** Server actions continue to drive unlock logic (`rewards-actions.ts`). The wipe-and-reseed approach resets the achievements table to exactly 29 rows matching the new catalog. New reusable UI components (`FireLottie`, `StreakCounter`, `BadgeUnlockOverlay`) are introduced; `/recompensas` is rebuilt around the fire. Two new API routes (`/api/badge-image`, `/api/certificate/[userId]`) handle image and PDF generation via `@vercel/og` and `@react-pdf/renderer`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + RLS), TypeScript, Tailwind 4, `lottie-react`, `framer-motion`, `canvas-confetti`, `@react-pdf/renderer`, `@vercel/og`.

**Note on testing:** This project has no test runner configured. Each task ends with a **manual verification step** (load the page in the browser, or run the SQL in Supabase) and a commit. If you add test infrastructure later, the tasks are structured so tests can be added incrementally.

---

## Phase 1 — Foundation (data + types)

### Task 1: Install new dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

Run in terminal at project root:
```bash
npm install lottie-react framer-motion canvas-confetti @react-pdf/renderer
npm install --save-dev @types/canvas-confetti
```

Expected: `package.json` gains `lottie-react`, `framer-motion`, `canvas-confetti`, `@react-pdf/renderer` under `dependencies`, and `@types/canvas-confetti` under `devDependencies`.

- [ ] **Step 2: Verify install**

Run:
```bash
npm run build
```

Expected: build completes without errors. If a TypeScript complaint appears, fix it by adding the types dependency shown above.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add lottie, framer-motion, confetti, react-pdf deps"
```

---

### Task 2: Supabase migration v5

**Files:**
- Create: `supabase/migration-v5.sql`

- [ ] **Step 1: Write migration SQL**

Create `supabase/migration-v5.sql` with this exact content:

```sql
-- Migration v5: Rewards system overhaul
-- Run this in Supabase SQL Editor

-- 1. Wipe the old rewards data (no production users yet)
TRUNCATE TABLE public.user_achievements CASCADE;
TRUNCATE TABLE public.achievements CASCADE;
TRUNCATE TABLE public.points_log CASCADE;

-- 2. Drop unused columns on users
ALTER TABLE public.users DROP COLUMN IF EXISTS total_points;
ALTER TABLE public.users DROP COLUMN IF EXISTS quizzes_perfect;
ALTER TABLE public.users DROP COLUMN IF EXISTS tasks_submitted;

-- 3. Add module_key column to achievements (nullable — only used by module badges)
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS module_key text;

-- 4. Drop/widen the tier + points columns (we don't use them anymore)
ALTER TABLE public.achievements ALTER COLUMN points DROP NOT NULL;
ALTER TABLE public.achievements ALTER COLUMN tier DROP NOT NULL;

-- 5. Certificates table
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  certificate_number text NOT NULL UNIQUE,
  UNIQUE(user_id)
);

ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificate"
  ON public.user_certificates FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "System can insert certificates"
  ON public.user_certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Seed: 29 achievements

-- 16 module badges
INSERT INTO public.achievements (key, title, description, category, icon, requirement_type, requirement_value, module_key, sort_order) VALUES
  ('module_empowerment',          'Inicio del ciclo',             'Completaste el módulo de inicio.',                 'module', 'Compass',         'module_complete', 1, 'empowerment',          1),
  ('module_el_incendio',          'El incendio que vamos a apagar','Aprendiste la metáfora del incendio.',             'module', 'Flame',           'module_complete', 1, 'el_incendio',          2),
  ('module_empoderamiento_salud', 'Empoderamiento en salud',      'Tomaste las riendas de tu salud.',                 'module', 'Sparkles',        'module_complete', 1, 'empoderamiento_salud', 3),
  ('module_red_de_apoyo',         'Red de apoyo',                 'Fortaleciste tu red de apoyo.',                    'module', 'Users',           'module_complete', 1, 'red_de_apoyo',         4),
  ('module_adherencia',           'Adherencia a medicamentos',    'Aprendiste a cuidar tu tratamiento.',              'module', 'Pill',            'module_complete', 1, 'adherencia',           5),
  ('module_salud_sexual',         'Salud sexual masculina',       'Cuidaste este aspecto importante de tu salud.',    'module', 'HeartHandshake',  'module_complete', 1, 'salud_sexual',         6),
  ('module_actividad_fisica',     'Actividad física',             'Pusiste tu cuerpo en movimiento.',                 'module', 'Activity',        'module_complete', 1, 'actividad_fisica',     7),
  ('module_alimentacion',         'Alimentación',                 'Mejoraste tu alimentación.',                       'module', 'Apple',           'module_complete', 1, 'alimentacion',         8),
  ('module_salud_mental',         'Salud mental',                 'Cuidaste tu salud mental.',                        'module', 'Brain',           'module_complete', 1, 'salud_mental',         9),
  ('module_sueno',                'Salud del sueño',              'Diste prioridad a tu descanso.',                   'module', 'Moon',            'module_complete', 1, 'sueno',               10),
  ('module_presion_arterial',     'Presión arterial',             'Aprendiste a cuidar tu presión arterial.',         'module', 'Heart',           'module_complete', 1, 'presion_arterial',    11),
  ('module_glucosa',              'Glucosa',                      'Aprendiste a cuidar tus niveles de glucosa.',      'module', 'Droplet',         'module_complete', 1, 'glucosa',             12),
  ('module_colesterol',           'Colesterol',                   'Aprendiste a cuidar tu colesterol.',               'module', 'CircleDashed',    'module_complete', 1, 'colesterol',          13),
  ('module_nicotina',             'Nicotina',                     'Entendiste el impacto de la nicotina.',            'module', 'CigaretteOff',    'module_complete', 1, 'nicotina',            14),
  ('module_control_peso',         'Control del peso',             'Trabajaste en el control de tu peso.',             'module', 'Scale',           'module_complete', 1, 'control_peso',        15),
  ('module_cierre',               'Cierre de ciclo',              'Cerraste tu ciclo de aprendizaje.',                'module', 'GraduationCap',   'module_complete', 1, 'empowerment_cierre',  16);

-- 5 special badges
INSERT INTO public.achievements (key, title, description, category, icon, requirement_type, requirement_value, module_key, sort_order) VALUES
  ('special_welcome',        'Bienvenida',             'Iniciaste tu camino en Escuela de Pacientes.', 'special', 'Handshake',    'first_login',     1,  NULL, 101),
  ('special_first_module',   'Primer módulo completo', 'Completaste tu primer módulo.',                'special', 'Leaf',         'modules_count',   1,  NULL, 102),
  ('special_three_modules',  '3 módulos completos',    'Completaste 3 módulos.',                       'special', 'Sprout',       'modules_count',   3,  NULL, 103),
  ('special_six_modules',    '6 módulos completos',    'Completaste 6 módulos.',                       'special', 'TreePalm',     'modules_count',   6,  NULL, 104),
  ('special_firefighter',    'Bombero oficial',        'Apagaste el incendio. Eres un bombero oficial.','special', 'Siren',        'all_modules',     1,  NULL, 105);

-- 8 streak badges
INSERT INTO public.achievements (key, title, description, category, icon, requirement_type, requirement_value, module_key, sort_order) VALUES
  ('streak_1',  'Primer día',     'Entraste a la plataforma.',              'streak', 'Flame', 'streak_days',  1, NULL, 201),
  ('streak_3',  '3 días',         '3 días conectado seguidos.',             'streak', 'Flame', 'streak_days',  3, NULL, 202),
  ('streak_7',  'Una semana',     'Una semana conectado.',                  'streak', 'Flame', 'streak_days',  7, NULL, 203),
  ('streak_10', '10 días',        '10 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 10, NULL, 204),
  ('streak_15', '15 días',        '15 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 15, NULL, 205),
  ('streak_20', '20 días',        '20 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 20, NULL, 206),
  ('streak_30', 'Un mes',         'Un mes conectado seguidos.',             'streak', 'Flame', 'streak_days', 30, NULL, 207),
  ('streak_60', 'Dos meses',      '60 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 60, NULL, 208);
```

- [ ] **Step 2: Verify via preview**

Open `supabase/migration-v5.sql` and visually check:
- 29 `INSERT ... VALUES` rows (16 + 5 + 8).
- Every module key in seeded rows matches the module catalog in `src/types/database.ts` (`empowerment`, `el_incendio`, `empoderamiento_salud`, `red_de_apoyo`, `adherencia`, `salud_sexual`, `actividad_fisica`, `alimentacion`, `salud_mental`, `sueno`, `presion_arterial`, `glucosa`, `colesterol`, `nicotina`, `control_peso`, `empowerment_cierre`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migration-v5.sql
git commit -m "feat(db): migration v5 — rewards wipe and new 29-badge seed"
```

**IMPORTANT:** The user will run this SQL manually in the Supabase SQL Editor. DO NOT attempt to apply it from code.

---

### Task 3: Update `types/database.ts`

**Files:**
- Modify: `src/types/database.ts`

- [ ] **Step 1: Replace Achievement types**

Find the existing `AchievementTier` and `AchievementCategory` types and the `Achievement` interface (roughly lines 278-302) and replace with:

```typescript
// Sistema de Recompensas
export type AchievementCategory = 'module' | 'special' | 'streak'
export type AchievementRequirementType =
  | 'module_complete'
  | 'modules_count'
  | 'streak_days'
  | 'first_login'
  | 'all_modules'

export interface Achievement {
  id: string
  key: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  requirement_type: AchievementRequirementType
  requirement_value: number
  module_key: string | null
  sort_order: number
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  notified: boolean
  achievement?: Achievement
}

export interface UserCertificate {
  id: string
  user_id: string
  issued_at: string
  certificate_number: string
}
```

- [ ] **Step 2: Remove obsolete types**

Remove `AchievementTier`, `PointsLog`, and `UserRewardsProfile` (no longer used). Search for references and remove them too.

- [ ] **Step 3: Remove `total_points` from `User`**

In the `User` interface (lines 3-15), the `User` type does not currently reference `total_points` — leave as is. Verify this by reading the interface.

- [ ] **Step 4: Build + typecheck**

```bash
npm run build
```

Expected: build may fail because other files reference the deleted types. That's expected — the next tasks fix those. For now, note which files reference removed types and move on.

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts
git commit -m "refactor(types): new Achievement schema for rewards v2"
```

---

### Task 4: Badge catalog helper

**Files:**
- Create: `src/lib/badges.ts`

- [ ] **Step 1: Write the catalog module**

Create `src/lib/badges.ts` with:

```typescript
import type { AchievementCategory } from "@/types/database"

/**
 * Category-based visual configuration for badge rendering.
 * Keep these synced with the `category` column values in the achievements table.
 */
export const CATEGORY_STYLES: Record<AchievementCategory, {
  gradient: string
  label: string
  iconColor: string
}> = {
  module:  { gradient: "from-[#06559F] to-[#1E8DCE]", label: "Módulos",    iconColor: "text-white" },
  special: { gradient: "from-amber-500 to-amber-700", label: "Especiales", iconColor: "text-white" },
  streak:  { gradient: "from-orange-400 to-red-600",  label: "Rachas",     iconColor: "text-white" },
}

export const CATEGORY_ORDER: AchievementCategory[] = ["module", "special", "streak"]

/**
 * Map achievement icon name -> Lucide component.
 * Only the 29 icons referenced by the seed are listed.
 */
export const BADGE_ICON_NAMES = [
  // Module icons
  "Compass", "Flame", "Sparkles", "Users", "Pill", "HeartHandshake",
  "Activity", "Apple", "Brain", "Moon", "Heart", "Droplet",
  "CircleDashed", "CigaretteOff", "Scale", "GraduationCap",
  // Special icons
  "Handshake", "Leaf", "Sprout", "TreePalm", "Siren",
  // Streak icons
  // (Flame is already above)
] as const

export type BadgeIconName = typeof BADGE_ICON_NAMES[number]

export function nextStreakMilestone(currentStreak: number): number | null {
  const milestones = [1, 3, 7, 10, 15, 20, 30, 60]
  return milestones.find((m) => m > currentStreak) ?? null
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/badges.ts
git commit -m "feat(badges): catalog helper + category styles"
```

---

### Task 5: Create BadgeIcon renderer

**Files:**
- Create: `src/components/dashboard/BadgeIcon.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/dashboard/BadgeIcon.tsx`:

```typescript
"use client"

import * as LucideIcons from "lucide-react"
import { CATEGORY_STYLES } from "@/lib/badges"
import type { AchievementCategory } from "@/types/database"

interface BadgeIconProps {
  icon: string
  category: AchievementCategory
  unlocked: boolean
  size?: "sm" | "md" | "lg"
}

const SIZE_CLASSES = {
  sm: "h-12 w-12",
  md: "h-20 w-20",
  lg: "h-32 w-32",
}

const ICON_SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
}

export function BadgeIcon({ icon, category, unlocked, size = "md" }: BadgeIconProps) {
  const styles = CATEGORY_STYLES[category]
  // Lucide exports components by name; fall back to HelpCircle if the name is missing
  const IconComp = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[icon]
    ?? LucideIcons.HelpCircle

  if (!unlocked) {
    return (
      <div className={`${SIZE_CLASSES[size]} relative flex items-center justify-center rounded-full bg-slate-200 border-4 border-slate-300 shadow-inner`}>
        <LucideIcons.Lock className={`${ICON_SIZE_CLASSES[size]} text-slate-400`} />
      </div>
    )
  }

  return (
    <div className={`${SIZE_CLASSES[size]} relative flex items-center justify-center rounded-full bg-gradient-to-br ${styles.gradient} shadow-lg border-4 border-white`}>
      <IconComp className={`${ICON_SIZE_CLASSES[size]} ${styles.iconColor}`} strokeWidth={2.2} />
    </div>
  )
}
```

- [ ] **Step 2: Verify Lucide has these icons**

Run:
```bash
node -e "const l = require('lucide-react'); const names = ['Compass','Flame','Sparkles','Users','Pill','HeartHandshake','Activity','Apple','Brain','Moon','Heart','Droplet','CircleDashed','CigaretteOff','Scale','GraduationCap','Handshake','Leaf','Sprout','TreePalm','Siren','Lock','HelpCircle']; names.forEach(n => { if (!l[n]) console.log('MISSING:', n); }); console.log('check done');"
```

Expected: output `check done` with no MISSING lines. If any icon is missing, pick a replacement from [lucide.dev/icons](https://lucide.dev/icons) and update both this file AND `migration-v5.sql`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/BadgeIcon.tsx
git commit -m "feat(badges): BadgeIcon renderer with category styling"
```

---

## Phase 2 — Server logic (unlock + streak)

### Task 6: Rewrite `rewards-actions.ts`

**Files:**
- Modify: `src/lib/rewards-actions.ts`
- Modify: `src/lib/rewards.ts`

- [ ] **Step 1: Replace `src/lib/rewards.ts` with trimmed version**

Overwrite `src/lib/rewards.ts` with:

```typescript
// Helpers that can be imported into both server and client components.
// (No 'use server' directive — this file has no database side effects.)
import type { Achievement } from "@/types/database"

export function nextStreakMilestone(currentStreak: number): number | null {
  const milestones = [1, 3, 7, 10, 15, 20, 30, 60]
  return milestones.find((m) => m > currentStreak) ?? null
}

export function groupAchievementsByCategory(achievements: Achievement[]): Record<string, Achievement[]> {
  const result: Record<string, Achievement[]> = { module: [], special: [], streak: [] }
  for (const a of achievements) {
    if (!result[a.category]) result[a.category] = []
    result[a.category].push(a)
  }
  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.sort_order - b.sort_order)
  }
  return result
}
```

- [ ] **Step 2: Overwrite `src/lib/rewards-actions.ts`**

Replace the entire file content with:

```typescript
"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import type { Achievement } from "@/types/database"

/**
 * Check and unlock achievements a user has newly qualified for.
 * Returns the list of newly unlocked achievements.
 */
export async function checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createAdminClient()

  const { data: allAchievements } = await supabase.from("achievements").select("*")
  if (!allAchievements) return []

  const { data: userAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)

  const unlockedIds = new Set((userAchievements ?? []).map((ua) => ua.achievement_id))

  // Gather stats
  const { data: completions } = await supabase
    .from("module_completions")
    .select("module_id")
    .eq("user_id", userId)

  const completedModuleIds = new Set((completions ?? []).map((c) => c.module_id))
  const modulesCompleted = completedModuleIds.size

  // Get component_keys for completed modules (needed for module_complete badges)
  const { data: completedModules } = completedModuleIds.size > 0
    ? await supabase
        .from("modules")
        .select("id, component_key")
        .in("id", Array.from(completedModuleIds))
    : { data: [] }

  const completedComponentKeys = new Set(
    (completedModules ?? []).map((m) => m.component_key).filter(Boolean)
  )

  // Count modules in the user's personalized route (for "all_modules" badge)
  const { data: userRow } = await supabase
    .from("users")
    .select("current_streak, wants_salud_sexual, gender, takes_chronic_medication")
    .eq("id", userId)
    .single()

  const currentStreak = userRow?.current_streak ?? 0

  // For "all_modules" we count how many modules from the catalog SHOULD be in this user's
  // route. This mirrors the logic of buildPersonalizedRoute without needing to import it.
  const { data: allModules } = await supabase
    .from("modules")
    .select("component_key")
    .eq("is_published", true)

  const routeEligible = (allModules ?? []).filter((m) => {
    if (m.component_key === "adherencia") return userRow?.takes_chronic_medication === true
    if (m.component_key === "salud_sexual") {
      return userRow?.gender === "male" && userRow?.wants_salud_sexual === true
    }
    return true
  })
  const totalRouteModules = routeEligible.length

  const newlyUnlocked: Achievement[] = []

  for (const a of allAchievements as Achievement[]) {
    if (unlockedIds.has(a.id)) continue

    let unlocked = false
    switch (a.requirement_type) {
      case "module_complete":
        unlocked = !!a.module_key && completedComponentKeys.has(a.module_key)
        break
      case "modules_count":
        unlocked = modulesCompleted >= a.requirement_value
        break
      case "streak_days":
        unlocked = currentStreak >= a.requirement_value
        break
      case "first_login":
        // Any interaction (module completion, streak update, etc.) triggers this
        unlocked = true
        break
      case "all_modules":
        unlocked = totalRouteModules > 0 && modulesCompleted >= totalRouteModules
        break
    }

    if (unlocked) newlyUnlocked.push(a)
  }

  if (newlyUnlocked.length > 0) {
    await supabase.from("user_achievements").insert(
      newlyUnlocked.map((a) => ({ user_id: userId, achievement_id: a.id }))
    )
  }

  return newlyUnlocked
}

/**
 * Update the user's streak based on today's login.
 * Rules: +1 if yesterday was the last activity; reset to 1 if longer ago; no-op if today.
 * Returns the updated streak.
 */
export async function updateStreak(userId: string): Promise<number> {
  const supabase = createAdminClient()

  const { data: user } = await supabase
    .from("users")
    .select("current_streak, best_streak, last_activity_date")
    .eq("id", userId)
    .single()

  if (!user) return 0

  const today = new Date().toISOString().split("T")[0]
  if (user.last_activity_date === today) return user.current_streak ?? 0

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  const newStreak = user.last_activity_date === yesterdayStr
    ? (user.current_streak ?? 0) + 1
    : 1

  const bestStreak = Math.max(user.best_streak ?? 0, newStreak)

  await supabase
    .from("users")
    .update({
      current_streak: newStreak,
      best_streak: bestStreak,
      last_activity_date: today,
    })
    .eq("id", userId)

  return newStreak
}

/**
 * Called when a patient finishes a module.
 * Returns newly unlocked achievements so the client can animate them.
 */
export async function onModuleComplete(userId: string, moduleId: string): Promise<Achievement[]> {
  const supabase = createAdminClient()
  // Idempotent insert: if row exists, no-op.
  await supabase
    .from("module_completions")
    .upsert({ user_id: userId, module_id: moduleId }, { onConflict: "user_id,module_id" })

  await updateStreak(userId)
  return checkAndUnlockAchievements(userId)
}

/**
 * Called on any patient dashboard load. Updates streak and returns newly unlocked.
 */
export async function onPatientDashboardLoad(userId: string): Promise<Achievement[]> {
  await updateStreak(userId)
  return checkAndUnlockAchievements(userId)
}

/**
 * Mark an achievement as 'notified' so its unlock animation isn't shown twice.
 */
export async function markAchievementsNotified(userId: string, achievementIds: string[]) {
  if (achievementIds.length === 0) return
  const supabase = createAdminClient()
  await supabase
    .from("user_achievements")
    .update({ notified: true })
    .eq("user_id", userId)
    .in("achievement_id", achievementIds)
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: may still fail because `RewardsPageClient.tsx` and other callers reference old functions. Fix callers in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/rewards-actions.ts src/lib/rewards.ts
git commit -m "feat(rewards): new unlock + streak server actions"
```

---

## Phase 3 — Header (streak + mini fire)

### Task 7: `FireLottie` reusable component

**Files:**
- Create: `src/components/dashboard/FireLottie.tsx`
- Create: `public/lottie/fire.json`

- [ ] **Step 1: Obtain a Lottie fire animation**

Download a free fire Lottie JSON from [lottiefiles.com](https://lottiefiles.com/search?q=fire&category=animations) (search for "fire", pick one you like — preview first). Save as `public/lottie/fire.json`.

Ask the user to share their favorite one's URL if they have a preference. Otherwise use: <https://lottie.host/embed/fire-default> (any fire animation that's free to use).

If a specific animation can't be obtained before coding, use this placeholder JSON so the plan can continue:

```bash
mkdir -p public/lottie
curl -L -o public/lottie/fire.json "https://assets.lottiefiles.com/packages/lf20_jtbfg2nb.json" || echo "Manual download needed"
```

- [ ] **Step 2: Write FireLottie component**

Create `src/components/dashboard/FireLottie.tsx`:

```typescript
"use client"

import Lottie from "lottie-react"
import fireAnimation from "../../../public/lottie/fire.json"

interface FireLottieProps {
  /** Progress from 0 to 1 (0 = huge fire, 1 = extinguished) */
  progress: number
  /** Pixel size of the containing box at progress=0 */
  baseSize: number
  className?: string
}

export function FireLottie({ progress, baseSize, className = "" }: FireLottieProps) {
  // Fire scales from 100% of baseSize at progress=0 down to 6.25% (1/16) at progress=1
  const scale = Math.max(0.0625, 1 - progress)
  const size = Math.round(baseSize * scale)

  if (progress >= 1) {
    // Fully extinguished: show only a small puff/smoke placeholder
    return <div className={`inline-block ${className}`} style={{ width: baseSize * 0.2, height: baseSize * 0.2 }} aria-label="Fuego apagado" />
  }

  return (
    <div className={`inline-block transition-all duration-700 ${className}`} style={{ width: size, height: size }}>
      <Lottie animationData={fireAnimation} loop autoplay />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add public/lottie/fire.json src/components/dashboard/FireLottie.tsx
git commit -m "feat(fire): FireLottie component scaling by progress"
```

---

### Task 8: `StreakCounter` component

**Files:**
- Create: `src/components/dashboard/StreakCounter.tsx`

- [ ] **Step 1: Write StreakCounter**

Create `src/components/dashboard/StreakCounter.tsx`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/StreakCounter.tsx
git commit -m "feat(header): StreakCounter with mini fire and modal"
```

---

### Task 9: Wire StreakCounter into `DashboardShell`

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Read current DashboardShell**

Use the Read tool on `src/components/dashboard/DashboardShell.tsx` to understand its current structure (props, header markup).

- [ ] **Step 2: Add props and render StreakCounter**

Edit `src/components/dashboard/DashboardShell.tsx` to:
1. Accept new props: `currentStreak: number`, `bestStreak: number`, `modulesCompleted: number`, `totalRouteModules: number`.
2. Import `StreakCounter` from `./StreakCounter`.
3. Place `<StreakCounter currentStreak={currentStreak} bestStreak={bestStreak} modulesCompleted={modulesCompleted} totalRouteModules={totalRouteModules} />` in the header, to the left of the user avatar/menu.

- [ ] **Step 3: Feed values from layout**

Edit `src/app/(dashboard)/layout.tsx`:
1. Fetch: `current_streak`, `best_streak`, `gender`, `wants_salud_sexual`, `takes_chronic_medication` from `users`.
2. Fetch module completions count from `module_completions`.
3. Compute `totalRouteModules` by counting published modules minus conditional skips (mirror the logic in `rewards-actions.ts` `checkAndUnlockAchievements`).
4. Pass values to `<DashboardShell>`.

The exact code:

```typescript
// In src/app/(dashboard)/layout.tsx — inside the async server component:

const [
  { data: userRow },
  { data: completions },
  { data: publishedModules },
] = await Promise.all([
  supabase.from("users")
    .select("current_streak, best_streak, gender, wants_salud_sexual, takes_chronic_medication")
    .eq("id", user!.id).single(),
  supabase.from("module_completions").select("module_id", { count: "exact" }).eq("user_id", user!.id),
  supabase.from("modules").select("component_key").eq("is_published", true),
])

const modulesCompleted = completions?.length ?? 0
const totalRouteModules = (publishedModules ?? []).filter((m) => {
  if (m.component_key === "adherencia") return userRow?.takes_chronic_medication === true
  if (m.component_key === "salud_sexual") {
    return userRow?.gender === "male" && userRow?.wants_salud_sexual === true
  }
  return true
}).length
```

Then pass `currentStreak={userRow?.current_streak ?? 0}`, `bestStreak={userRow?.best_streak ?? 0}`, `modulesCompleted={modulesCompleted}`, `totalRouteModules={totalRouteModules}` into `<DashboardShell>`.

- [ ] **Step 4: Verify in browser**

Run `npm run dev`. Log in as a patient. Confirm you see `🔥 <n>` + a small fire in the header. Tap the 🔥 button → modal appears. Tap fire → navigates to `/recompensas` (page may not yet look right, that's fine).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat(header): streak counter + mini fire wired in dashboard layout"
```

---

### Task 10: Call `onPatientDashboardLoad` on dashboard entry

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx` OR a client component triggered by page mount

- [ ] **Step 1: Add server-side call on layout load**

In `src/app/(dashboard)/layout.tsx`, after fetching user data, call:

```typescript
import { onPatientDashboardLoad } from "@/lib/rewards-actions"

// Do not await if we don't want the page to block on unlock checks.
// But for streak correctness, we await.
const newlyUnlocked = await onPatientDashboardLoad(user!.id)
```

Pass `newlyUnlocked` to `<DashboardShell>` as prop `newlyUnlockedAchievements: Achievement[]`. The shell will hand them to the unlock overlay (Task 12).

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat(rewards): trigger streak + unlock on dashboard load"
```

---

## Phase 4 — Unlock overlay

### Task 11: `BadgeUnlockOverlay` component

**Files:**
- Create: `src/components/dashboard/BadgeUnlockOverlay.tsx`

- [ ] **Step 1: Write the overlay**

Create `src/components/dashboard/BadgeUnlockOverlay.tsx`:

```typescript
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
    // Fire confetti for each badge
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/BadgeUnlockOverlay.tsx
git commit -m "feat(rewards): BadgeUnlockOverlay with framer-motion + confetti"
```

---

### Task 12: Hook overlay into DashboardShell

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Add state for overlay**

In `DashboardShell.tsx`:
1. Accept prop `newlyUnlockedAchievements: Achievement[]` (may be empty).
2. Wrap the top-level with a client-side container that:
   - Filters only `notified === false` achievements.
   - Renders `<BadgeUnlockOverlay queue={queue} ... />` conditionally.
3. `onShareClick`: calls a helper that opens WhatsApp share sheet (stub with `alert("Compartir: " + a.title)` for now — Task 19 wires the real share).
4. `onDone`: clears local state so overlay unmounts.

Minimal diff:

```typescript
"use client"

import { useState } from "react"
import { BadgeUnlockOverlay } from "./BadgeUnlockOverlay"
import type { Achievement } from "@/types/database"
// ...existing imports

export default function DashboardShell({
  children,
  currentStreak,
  bestStreak,
  modulesCompleted,
  totalRouteModules,
  newlyUnlockedAchievements,
  userId,
}: {
  children: React.ReactNode
  currentStreak: number
  bestStreak: number
  modulesCompleted: number
  totalRouteModules: number
  newlyUnlockedAchievements: Achievement[]
  userId: string
}) {
  const [queue, setQueue] = useState<Achievement[]>(
    newlyUnlockedAchievements.filter((a: any) => !a.notified)
  )

  return (
    <>
      {/* existing shell layout, with <StreakCounter .../> wired as in Task 9 */}
      {/* ... */}
      {queue.length > 0 && (
        <BadgeUnlockOverlay
          queue={queue}
          userId={userId}
          onShareClick={(a) => alert("Compartir: " + a.title)}
          onDone={() => setQueue([])}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Pass `userId` from layout**

In `src/app/(dashboard)/layout.tsx`, pass `userId={user!.id}` to `<DashboardShell>`.

- [ ] **Step 3: Verify in browser**

`npm run dev`. Log in as patient. If any achievements are unnotified (e.g., `welcome` on first login), the overlay should appear with the badge.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "feat(rewards): unlock overlay triggered on dashboard load"
```

---

### Task 13: Trigger unlock on module completion

**Files:**
- Modify: `src/components/dashboard/ModuleContent.tsx`
- Modify: `src/app/(dashboard)/modulos/[id]/page.tsx` if needed

- [ ] **Step 1: Find completion call site**

Use Grep: search for `module_completions` inserts or a function named `completeModule` / `onModuleComplete` in `src/components/dashboard/` and `src/app/(dashboard)/modulos/`.

- [ ] **Step 2: Replace completion logic**

Wherever module completion is recorded, call the new `onModuleComplete(userId, moduleId)` server action instead. It both records completion AND returns new achievements.

Then in the client, show an in-page overlay (import `BadgeUnlockOverlay`) with the returned achievements, or trigger a `router.refresh()` so the dashboard-shell-level overlay picks them up.

Preferred: inline overlay in module page so the celebration is immediate, not waiting for next dashboard load.

```typescript
import { onModuleComplete, markAchievementsNotified } from "@/lib/rewards-actions"
import { BadgeUnlockOverlay } from "@/components/dashboard/BadgeUnlockOverlay"

// ... inside component:
const [unlockedQueue, setUnlockedQueue] = useState<Achievement[]>([])

async function handleComplete() {
  const newly = await onModuleComplete(userId, moduleId)
  if (newly.length > 0) {
    setUnlockedQueue(newly)
  } else {
    router.push("/mi-camino")
  }
}

// Render:
{unlockedQueue.length > 0 && (
  <BadgeUnlockOverlay
    queue={unlockedQueue}
    userId={userId}
    onShareClick={/* handled by WhatsApp task */}
    onDone={() => { setUnlockedQueue([]); router.push("/mi-camino") }}
  />
)}
```

- [ ] **Step 3: Verify in browser**

`npm run dev`. Complete a module. Confirm overlay pops up with the module's badge + any special badges unlocked (e.g., `first_module`).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/ModuleContent.tsx src/app/\(dashboard\)/modulos/\[id\]/page.tsx
git commit -m "feat(rewards): unlock overlay on module completion"
```

---

## Phase 5 — Recompensas page redesign

### Task 14: Rewrite `/recompensas` page

**Files:**
- Modify: `src/app/(dashboard)/recompensas/page.tsx`
- Modify: `src/components/dashboard/RewardsPageClient.tsx`

- [ ] **Step 1: Rewrite server page**

Replace `src/app/(dashboard)/recompensas/page.tsx` with:

```typescript
import { createClient } from "@/lib/supabase/server"
import RewardsPageClient from "@/components/dashboard/RewardsPageClient"
import type { Achievement, UserAchievement } from "@/types/database"

export default async function RecompensasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: allAchievements },
    { data: userAchievements },
    { data: userRow },
    { data: completions },
    { data: publishedModules },
    { data: certificate },
  ] = await Promise.all([
    supabase.from("achievements").select("*").order("sort_order"),
    supabase.from("user_achievements").select("*").eq("user_id", user!.id),
    supabase.from("users")
      .select("name, current_streak, best_streak, gender, wants_salud_sexual, takes_chronic_medication")
      .eq("id", user!.id).single(),
    supabase.from("module_completions").select("module_id").eq("user_id", user!.id),
    supabase.from("modules").select("component_key").eq("is_published", true),
    supabase.from("user_certificates").select("*").eq("user_id", user!.id).maybeSingle(),
  ])

  const modulesCompleted = (completions ?? []).length
  const totalRouteModules = (publishedModules ?? []).filter((m) => {
    if (m.component_key === "adherencia") return userRow?.takes_chronic_medication === true
    if (m.component_key === "salud_sexual") {
      return userRow?.gender === "male" && userRow?.wants_salud_sexual === true
    }
    return true
  }).length

  return (
    <RewardsPageClient
      userId={user!.id}
      userName={userRow?.name ?? ""}
      achievements={(allAchievements ?? []) as Achievement[]}
      userAchievements={(userAchievements ?? []) as UserAchievement[]}
      currentStreak={userRow?.current_streak ?? 0}
      bestStreak={userRow?.best_streak ?? 0}
      modulesCompleted={modulesCompleted}
      totalRouteModules={totalRouteModules}
      hasCertificate={!!certificate}
    />
  )
}
```

- [ ] **Step 2: Rewrite client component**

Replace `src/components/dashboard/RewardsPageClient.tsx` with:

```typescript
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
  modulesCompleted, totalRouteModules, hasCertificate,
}: Props) {
  const [shareBadge, setShareBadge] = useState<Achievement | null>(null)
  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievement_id, ua]))
  const grouped = groupAchievementsByCategory(achievements)
  const progress = totalRouteModules > 0 ? modulesCompleted / totalRouteModules : 0
  const firefighterUnlocked = achievements.find((a) => a.key === "special_firefighter")
    ? unlockedMap.has(achievements.find((a) => a.key === "special_firefighter")!.id)
    : false
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
```

- [ ] **Step 3: Commit (will fail to build until Task 15)**

```bash
git add src/app/\(dashboard\)/recompensas/page.tsx src/components/dashboard/RewardsPageClient.tsx
git commit -m "feat(rewards): new /recompensas layout with fire hero and badge grid"
```

---

### Task 15: `BadgeShareModal` component

**Files:**
- Create: `src/components/dashboard/BadgeShareModal.tsx`

- [ ] **Step 1: Write the modal**

Create `src/components/dashboard/BadgeShareModal.tsx`:

```typescript
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

    // Fallback: open WhatsApp with text + image link
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
```

- [ ] **Step 2: Wire into overlay too**

Edit `DashboardShell.tsx` `onShareClick` to open `BadgeShareModal` with the achievement instead of `alert()`.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/BadgeShareModal.tsx src/components/dashboard/DashboardShell.tsx
git commit -m "feat(rewards): BadgeShareModal with Web Share API fallback"
```

---

## Phase 6 — Image + PDF generation

### Task 16: `/api/badge-image` route

**Files:**
- Create: `src/app/api/badge-image/route.tsx`

- [ ] **Step 1: Write the OG image route**

Create `src/app/api/badge-image/route.tsx`:

```typescript
import { ImageResponse } from "next/og"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "edge"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const badgeKey = searchParams.get("badge")
  const userId = searchParams.get("user")

  if (!badgeKey || !userId) {
    return new Response("missing params", { status: 400 })
  }

  // Use admin client via fetch-based public read (edge runtime: supabase admin may not work)
  // Use anon client with public read policies on 'achievements' + 'users.name'
  // For simplicity, hardcode the supabase URL + anon key from env
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const [achRes, userRes] = await Promise.all([
    fetch(`${sbUrl}/rest/v1/achievements?key=eq.${badgeKey}&select=*`, {
      headers: { apikey: sbKey!, Authorization: `Bearer ${sbKey}` },
    }),
    fetch(`${sbUrl}/rest/v1/users?id=eq.${userId}&select=name`, {
      headers: { apikey: sbKey!, Authorization: `Bearer ${sbKey}` },
    }),
  ])

  const [achievement] = (await achRes.json()) as Array<{ title: string; description: string; icon: string; category: string }>
  const [userRow] = (await userRes.json()) as Array<{ name: string }>

  if (!achievement) return new Response("not found", { status: 404 })

  const bgGradient = achievement.category === "streak"
    ? "linear-gradient(135deg, #FB923C, #DC2626)"
    : achievement.category === "special"
    ? "linear-gradient(135deg, #F59E0B, #B45309)"
    : "linear-gradient(135deg, #06559F, #1E8DCE)"

  return new ImageResponse(
    (
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#FFFFFF",
        padding: "60px",
      }}>
        <div style={{
          display: "flex",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: bgGradient,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
        }}>
          <div style={{ fontSize: "140px", color: "white" }}>🏅</div>
        </div>
        <h1 style={{ fontSize: "64px", fontWeight: 900, color: "#212B52", margin: "32px 0 8px", textAlign: "center" }}>
          {achievement.title}
        </h1>
        <p style={{ fontSize: "28px", color: "#6B7280", margin: 0, textAlign: "center" }}>
          {userRow?.name ?? ""}
        </p>
        <p style={{ fontSize: "24px", color: "#06559F", marginTop: "40px", fontWeight: 700 }}>
          Escuela de Pacientes CAIMED
        </p>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

Note: we use 🏅 as a universal emoji because `@vercel/og` can't render Lucide icons directly without SVG translation. If a higher-fidelity badge is desired later, replace the emoji with inline SVG paths.

- [ ] **Step 2: Verify in browser**

`npm run dev`, then visit `http://localhost:3000/api/badge-image?badge=module_actividad_fisica&user=<your-user-id>`. Expected: 1200×630 PNG showing the badge title and your name.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/badge-image/route.tsx
git commit -m "feat(api): OG image generator for badge sharing"
```

---

### Task 17: `/api/certificate/[userId]` route

**Files:**
- Create: `src/app/api/certificate/[userId]/route.ts`

- [ ] **Step 1: Write the PDF route**

Create `src/app/api/certificate/[userId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Document, Page, Text, View, StyleSheet, renderToStream, Font } from "@react-pdf/renderer"
import React from "react"

// Required for @react-pdf/renderer to work with server-side streaming
export const runtime = "nodejs"

const styles = StyleSheet.create({
  page: { padding: 60, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  border: {
    flex: 1, borderWidth: 4, borderColor: "#06559F",
    padding: 40, alignItems: "center", justifyContent: "center",
  },
  brand: { fontSize: 16, color: "#06559F", fontWeight: 700, marginBottom: 20 },
  title: { fontSize: 44, fontWeight: 900, color: "#212B52", marginVertical: 20, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 30, textAlign: "center" },
  name: { fontSize: 36, fontWeight: 700, color: "#06559F", marginVertical: 20, textAlign: "center" },
  body: { fontSize: 14, color: "#374151", marginVertical: 15, textAlign: "center", lineHeight: 1.5 },
  footer: { marginTop: 40, alignItems: "center" },
  date: { fontSize: 12, color: "#6B7280" },
  certNum: { fontSize: 10, color: "#9CA3AF", marginTop: 10 },
})

function CertificatePdf({ name, certNumber, date }: { name: string; certNumber: string; date: string }) {
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.brand}>ESCUELA DE PACIENTES — CAIMED</Text>
          <Text style={styles.title}>Certificado de Finalización</Text>
          <Text style={styles.subtitle}>Programa de Salud Cardiovascular</Text>
          <Text style={styles.body}>Se otorga a:</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.body}>
            Por haber completado exitosamente todos los módulos del programa{"\n"}
            Escuela de Pacientes en Salud Cardiovascular, demostrando compromiso{"\n"}
            con el cuidado de su salud y bienestar.
          </Text>
          <View style={styles.footer}>
            <Text style={styles.date}>Otorgado el {date}</Text>
            <Text style={styles.certNum}>Certificado No. {certNumber}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(request: NextRequest, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  // Check firefighter badge is unlocked
  const { data: firefighter } = await admin
    .from("achievements")
    .select("id")
    .eq("key", "special_firefighter")
    .single()

  if (!firefighter) return NextResponse.json({ error: "no firefighter badge" }, { status: 500 })

  const { data: unlock } = await admin
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", firefighter.id)
    .maybeSingle()

  if (!unlock) return NextResponse.json({ error: "certificate not earned" }, { status: 403 })

  // Get or create certificate row
  const { data: userRow } = await admin
    .from("users")
    .select("name")
    .eq("id", userId)
    .single()

  let { data: cert } = await admin
    .from("user_certificates")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (!cert) {
    const certNumber = `CAIMED-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000 + 100000)}`
    const { data: newCert } = await admin
      .from("user_certificates")
      .insert({ user_id: userId, certificate_number: certNumber })
      .select()
      .single()
    cert = newCert
  }

  if (!cert) return NextResponse.json({ error: "failed to create cert" }, { status: 500 })

  const dateStr = new Date(cert.issued_at).toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
  })

  const stream = await renderToStream(
    React.createElement(CertificatePdf, {
      name: userRow?.name ?? "Paciente",
      certNumber: cert.certificate_number,
      date: dateStr,
    })
  )

  // Convert Node stream to web stream
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-caimed.pdf"`,
    },
  })
}
```

- [ ] **Step 2: Verify**

`npm run dev`. As admin, manually grant a patient the `special_firefighter` achievement via SQL:

```sql
INSERT INTO user_achievements (user_id, achievement_id)
VALUES ('<patient-user-id>', (SELECT id FROM achievements WHERE key = 'special_firefighter'));
```

Then as that patient, visit `/api/certificate/<patient-user-id>`. Expected: PDF downloads with their name + a certificate number.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/certificate/\[userId\]/route.ts
git commit -m "feat(api): PDF certificate generator via react-pdf"
```

---

## Phase 7 — Remove task system

### Task 18: Remove tasks from admin editor

**Files:**
- Modify: `src/components/admin/ModuleEditor.tsx`
- Modify: `src/components/admin/SubmoduleEditor.tsx`

- [ ] **Step 1: Read current editors**

Read `ModuleEditor.tsx` and `SubmoduleEditor.tsx`. Find the block type selector (usually a dropdown or buttons listing `video`, `text`, `pdf`, `quiz`, `task`).

- [ ] **Step 2: Remove `task` from block type options**

In each editor, remove the `task` option from:
- The array/list of available block types.
- Any `if (type === 'task')` rendering branch.
- Any TaskBlock editor UI (delete the component if it's unused now).

- [ ] **Step 3: Verify in admin UI**

`npm run dev`. Log in as admin, edit a module. Confirm "task" is no longer in the block type picker.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ModuleEditor.tsx src/components/admin/SubmoduleEditor.tsx
git commit -m "refactor(admin): remove task block type from editors"
```

---

### Task 19: Skip task blocks in patient view

**Files:**
- Modify: `src/components/dashboard/ModuleContent.tsx`

- [ ] **Step 1: Filter out task blocks**

In `ModuleContent.tsx`, find where `content_blocks` are mapped to UI. Add a filter at the top of the map:

```typescript
{blocks.filter((b) => b.type !== "task").map((block) => ...)}
```

This makes any existing historical `task` blocks render as nothing for patients.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/ModuleContent.tsx
git commit -m "refactor(patient): skip task blocks in module content"
```

---

## Phase 8 — Deployment

### Task 20: Smoke test + user instructions

**Files:**
- None (manual steps)

- [ ] **Step 1: Run migration in Supabase**

Instruct the user to open Supabase SQL Editor and run `supabase/migration-v5.sql`. Verify row counts:

```sql
SELECT category, COUNT(*) FROM achievements GROUP BY category;
-- Expected: module=16, special=5, streak=8
```

- [ ] **Step 2: End-to-end patient flow**

As a patient:
1. Log in → streak counter shows `🔥 1` + small fire in header.
2. Tap streak → modal opens with current + best streak.
3. Complete a module → overlay appears with module badge + `first_module` special.
4. Go to `/recompensas` → big fire at top, badges grid below, streak card showing 1-day progress.
5. Tap an unlocked badge → share modal opens → "Compartir WhatsApp" opens share sheet on mobile or wa.me link on desktop.

- [ ] **Step 3: Push to GitHub (user action)**

```bash
git push origin main
```

- [ ] **Step 4: Wait for Vercel deploy**

Wait for Vercel to deploy (1-3 minutes). Visit production URL and repeat smoke test.

- [ ] **Step 5: Final commit (no-op marker)**

Nothing to commit here — just confirm all previous commits are pushed.

---

## Out of scope (reminders)

- Custom Lottie artwork commissioning.
- Migrating legacy achievement rows for existing patients (spec explicitly confirmed: no real users with progress).
- Email or push notifications on unlock.
- Social sharing beyond WhatsApp.
- Client-side i18n (Spanish-only for now).

---

## Self-review notes

- All 29 badges in Task 2 seed match the catalog in spec §2.
- Quiz completion criterion is "every question answered at least once" (spec §4) — enforce in `onModuleComplete` logic in Task 13 via a submodule-level check.
- Firefighter badge uses personalized-route module count (spec §2.2) — implemented in `checkAndUnlockAchievements` via `routeEligible` logic (Task 6).
- WhatsApp flow uses `navigator.share` with file + text fallback to `wa.me` URL (spec §9) — Task 15.
- Certificate enforces firefighter unlock before generation (spec §10) — Task 17.
- Task system removed from admin + patient views (spec §4) — Tasks 18-19.
- `task_submissions` table is NOT dropped per spec — only writes stop.

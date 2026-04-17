# Rewards System Overhaul — Design Spec

**Date:** 2026-04-17
**Status:** Approved by product (Daniel Jiménez)
**Target:** Escuela de Pacientes CAIMED — patient rewards, badges, streak, and completion certificate

---

## 1. Goals

Replace the current generic achievement system with a thematic, narrative-driven rewards experience centered on the "incendio que vamos a apagar" metaphor. The patient progresses through a cardiovascular health program, and each completed module incrementally extinguishes a large fire. When the fire is fully extinguished, the patient earns a "firefighter" badge and a PDF completion certificate.

The system should:

- Reward every module with a named, themed badge.
- Track daily login streaks with a visible counter and milestone badges.
- Use an animated Lottie fire on both Mi Camino (mini) and Recompensas (large) that shrinks with each module completion.
- Show a celebratory fullscreen overlay when a badge unlocks, with a visual animation of the badge flying to the fire.
- Allow sharing each unlocked badge to WhatsApp with a server-generated image.
- Generate a branded PDF certificate upon full completion.
- Remove the task-submission system entirely.

---

## 2. Badge Catalog

**29 badges in three categories.**

### 2.1 Module badges (16, created dynamically from module `component_key`)

One badge per active published module. Unlocked when module is fully completed (all submodules done + quiz passed, if the module has a quiz).

| Module `component_key`   | Badge title                        | Lucide icon       |
| ------------------------ | ---------------------------------- | ----------------- |
| `empowerment`            | Inicio del ciclo                   | `Compass`         |
| `el_incendio`            | El incendio que vamos a apagar     | `Flame`           |
| `empoderamiento_salud`   | Empoderamiento en salud            | `Sparkles`        |
| `red_de_apoyo`           | Red de apoyo                       | `Users`           |
| `adherencia`             | Adherencia a medicamentos          | `Pill`            |
| `salud_sexual`           | Salud sexual masculina             | `HeartHandshake`  |
| `actividad_fisica`       | Actividad física                   | `Activity`        |
| `alimentacion`           | Alimentación                       | `Apple`           |
| `salud_mental`           | Salud mental                       | `Brain`           |
| `sueno`                  | Salud del sueño                    | `Moon`            |
| `presion_arterial`       | Presión arterial                   | `Heart`           |
| `glucosa`                | Glucosa                            | `Droplet`         |
| `colesterol`             | Colesterol                         | `CircleDashed`    |
| `nicotina`               | Nicotina                           | `CigaretteOff`    |
| `control_peso`           | Control del peso                   | `Scale`           |
| `empowerment_cierre`     | Cierre de ciclo                    | `GraduationCap`   |

### 2.2 Special badges (5)

| Key                   | Title                    | Unlock condition                         | Icon              |
| --------------------- | ------------------------ | ---------------------------------------- | ----------------- |
| `welcome`             | Bienvenida               | First login                              | `Handshake`       |
| `first_module`        | Primer módulo completo   | Complete 1 module                        | `Leaf`            |
| `three_modules`       | 3 módulos completos      | Complete 3 modules                       | `Sprout`          |
| `six_modules`         | 6 módulos completos      | Complete 6 modules                       | `TreePalm`        |
| `firefighter`         | Bombero oficial          | Complete every module in the patient's personalized route | `Siren` |

### 2.3 Streak badges (8)

| Key              | Title              | Unlock condition             | Icon     |
| ---------------- | ------------------ | ---------------------------- | -------- |
| `streak_1`       | Primer día         | 1-day streak                 | `Flame`  |
| `streak_3`       | 3 días conectado   | 3-day streak                 | `Flame`  |
| `streak_7`       | Una semana         | 7-day streak                 | `Flame`  |
| `streak_10`      | 10 días            | 10-day streak                | `Flame`  |
| `streak_15`      | 15 días            | 15-day streak                | `Flame`  |
| `streak_20`      | 20 días            | 20-day streak                | `Flame`  |
| `streak_30`      | Un mes             | 30-day streak                | `Flame`  |
| `streak_60`      | Dos meses          | 60-day streak                | `Flame`  |

### 2.4 Visual style

All badges render as a **medal**: a circular gradient border (color depends on category — blue for modules, amber for special, orange for streak), Lucide icon centered in white, badge title below. Locked badges render in grayscale with a lock overlay.

---

## 3. Data model

### 3.1 Cleanup (wipe)

Since no production users have meaningful progress yet, we wipe the existing rewards data:

```sql
TRUNCATE TABLE user_achievements CASCADE;
TRUNCATE TABLE achievements CASCADE;
TRUNCATE TABLE points_log CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS total_points;
ALTER TABLE users DROP COLUMN IF EXISTS quizzes_perfect;
ALTER TABLE users DROP COLUMN IF EXISTS tasks_submitted;
```

`task_submissions` table is left intact (frozen) but no new writes occur.

### 3.2 `achievements` schema (same structure, new rows)

Seeded with the 29 badges above. Relevant columns:

- `key` (unique text): machine identifier (`module_empowerment`, `special_welcome`, `streak_7`, etc.)
- `title` (text): human-readable name
- `description` (text): sentence describing the unlock condition
- `icon` (text): Lucide icon name (e.g., `"Flame"`)
- `category` (enum): `module` | `special` | `streak`
- `requirement_type` (text): `module_complete` | `modules_count` | `streak_days` | `first_login` | `all_modules`
- `requirement_value` (int): numeric threshold where applicable
- `module_key` (text, nullable): for `module_complete` badges, the `component_key` of the module that triggers the unlock.
- `sort_order` (int): display order within category.

### 3.3 `user_achievements` (unchanged)

Continues to record unlocks with `user_id`, `achievement_id`, `unlocked_at`, `notified`.

### 3.4 New table: `user_certificates`

Prevents regeneration and records when the user first earned the certificate.

```sql
CREATE TABLE user_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  certificate_number text NOT NULL UNIQUE,
  UNIQUE(user_id)
);
```

`certificate_number` is a short readable identifier: `CAIMED-2026-XXXXXX`.

---

## 4. Module completion logic (revised)

Current logic: module is completed via the "complete" button after submodules.

New logic:

- A module is completed when:
  - All submodules have `submodule_completions` rows for the user, AND
  - If the module has a quiz content block, the patient has answered every question in that quiz at least once (`is_correct = true` is NOT required — the intent is learning via feedback, not blocking on mistakes). A quiz is "passed" by attempting every question.
- On completion:
  1. Insert row into `module_completions`.
  2. Run `checkAndUnlockAchievements(userId)` which:
     - Unlocks the module badge (keyed by `module_key` matching module's `component_key`).
     - Unlocks `first_module` / `three_modules` / `six_modules` / `firefighter` if thresholds reached.
  3. Return list of newly unlocked badges to the client for overlay display.

Quiz content blocks are authored per module via the existing admin editor (no new authoring flow). If a module has no quiz, it completes on submodule completion alone.

### Removal of tasks

- `admin/ModuleEditor.tsx`: hide `task` option from block type selector.
- `dashboard/ModuleContent.tsx`: skip rendering any `task` blocks encountered in existing data.
- `rewards-actions.ts`: remove `onTaskSubmit` call sites and the tasks-related branches in achievement checks.
- `task_submissions` table is frozen (not dropped) to preserve history.

---

## 5. Streak logic

Implemented in a server action triggered on patient dashboard load.

```
if last_activity_date == today: no-op
elif last_activity_date == yesterday: current_streak += 1
else: current_streak = 1

best_streak = max(best_streak, current_streak)
last_activity_date = today
```

After update, `checkAndUnlockAchievements` is called to unlock any streak badges whose `requirement_value` is now ≤ `current_streak`.

---

## 6. UI — Dashboard header

**File:** `src/components/dashboard/DashboardShell.tsx`

Add two elements to the right of the header (before the user avatar):

1. **Streak counter**: `🔥 <n>` where `<n>` is `current_streak`. Tappable → modal showing best streak + next streak milestone.
2. **Mini fire**: Lottie fire animation scaled to ~40px. Size dynamically reduced based on `modules_completed / total_modules` ratio. Tappable → navigates to `/recompensas`.

Mobile variant: only shows numbers + fire (no "días" label).

---

## 7. UI — Recompensas page

**File:** `src/app/(dashboard)/recompensas/page.tsx` + `RewardsPageClient.tsx`

Layout top-to-bottom:

1. **Hero section**: large Lottie fire (~300px tall). Under it: "Módulos completados: X/Y". Fire size scales with progress (16 discrete steps).
2. **Streak summary card**: current streak, best streak, progress toward next streak badge.
3. **Badge sections** (three rows):
   - "Mis insignias de módulos" — 16 module badges in grid.
   - "Insignias especiales" — 5 special badges.
   - "Insignias de racha" — 8 streak badges.
4. **Certificate section** (only if firefighter badge is unlocked): hero button "Descargar tu certificado PDF".

Locked badges: grayscale + lock icon. Unlocked: colored + date label. Tap unlocked badge → modal with badge details + "Compartir en WhatsApp" button.

---

## 8. Unlock experience

When `onModuleComplete` returns newly unlocked badges, the client:

1. Opens a **fullscreen overlay** (`framer-motion` `AnimatePresence`).
2. Shows the badge in the center with scale-up + confetti (`canvas-confetti`).
3. Text: "¡Desbloqueaste la insignia de [Title]!"
4. After 1.5s, badge animates toward the fire: if the patient is on Recompensas, it flies to the large fire; on any other page, it flies to the mini fire in the header. The target fire shrinks by 1/total_modules (where total_modules is the size of the patient's personalized route).
5. Two buttons appear: "Compartir en WhatsApp" and "Continuar".

For streak badges, a smaller **toast** appears (no fullscreen), auto-dismisses after 5s, tappable to expand.

For the firefighter badge (all modules completed), a special flow:

- Fullscreen overlay with fire extinguishing animation (Lottie with final frame).
- Firefighter badge + congratulatory message.
- Buttons: "Descargar certificado" + "Compartir en WhatsApp".

---

## 9. WhatsApp share image

**Endpoint:** `GET /api/badge-image?badge=<key>&user=<user_id>`

- Rendered with `@vercel/og` (Edge runtime, near-instant).
- Output: 1200×630 PNG.
- Content: badge icon (large, circular frame), badge title, patient name, unlock date, "Escuela de Pacientes CAIMED" logo + tagline.
- Visual style: matches CAIMED brand (blue `#06559F` accents on white background).

**Client-side share flow:**

```ts
const imageUrl = `/api/badge-image?badge=${badgeKey}&user=${userId}`
const response = await fetch(imageUrl)
const blob = await response.blob()
const file = new File([blob], `${badgeKey}.png`, { type: "image/png" })

if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({
    title: "¡Gané una insignia!",
    text: `¡Desbloqueé la insignia "${title}" en Escuela de Pacientes CAIMED! 🎉`,
    files: [file],
  })
}
```

Fallback for browsers without `navigator.share`: open `https://wa.me/?text=<encoded text + image link>`.

---

## 10. PDF certificate

**Endpoint:** `GET /api/certificate/[userId]` (streams PDF).

- Rendered with `@react-pdf/renderer` (server component, Node runtime).
- Layout:
  - CAIMED logo top center.
  - Large cursive/serif title: "Certificado de Finalización".
  - Subtitle: "Programa Escuela de Pacientes — Salud Cardiovascular".
  - Large patient name (centered, elegant typography).
  - Body: "Ha completado exitosamente los 16 módulos del programa..."
  - Bottom: date + certificate number + CAIMED signature block.
- Colors: CAIMED blue (`#06559F`), white background, minimalist.

Access control: only the user themselves (or admin) can fetch their own certificate. Enforces `firefighter` badge is unlocked before generating.

First generation inserts a row into `user_certificates`; subsequent requests reuse the stored `certificate_number`.

---

## 11. Dependencies to add

- `lottie-react` (already may be installed — check)
- `framer-motion` (likely already installed)
- `canvas-confetti`
- `@react-pdf/renderer`
- `@vercel/og` (bundled with Next.js)

---

## 12. Files touched (high-level)

**New files:**

- `src/app/api/badge-image/route.tsx` — WhatsApp share image generator
- `src/app/api/certificate/[userId]/route.ts` — PDF certificate generator
- `src/components/dashboard/BadgeUnlockOverlay.tsx` — fullscreen animation
- `src/components/dashboard/StreakCounter.tsx` — header streak + mini fire
- `src/components/dashboard/FireLottie.tsx` — reusable fire component
- `src/lib/badges.ts` — new badge catalog + helpers
- `supabase/migration-v5.sql` — wipe + seed new achievements + certificates table

**Modified files:**

- `src/components/dashboard/DashboardShell.tsx` — add streak + mini fire
- `src/app/(dashboard)/recompensas/page.tsx` — new layout
- `src/components/dashboard/RewardsPageClient.tsx` — new layout
- `src/lib/rewards-actions.ts` — new streak + unlock logic
- `src/lib/rewards.ts` — simplified (no tier/discount concept)
- `src/components/admin/ModuleEditor.tsx` — remove task option
- `src/components/dashboard/ModuleContent.tsx` — skip task blocks
- `src/types/database.ts` — update Achievement types

**Deprecated (not removed):**

- `task_submissions` table (frozen)
- `points_log` table (frozen, emptied)

---

## 13. Out of scope

- Commissioning custom Lottie fire artwork (we use a free LottieFiles animation).
- Changing the admin UI beyond removing the task block.
- Migrating or preserving legacy user progress (none exists).
- Automated email notifications on badge unlock.
- Social sharing beyond WhatsApp (Facebook, Twitter).

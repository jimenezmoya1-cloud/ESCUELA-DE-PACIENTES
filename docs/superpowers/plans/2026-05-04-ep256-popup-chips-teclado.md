# EP-2 + EP-5 + EP-6: Popup + Live Chips + Keyboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tres mejoras UX al cuestionario: mover el toast del coach a top-center con cerrar, agregar chips de score en vivo al lado de cada step, y habilitar atajos de teclado por número en grupos Likert/binarios.

**Architecture:**
- Componente nuevo `ScoreChip` reusable, helper `computeChipScore` en `scoring.ts` que reusa el motor existente (consistencia con el PDF).
- Hook nuevo `useKeyboardSelection` global, marcado del DOM con `data-keyboard-group` y `data-key`.
- Cambios localizados en `Questionnaire.tsx` (toast + integración de chips + marcado + auto-focus).

**Tech Stack:** TypeScript, Next.js 16, React 19, Tailwind 4. Sin tests JS — verificación por `npx tsc --noEmit` + `npm run lint` + `npm run build` + Node 24 numerical test + smoke manual.

**Spec source:** `docs/superpowers/specs/2026-05-04-ep256-popup-chips-teclado-design.md`

---

## File Structure

**Modificados (2):**
- `src/components/admin/clinical/Questionnaire.tsx` — TODO: EP-2 (popup ~líneas 1760-1764), EP-5 (helper local + chip render en 12 steps), EP-6 (hook call + auto-focus useEffect + marcado en grupos de 10 steps).
- `src/lib/clinical/scoring.ts` — agregar `interface ChipResult` + función `computeChipScore` al final, sin tocar lógica existente.

**Nuevos (2):**
- `src/components/admin/clinical/ScoreChip.tsx` — ~50 líneas.
- `src/hooks/useKeyboardSelection.ts` — ~40 líneas.

**Sin tocar:**
- `types.ts`, `actions.ts`, `QuestionnaireWrapper.tsx`, `ClinicalHistoryClient.tsx`, `constants.ts`, ReportPage*, dashboard, Excel.
- DB schema.

**Orden de tareas:**
- Tasks 1, 2, 3 son independientes (archivos nuevos / scoring.ts → no chocan con Questionnaire.tsx).
- Task 4 (EP-2 popup) toca solo el footer del JSX en Questionnaire.tsx — independiente del resto del archivo.
- Task 5 (EP-5 chip integration) toca render de cada step.
- Task 6 (EP-6 marcado + auto-focus) también toca render de cada step.
- Task 7 (smoke) requiere todo lo anterior.

Por evitar conflictos en Questionnaire.tsx: ejecutar Tasks 4 → 5 → 6 secuencialmente.

---

## Task 1: Componente `ScoreChip`

**Files:**
- Create: `src/components/admin/clinical/ScoreChip.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// src/components/admin/clinical/ScoreChip.tsx
"use client"

interface Props {
  label: string
  displayValue: string | null
  score: number | null
}

export default function ScoreChip({ label, displayValue, score }: Props) {
  const isReady = score !== null && displayValue !== null
  const colorClass = !isReady
    ? "border-slate-200 bg-slate-50 text-slate-500"
    : score >= 80
      ? "border-green-300 bg-green-50 text-green-800"
      : score > 50
        ? "border-yellow-300 bg-yellow-50 text-yellow-800"
        : "border-red-300 bg-red-50 text-red-800"

  return (
    <div
      className={`max-w-[200px] px-4 py-3 rounded-xl border-2 ${colorClass}`}
      aria-label={`${label}: ${displayValue ?? 'sin valor'}, CAIMED ${score ?? '–'}`}
    >
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-sm font-black mt-0.5">{displayValue ?? '—'}</p>
      <div className="border-t border-current/20 my-1.5" />
      <p className="text-xs font-bold opacity-70">CAIMED</p>
      <p className="text-lg font-black leading-tight">{score ?? '—'}</p>
    </div>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: no output (cero errores).

- [ ] **Step 3: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/ScoreChip.tsx
git commit -m "feat(clinical): add ScoreChip reusable component"
```

---

## Task 2: Helper `computeChipScore` en `scoring.ts`

**Files:**
- Modify: `src/lib/clinical/scoring.ts` — agregar al final.

- [ ] **Step 1: Agregar interface y función al final de scoring.ts**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/scoring.ts`, al final del archivo (después de `recomputeAssessment`), agregar:

```ts

export interface ChipResult {
  label: string
  displayValue: string
  score: number
}

const computeIMC = (weightStr: string, heightStr: string): number | null => {
  const w = parseFloat(weightStr)
  const hCm = parseFloat(heightStr)
  if (!w || !hCm) return null
  const hM = hCm / 100
  return Math.round((w / (hM * hM)) * 10) / 10
}

const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

/**
 * Calcula el chip de score para un componente dado, derivando el valor crudo
 * desde formData. Reusa calcularPuntajeExacto para garantizar consistencia
 * con el reporte final.
 *
 * Devuelve null si los inputs aún no están completos (chip muestra estado neutral).
 *
 * NOTA sobre contexto: el chip recibe el contexto disponible en captura
 * (takesMeds, iiefAplica) pero NO conoce isSCA/isDM2 (esos los marca el
 * médico en ClinicalHistoryClient). El chip muestra el valor con isSCA=false
 * isDM2=false, lo que puede diferir del puntaje final visible en el reporte
 * para Colesterol y Glucosa cuando el contexto SCA/DM2 cambia las metas.
 */
export const computeChipScore = (
  componentName: string,
  formData: Record<string, unknown>,
  contexto: ContextoClinico,
): ChipResult | null => {
  switch (componentName) {
    case 'Red de apoyo': {
      const mspss = formData.mspss as number[]
      if (!mspss || mspss.some(v => v === 0)) return null
      const suma = sumArr(mspss)
      const promedio = Math.round((suma / 12) * 10) / 10
      return {
        label: 'Promedio',
        displayValue: promedio.toFixed(1),
        score: calcularPuntajeExacto('Red de apoyo', suma, contexto),
      }
    }
    case 'Empoderamiento': {
      const hes = formData.hes as number[]
      if (!hes || hes.some(v => v === 0)) return null
      const suma = sumArr(hes)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Empoderamiento', suma, contexto),
      }
    }
    case 'Adherencia a medicamentos': {
      const arms = formData.arms as number[]
      if (!arms || arms.some(v => v === 0)) return null
      const suma = sumArr(arms)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Adherencia a medicamentos', suma, contexto),
      }
    }
    case 'Acceso a medicamentos': {
      const v = formData.medAccess as number
      if (!v) return null
      const labels: Record<number, string> = { 1: 'Sí', 2: 'Parcial', 3: 'No' }
      return {
        label: 'Respuesta',
        displayValue: labels[v] ?? '—',
        score: calcularPuntajeExacto('Acceso a medicamentos', v, contexto),
      }
    }
    case 'Presión arterial': {
      const vs = formData.vitalSigns as { pas?: string } | undefined
      const pas = parseFloat(vs?.pas ?? '')
      if (!pas) return null
      return {
        label: 'PAS',
        displayValue: `${pas} mmHg`,
        score: calcularPuntajeExacto('Presión arterial', pas, contexto),
      }
    }
    case 'Peso': {
      const imc = computeIMC(formData.weight as string, formData.height as string)
      if (imc === null) return null
      return {
        label: 'IMC',
        displayValue: imc.toFixed(1),
        score: calcularPuntajeExacto('Peso', imc, contexto),
      }
    }
    case 'Colesterol': {
      const p = formData.paraclinics as { ldl?: string } | undefined
      const ldl = parseFloat(p?.ldl ?? '')
      if (!ldl) return null
      return {
        label: 'LDL',
        displayValue: `${ldl} mg/dL`,
        score: calcularPuntajeExacto('Colesterol', ldl, contexto),
      }
    }
    case 'Glucosa': {
      const p = formData.paraclinics as { hba1c?: string } | undefined
      const hba1c = parseFloat(p?.hba1c ?? '')
      if (!hba1c) return null
      return {
        label: 'HbA1c',
        displayValue: `${hba1c.toFixed(1)} %`,
        score: calcularPuntajeExacto('Glucosa', hba1c, contexto),
      }
    }
    case 'Disfunción eréctil': {
      const iief = formData.iief as number[]
      if (!iief || iief.some(v => v === 0)) return null
      const suma = sumArr(iief)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Disfunción eréctil', suma, contexto),
      }
    }
    case 'Nicotina': {
      const smoked = formData.smoked as boolean | null
      if (smoked === null) return null
      const labels: Record<number, string> = {
        1: 'No fumador', 2: 'Ex >5 años', 3: 'Ex 1-5 años',
        4: 'Ex <1 año', 5: 'Fumador actual', 6: 'Vapeador',
      }
      let nicotina = 1
      if (smoked) {
        const s = formData.smokeStatus as number[]
        if (!s || s.length === 0) return null
        if (s.includes(6) || s.includes(5)) nicotina = 5
        else if (s.includes(4)) nicotina = 4
        else if (s.includes(3)) nicotina = 3
        else if (s.includes(2)) nicotina = 2
      }
      return {
        label: 'Categoría',
        displayValue: labels[nicotina],
        score: calcularPuntajeExacto('Nicotina', nicotina, contexto),
      }
    }
    case 'Actividad física': {
      const raw = formData.activity as string
      if (!raw) return null
      const v = parseFloat(raw)
      if (isNaN(v)) return null
      return {
        label: 'Actividad',
        displayValue: `${v} min/sem`,
        score: calcularPuntajeExacto('Actividad física', v, contexto),
      }
    }
    case 'Sueño': {
      const raw = formData.sleep as string
      if (!raw) return null
      const v = parseFloat(raw)
      if (isNaN(v)) return null
      return {
        label: 'Sueño',
        displayValue: `${v.toFixed(1)} horas`,
        score: calcularPuntajeExacto('Sueño', v, contexto),
      }
    }
    case 'Salud mental': {
      const phq = formData.phq9 as number[]
      if (!phq) return null
      const suma = sumArr(phq)
      return {
        label: 'Suma PHQ-9',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Salud mental', suma, contexto),
      }
    }
    case 'Alimentación': {
      const medas = formData.medas as number[]
      if (!medas || medas.some(v => v < 0)) return null
      const suma = sumArr(medas)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Alimentación', suma, contexto),
      }
    }
    default:
      return null
  }
}
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/scoring.ts
git commit -m "feat(scoring): add computeChipScore helper for live UI chips"
```

---

## Task 3: Hook `useKeyboardSelection`

**Files:**
- Create: `src/hooks/useKeyboardSelection.ts`

- [ ] **Step 1: Verificar que `src/hooks/` existe**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && ls src/hooks 2>&1`
Si no existe, crearlo: `mkdir -p src/hooks`. Si existe, proseguir.

- [ ] **Step 2: Crear el hook**

```ts
// src/hooks/useKeyboardSelection.ts
"use client"

import { useEffect } from 'react'

/**
 * Intercepta teclas numéricas (1-9) para activar el botón con `data-key="<n>"`
 * dentro del grupo `[data-keyboard-group]` que contiene el `document.activeElement`.
 *
 * Tab nativo navega entre botones; los números aceleran la selección dentro
 * del grupo enfocado. No interfiere con inputs de texto/número (el handler
 * los detecta y se retira).
 */
export function useKeyboardSelection() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement) {
        if (target.type !== 'radio' && target.type !== 'checkbox' && target.type !== 'button') return
      }
      if (target instanceof HTMLTextAreaElement) return
      if (target instanceof HTMLSelectElement) return
      if (target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const num = parseInt(e.key, 10)
      if (isNaN(num) || num < 1 || num > 9) return

      const group = target.closest('[data-keyboard-group]') as HTMLElement | null
      if (!group) return

      const btn = group.querySelector(`[data-key="${num}"]`) as HTMLElement | null
      if (!btn) return

      e.preventDefault()
      btn.click()
      btn.focus()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
```

- [ ] **Step 3: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/hooks/useKeyboardSelection.ts
git commit -m "feat(hooks): add useKeyboardSelection global hook"
```

---

## Task 4: EP-2 — Reposicionar el toast del coach

**Files:**
- Modify: `src/components/admin/clinical/Questionnaire.tsx` (lines ~1760-1764).

- [ ] **Step 1: Agregar `X` al import de lucide-react**

Localizar el bloque de imports al top del archivo (líneas ~4-8):

```ts
import {
  HeartPulse, User, CreditCard, Calendar, Phone, Mail,
  Ruler, Scale, Activity, Pill, Package, Moon, Dumbbell,
  Check, ChevronRight, ChevronLeft, Loader2, Link as LinkIcon, CheckCircle2
} from 'lucide-react';
```

Agregar `X` al final del listado:

```ts
import {
  HeartPulse, User, CreditCard, Calendar, Phone, Mail,
  Ruler, Scale, Activity, Pill, Package, Moon, Dumbbell,
  Check, ChevronRight, ChevronLeft, Loader2, Link as LinkIcon, CheckCircle2, X
} from 'lucide-react';
```

- [ ] **Step 2: Reemplazar el bloque del toast**

Localizar (~líneas 1760-1764):

```tsx
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 max-w-md border border-blue-500/50">
          <HeartPulse className="w-8 h-8 shrink-0 text-blue-200" />
          <p className="font-medium text-sm leading-relaxed">{toastMsg}</p>
        </div>
      )}
```

Reemplazar por:

```tsx
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5 fade-in duration-300 z-50 max-w-lg border border-blue-400/30">
          <HeartPulse className="w-8 h-8 shrink-0 text-blue-200" aria-hidden="true" />
          <p className="font-medium text-sm leading-relaxed flex-1">{toastMsg}</p>
          <button
            type="button"
            onClick={() => {
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              setToastMsg('');
            }}
            className="shrink-0 p-1 rounded-md hover:bg-white/15 transition-colors"
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
```

- [ ] **Step 3: Verificar TypeScript + lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: no output.

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint 2>&1 | grep "Questionnaire.tsx" | head`
Expected: sin nuevos warnings.

- [ ] **Step 4: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/Questionnaire.tsx
git commit -m "feat(ep): move coach popup to top-center with close button"
```

---

## Task 5: EP-5 — Integración de `<ScoreChip>` en los 12 steps con scoring

**Files:**
- Modify: `src/components/admin/clinical/Questionnaire.tsx` (imports + helper local + cada step).

### Step 1: Agregar imports

En la cabecera de imports, agregar:

```ts
import ScoreChip from './ScoreChip';
import { computeChipScore } from '@/lib/clinical/scoring';
import type { ContextoClinico } from '@/lib/clinical/types';
```

- [ ] (Marcar este step como hecho cuando ambos imports estén presentes.)

### Step 2: Agregar helper local al top del componente

Localizar el `useState` del `formData` (~línea 120). DESPUÉS del `useState` del `formData` y ANTES de los `useEffect`s, agregar:

```ts
  // EP-5: chip context — el chip muestra valor sin contexto SCA/DM2 (lo ignoramos
  // en captura porque depende del input del médico en ClinicalHistoryClient).
  const chipContexto: ContextoClinico = {
    isSCA: false,
    isDM2: false,
    isPluripatologico: false,
    isPocaExpectativa: false,
    edad: 0,
    takesMeds: formData.takesMeds === true,
    iiefAplica: formData.gender === 'Masculino' && formData.hasSexualActivity === true,
  };
  const chipFor = (name: string) => {
    const result = computeChipScore(name, formData as unknown as Record<string, unknown>, chipContexto);
    return result
      ? { label: result.label, displayValue: result.displayValue, score: result.score }
      : { label: 'Pendiente', displayValue: null, score: null };
  };
```

- [ ] (Marcar como hecho cuando el helper esté en el lugar correcto.)

### Step 3: Pattern para insertar chip en un step

El patrón es: cambiar el `<h2>` solo a un wrapper flex que contenga el `<h2>` a la izquierda y el `<ScoreChip>` (o varios) a la derecha.

**Antes (ejemplo paso 4 MSPSS):**

```tsx
      case 4:
        const mspssQuestions = [...];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" /> Apoyo Social (MSPSS)
            </h2>
            ...
```

**Después:**

```tsx
      case 4:
        const mspssQuestions = [...];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" /> Apoyo Social (MSPSS)
              </h2>
              <ScoreChip {...chipFor('Red de apoyo')} />
            </div>
            ...
```

Aplica este pattern en los siguientes 12 cases:

| Case | Componente(s) del chip | Variante |
|------|------------------------|----------|
| 4 (MSPSS) | `'Red de apoyo'` | Single chip |
| 5 (HES) | `'Empoderamiento'` | Single chip |
| 8 (Acceso meds) | `'Acceso a medicamentos'` | Single chip |
| 9 (ARMS) | `'Adherencia a medicamentos'` | Single chip |
| 10 (Vitales) | `'Presión arterial'` | Single chip |
| 11 (Antropometría) | `'Peso'` | Single chip |
| 12 (Paraclínicos) | `'Colesterol'` + `'Glucosa'` | **Dos chips** lado a lado |
| 13 (IIEF) | `'Disfunción eréctil'` | Single chip — solo visible si `formData.gender === 'Masculino' && formData.hasSexualActivity === true` (renderizado condicional) |
| 15 (Tabaquismo) | `'Nicotina'` | Single chip |
| 16 (Hábitos) | `'Actividad física'` + `'Sueño'` | **Dos chips** lado a lado |
| 17 (PHQ-9) | `'Salud mental'` | Single chip |
| 18 (Alimentación) | `'Alimentación'` | Single chip |

**Para cases con dos chips** (12 y 16), envolver ambos en un `<div className="flex flex-wrap gap-2">`:

```tsx
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Pill className="w-6 h-6 text-blue-600" /> Paraclínicos
              </h2>
              <div className="flex flex-wrap gap-2">
                <ScoreChip {...chipFor('Colesterol')} />
                <ScoreChip {...chipFor('Glucosa')} />
              </div>
            </div>
```

**Para case 13 (IIEF):** envolver el chip en un check condicional para que solo aparezca cuando aplica:

```tsx
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Salud Sexual
              </h2>
              {formData.gender === 'Masculino' && formData.hasSexualActivity === true && (
                <ScoreChip {...chipFor('Disfunción eréctil')} />
              )}
            </div>
```

- [ ] **Step 4: Aplicar el pattern a case 4 (MSPSS)**

Localizar el case 4. Reemplazar el `<h2>` por el wrapper flex con el chip de `'Red de apoyo'`.

- [ ] **Step 5: Aplicar el pattern a case 5 (HES)**

Reemplazar el `<h2>` con el chip de `'Empoderamiento'`.

- [ ] **Step 6: Aplicar el pattern a case 8 (Acceso meds)**

Reemplazar el `<h2>` con el chip de `'Acceso a medicamentos'`.

- [ ] **Step 7: Aplicar el pattern a case 9 (ARMS)**

Reemplazar el `<h2>` con el chip de `'Adherencia a medicamentos'`.

- [ ] **Step 8: Aplicar el pattern a case 10 (Vitales)**

Reemplazar el `<h2>` con el chip de `'Presión arterial'`.

- [ ] **Step 9: Aplicar el pattern a case 11 (Antropometría)**

Reemplazar el `<h2>` con el chip de `'Peso'`.

- [ ] **Step 10: Aplicar el pattern a case 12 (Paraclínicos) con DOS chips**

Reemplazar el `<h2>` con el wrapper que contiene `<ScoreChip>` para `'Colesterol'` Y `'Glucosa'`.

- [ ] **Step 11: Aplicar el pattern a case 13 (IIEF) — chip condicional**

Reemplazar el `<h2>` con el wrapper. El chip de `'Disfunción eréctil'` solo se renderiza cuando `formData.gender === 'Masculino' && formData.hasSexualActivity === true`.

- [ ] **Step 12: Aplicar el pattern a case 15 (Tabaquismo)**

Reemplazar el `<h2>` con el chip de `'Nicotina'`.

- [ ] **Step 13: Aplicar el pattern a case 16 (Hábitos) con DOS chips**

Reemplazar el `<h2>` con el wrapper que contiene `<ScoreChip>` para `'Actividad física'` Y `'Sueño'`.

- [ ] **Step 14: Aplicar el pattern a case 17 (PHQ-9)**

Reemplazar el `<h2>` con el chip de `'Salud mental'`.

- [ ] **Step 15: Aplicar el pattern a case 18 (Alimentación)**

Reemplazar el `<h2>` con el chip de `'Alimentación'`.

- [ ] **Step 16: Verificar TypeScript + lint + build parcial**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: no output.

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint 2>&1 | grep "Questionnaire.tsx" | head`
Expected: sin nuevos warnings.

- [ ] **Step 17: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/Questionnaire.tsx
git commit -m "feat(ep): add live ScoreChip to each scoring step"
```

---

## Task 6: EP-6 — Hook + auto-focus + marcado de grupos

**Files:**
- Modify: `src/components/admin/clinical/Questionnaire.tsx`.

### Step 1: Llamar al hook + agregar useEffect de auto-focus

Agregar el import al top del archivo (cerca de los otros imports `@/hooks/...` o `@/lib/...`):

```ts
import { useKeyboardSelection } from '@/hooks/useKeyboardSelection';
```

En el componente `Questionnaire(...)`, localizar el helper `chipFor` agregado en Task 5 Step 2. Inmediatamente DESPUÉS del `chipFor` y ANTES del bloque `handleNext = () => {...}` (alrededor de línea ~193), agregar:

```ts
  // EP-6: keyboard navigation hook (intercepta números 1-9 en grupos marcados)
  useKeyboardSelection();

  // EP-6: auto-focus al primer botón del primer grupo Likert/binario al cambiar de step.
  // Si el step actual no tiene grupos marcados (welcome, datos personales, etc.), no pasa nada.
  useEffect(() => {
    const t = setTimeout(() => {
      const firstGroup = document.querySelector('[data-keyboard-group]') as HTMLElement | null;
      const firstBtn = firstGroup?.querySelector('[data-key="1"]') as HTMLElement | null;
      firstBtn?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [step]);
```

- [ ] **Step 2: Marcar grupos en case 4 (MSPSS, 12 preguntas × 7 opciones)**

Localizar el render del case 4 (~líneas 720-765). En cada `<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">` (uno por pregunta), agregar `data-keyboard-group="mspss-${idx}"`. En cada `<label>` dentro, agregar `data-key={opt.val}`.

```tsx
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2" data-keyboard-group={`mspss-${idx}`}>
                    {[
                      { val: 1, label: 'Muy en desacuerdo' },
                      { val: 2, label: 'En desacuerdo' },
                      ...
                    ].map(opt => (
                      <label
                        key={opt.val}
                        data-key={opt.val}
                        tabIndex={0}
                        className={...}
                      >
                        ...
```

Notas:
- `data-keyboard-group` y `data-key` son atributos `data-*` que pasan a través en React.
- `tabIndex={0}` se agrega al `<label>` para que sea enfocable por Tab (los inputs internos están `hidden`, lo que los hace inaccesibles via Tab).
- El click en `<label>` ya activa el radio interno por la asociación nativa.

- [ ] **Step 3: Marcar grupos en case 5 (HES, 8 preguntas × 5 opciones)**

Mismo pattern. En cada `<div className="grid grid-cols-2 md:grid-cols-5 gap-2">` agregar `data-keyboard-group={`hes-${idx}`}`. En cada `<label>` agregar `data-key={opt.val}` y `tabIndex={0}`.

- [ ] **Step 4: Marcar grupos en case 7 (takesMeds gate Sí/No)**

Localizar los 2 botones (Sí, No) del case 7. Envolverlos en un `<div data-keyboard-group="takes-meds-gate">` (puede ser el mismo `grid grid-cols-2 gap-4` existente, agregándole el atributo). Agregar `data-key="1"` al botón Sí y `data-key="2"` al botón No. Los `<button>` ya son enfocables por Tab nativamente.

- [ ] **Step 5: Marcar grupos en case 8 (Acceso meds, 3 opciones + motivo)**

Para el grupo principal (3 opciones Sí/Parcial/No): agregar `data-keyboard-group="med-access"` al contenedor + `data-key="1"`, `data-key="2"`, `data-key="3"` a cada botón.

Si hay un sub-grupo de motivos cuando medAccess !== 1: agregar `data-keyboard-group="med-access-motivo"` al contenedor + `data-key={n}` a cada motivo (1-N).

- [ ] **Step 6: Marcar grupos en case 9 (ARMS, 12 preguntas × 4 opciones)**

Mismo pattern que MSPSS/HES. `data-keyboard-group={`arms-${idx}`}` + `data-key={opt.val}` en cada `<label>` con `tabIndex={0}`.

- [ ] **Step 7: Marcar grupos en case 13 (IIEF gate + 5 preguntas)**

Para el gate Sí/No: envolver los 2 botones en `<div data-keyboard-group="sex-activity-gate">` con `data-key="1"` y `data-key="2"`.

Para las 5 preguntas IIEF: en cada `<div className="grid grid-cols-2 md:grid-cols-5 gap-2">` agregar `data-keyboard-group={`iief-${idx}`}` + `data-key={opt.val}` y `tabIndex={0}` en cada `<label>`.

- [ ] **Step 8: Marcar grupos en case 14 (smoked gate Sí/No)**

Localizar los 2 botones del case 14. Envolverlos en `<div data-keyboard-group="smoked-gate">` con `data-key="1"` y `data-key="2"`.

- [ ] **Step 9: Marcar grupos en case 15 (Nicotina, 6 categorías)**

Localizar el contenedor de las 6 opciones de smokeStatus. Agregar `data-keyboard-group="nicotina"` + `data-key={n}` 1-6 en cada opción (con `tabIndex={0}` si son `<label>`).

- [ ] **Step 10: Marcar grupos en case 17 (PHQ-9, 9 preguntas × 4 opciones)**

Mismo pattern. `data-keyboard-group={`phq9-${idx}`}` + `data-key={n}` 1-4 (1=ningún día, 2=varios, 3=más de la mitad, 4=casi todos). Si hay un grupo "dificultad" extra, marcarlo como `phq9-dif`.

- [ ] **Step 11: Marcar grupos en case 18 (Alimentación / MEDAS, 8 preguntas × N opciones)**

Mismo pattern. `data-keyboard-group={`medas-${idx}`}` + `data-key={n}` por cada opción.

- [ ] **Step 12: Verificar TypeScript + lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: no output.

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint 2>&1 | grep "Questionnaire.tsx" | head`
Expected: sin nuevos warnings.

- [ ] **Step 13: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/Questionnaire.tsx
git commit -m "feat(ep): add keyboard navigation with data-key markers and auto-focus"
```

---

## Task 7: Build + verificación numérica + smoke

**Files:** ninguno modificado.

- [ ] **Step 1: Build de producción**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build`
Expected: build exitoso, ~19 páginas estáticas.

- [ ] **Step 2: Verificación numérica de `computeChipScore`**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
cat > /tmp/ep256-verify.mts <<'EOF'
// Self-contained mirror of computeChipScore + scoring engine.
const reglaDeTresRango = (v: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  if (v <= Math.min(inMin, inMax)) return outMin
  if (v >= Math.max(inMin, inMax)) return outMax
  return Math.round(outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin))
}
const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

// Curvas (post-EP-3)
const empoderamiento = (v: number) => {
  if (v < 19) return reglaDeTresRango(v, 8, 18.99, 0, 50)
  if (v <= 29) return reglaDeTresRango(v, 19, 29, 51, 79)
  return reglaDeTresRango(v, 30, 40, 80, 100)
}
const adherencia = (v: number) => {
  if (v <= 23) return reglaDeTresRango(v, 12, 23, 100, 80)
  if (v <= 35) return reglaDeTresRango(v, 24, 35, 79, 51)
  return reglaDeTresRango(v, 36, 48, 50, 0)
}
const redApoyo = (v: number) => {
  if (v < 36) return reglaDeTresRango(v, 12, 35.99, 0, 50)
  if (v <= 60) return reglaDeTresRango(v, 36, 60, 51, 79)
  return reglaDeTresRango(v, 60.01, 84, 80, 100)
}
const saludMental = (v: number) => {
  if (v <= 4) return reglaDeTresRango(v, 0, 4, 100, 80)
  if (v <= 14) return reglaDeTresRango(v, 5, 14, 79, 51)
  return reglaDeTresRango(v, 15, 27, 50, 0)
}
const iiefScore = (v: number) => {
  if (v <= 11) return reglaDeTresRango(v, 5, 11, 0, 50)
  if (v <= 21) return reglaDeTresRango(v, 12, 21, 51, 79)
  return reglaDeTresRango(v, 22, 25, 80, 100)
}

const test = (n: string, a: number, e: number) => console.log(`  [${a===e?'OK ':'FAIL'}] ${n}: ${a} (esperado ${e})`)

console.log('MSPSS [7×12]:')
test('suma 84',  redApoyo(sumArr(Array(12).fill(7))), 100)

console.log('HES [5×8]:')
test('suma 40',  empoderamiento(sumArr(Array(8).fill(5))), 100)

console.log('ARMS [1×12]:')
test('suma 12',  adherencia(sumArr(Array(12).fill(1))), 100)

console.log('PHQ-9 [0×9]:')
test('suma 0',   saludMental(sumArr(Array(9).fill(0))), 100)

console.log('IIEF [5×5]:')
test('suma 25',  iiefScore(sumArr(Array(5).fill(5))), 100)

console.log('IIEF [3×5]:')
test('suma 15',  iiefScore(sumArr(Array(5).fill(3))), 60)
EOF
node --experimental-strip-types --no-warnings /tmp/ep256-verify.mts && rm /tmp/ep256-verify.mts
```

Expected: 6 lineas `OK` con valores esperados.

- [ ] **Step 3: Smoke manual integral**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

Casos a validar (el controller pasará al usuario):

**EP-2 (popup):**
- A1. Avanzar de paso 1 → 2 → 3. El popup aparece arriba-centro al cambiar de step, NO en el bottom-right.
- A2. En el popup hay un botón X visible. Click cierra inmediatamente.
- A3. Sin click: el popup auto-dismisses a los 6s.

**EP-5 (chips):**
- B1. Step 4 (MSPSS) sin responder → chip neutral (gris) "Promedio: —, CAIMED: —".
- B2. Responder las 12 preguntas con valor 7 cada una → chip verde "Promedio: 7.0, CAIMED: 100".
- B3. Responder algunas con 1 → chip se actualiza en vivo (rojo o amarillo según promedio).
- B4. Step 12 (paraclínicos): meter LDL=120 y HbA1c=5.5 → DOS chips visibles, ambos verdes.
- B5. Step 13 (IIEF) — hombre + Sí + 5 respuestas máximas → chip verde "Suma: 25, CAIMED: 100". Marcar No → chip desaparece. Mujer → chip nunca aparece.
- B6. Step 16 (hábitos): meter Actividad=150 y Sueño=8 → 2 chips, ambos verdes.

**EP-6 (teclado):**
- C1. Llegar al paso 4 (MSPSS) → el primer botón "Muy en desacuerdo" debería estar enfocado automáticamente (anillo focus visible).
- C2. Presionar "5" → la opción "Algo de acuerdo" se selecciona en la primera pregunta. El chip se actualiza.
- C3. Tab → foco se mueve al primer botón de la segunda pregunta. Presionar "7" → "Muy de acuerdo" seleccionado en pregunta 2. Chip se actualiza.
- C4. Repetir para llenar las 12 preguntas con teclado, sin tocar el mouse. Avanzar al siguiente step con Tab + Enter (al botón "Siguiente").
- C5. Step 10 (vitales): el primer input es PA sistólica. Tab y escribir "120" — los números deben entrar al input, NO interceptados por el hook.
- C6. Step 7 (takesMeds gate) → enfocado el botón "Sí". Presionar "2" → el botón "No" se selecciona.

Detener el dev server.

- [ ] **Step 4: Commit final si hubo ajustes**

Si los smokes pasaron sin ajustes, NO hacer commit vacío.

---

## Notas para el implementador

- **No tocar `recomputeAssessment` ni `calcularPuntajeExacto`** — `computeChipScore` es un wrapper nuevo independiente.
- **No modificar el motor de scoring de `ContextoClinico`** — el chip usa sus propios defaults de SCA/DM2 documentados.
- **`tabIndex={0}` en `<label>`** es necesario porque los `<input type="radio">` están `className="hidden"` (display:none) que los excluye del Tab order. La alternativa sería `sr-only` en lugar de `hidden`, pero eso cambiaría el patrón visual del codebase. Usar `tabIndex={0}` en los labels es más localizado.
- **Pre-existing TS errors en `.next/types/routes.d.ts`** son ruido, ignorar.
- **El IIEF chip solo aparece cuando aplica** — el render condicional en case 13 está en el wrapper del título, no dentro de `chipFor` (que ya retorna null si no aplica, pero el render condicional explícito es más limpio que mostrar un chip "Pendiente" gris para mujeres).
- **Fallback "Pendiente"** del chip aparece cuando el componente aún no tiene valor — ese es el estado deseado durante captura, mostrando al médico que falta data.
- **PHQ-9 datos internos:** el array `phq9` guarda 0-3, pero las opciones visuales son 4. `data-key="1"` mapea a "ningún día" (= valor 0 internamente), etc. El `displayValue` del chip muestra la suma, no el código.

# Spec EP-2 + EP-5 + EP-6: Popup coach + Live score chips + Keyboard navigation

**Fecha:** 2026-05-04
**Sub-proyectos:** EP-2, EP-5, EP-6 (los 3 últimos del rework de la Evaluación Preventiva, bundleados en un solo branch para evitar conflictos de merge en `Questionnaire.tsx`).

## Contexto

Tres mejoras UX al cuestionario de evaluación preventiva, que comparten el mismo archivo principal:

- **EP-2:** mover el popup del coach (mensajes "Recuérdale al paciente...") de bottom-right a top-center floating, con botón cerrar y backdrop premium.
- **EP-5:** mostrar un chip de score en vivo al lado del título de cada step con scoring, indicando el valor crudo (que va al PDF) y el equivalente CAIMED 0-100.
- **EP-6:** habilitar navegación por teclado (Tab nativo + números 1-N) en grupos Likert y botones binarios.

## Alcance

### IN

**EP-2:**
- Reposicionar el toast de [Questionnaire.tsx:1760-1764](../../src/components/admin/clinical/Questionnaire.tsx) de bottom-right a top-center floating.
- Agregar botón "X" para cerrar manualmente.
- Mantener auto-dismiss a los 6s y trigger en cada cambio de step.
- Polish visual: glassmorphism (`bg-blue-600/95 backdrop-blur-md border border-blue-400/30`).

**EP-5:**
- Componente reusable `<ScoreChip>` con estética unificada.
- Helper `computeChipScore(componentName, formData, contexto)` que reusa el motor de scoring para garantizar consistencia con el PDF.
- Integrar el chip al render de los **12 steps con scoring directo**: 4 (MSPSS), 5 (HES), 8 (Acceso a meds), 9 (ARMS), 10 (PA), 11 (IMC), 12 (LDL + HbA1c — 2 chips), 13 (IIEF, condicional), 15 (Nicotina), 16 (Actividad + Sueño — 2 chips), 17 (PHQ-9), 18 (Alimentación).

**EP-6:**
- Hook `useKeyboardSelection` que intercepta números 1-9 cuando hay un grupo Likert/binario enfocado.
- Atributos `data-keyboard-group` y `data-key` en grupos de respuesta de los steps Likert/binarios: 4, 5, 7, 8, 9, 13, 14, 15, 17, 18.
- Auto-focus en el primer botón del primer grupo al cambiar de step (cuando aplica).
- Tab nativo se mantiene intacto para todos los demás campos.

### OUT

- Steps sin scoring (1, 2, 3, 6, 19, 20) — sin chip ni atajos numéricos.
- Steps con inputs numéricos (3, 10, 11, 12, 16) — los números van al input, NO interceptados por el hook.
- Modificaciones al motor de scoring (`scoring.ts:calcularPuntajeExacto`) o a las curvas — solo agrega `computeChipScore` como wrapper.
- Cambios al PDF, dashboard, Excel, DB — solo UI.
- Tooltip / hint visual de los atajos de teclado — el usuario los descubre al usarlos.

## EP-2 — Popup top-center

### Estado actual

[Questionnaire.tsx:1760-1764](../../src/components/admin/clinical/Questionnaire.tsx):
```tsx
{toastMsg && (
  <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 max-w-md border border-blue-500/50">
    <HeartPulse className="w-8 h-8 shrink-0 text-blue-200" />
    <p className="font-medium text-sm leading-relaxed">{toastMsg}</p>
  </div>
)}
```

### Estado objetivo

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

Cambios técnicos:
- `fixed bottom-6 right-6` → `fixed top-6 left-1/2 -translate-x-1/2`.
- `slide-in-from-bottom-5` → `slide-in-from-top-5`.
- `max-w-md` → `max-w-lg`.
- `bg-blue-600` → `bg-blue-600/95 backdrop-blur-md` (glassmorphism).
- `border-blue-500/50` → `border-blue-400/30` (más sutil con el blur).
- Agregar `<button aria-label="Cerrar mensaje">` con icono `X` de lucide-react.
- El `<p>` recibe `flex-1` para empujar el botón a la derecha.

Auto-dismiss 6s y trigger en cambio de step (líneas 79-90) se mantienen sin cambios.

## EP-5 — Live score chips

### Componente nuevo: `src/components/admin/clinical/ScoreChip.tsx`

```tsx
"use client"

interface Props {
  label: string
  displayValue: string | null  // null = sin valor todavía → estado neutral
  score: number | null         // null = sin valor → estado neutral
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
    <div className={`max-w-[200px] px-4 py-3 rounded-xl border-2 ${colorClass}`} aria-label={`${label}: ${displayValue ?? 'sin valor'}, CAIMED ${score ?? '–'}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-sm font-black mt-0.5">{displayValue ?? '—'}</p>
      <div className="border-t border-current/20 my-1.5" />
      <p className="text-xs font-bold opacity-70">CAIMED</p>
      <p className="text-lg font-black leading-tight">{score ?? '—'}</p>
    </div>
  )
}
```

### Helper nuevo en `scoring.ts`: `computeChipScore`

Un solo punto de verdad: deriva el valor crudo desde `formData`, lo pasa por `calcularPuntajeExacto`, retorna ambos.

```ts
// Agregar al final de scoring.ts (después de recomputeAssessment)

export interface ChipResult {
  label: string
  displayValue: string
  score: number
}

// Helper de cálculo del IMC para el chip (mismo formula que la captura).
const computeIMC = (weightStr: string, heightStr: string): number | null => {
  const w = parseFloat(weightStr)
  const hCm = parseFloat(heightStr)
  if (!w || !hCm) return null
  const hM = hCm / 100
  return Math.round((w / (hM * hM)) * 10) / 10
}

// Helper para sumas Likert con default a 0 (suma) o promedio.
const sumArr = (arr: number[]) => arr.reduce((a, b) => a + b, 0)

// Devuelve el ChipResult o null si los inputs aún no están completos.
export const computeChipScore = (
  componentName: string,
  formData: Record<string, unknown>,
  contexto: ContextoClinico,
): ChipResult | null => {
  switch (componentName) {
    case 'Red de apoyo': {
      const mspss = formData.mspss as number[]
      if (mspss.some(v => v === 0)) return null
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
      if (hes.some(v => v === 0)) return null
      const suma = sumArr(hes)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Empoderamiento', suma, contexto),
      }
    }
    case 'Adherencia a medicamentos': {
      const arms = formData.arms as number[]
      if (arms.some(v => v === 0)) return null
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
      const vitalSigns = formData.vitalSigns as { pas?: string }
      const pas = parseFloat(vitalSigns?.pas ?? '')
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
      const paraclinics = formData.paraclinics as { ldl?: string }
      const ldl = parseFloat(paraclinics?.ldl ?? '')
      if (!ldl) return null
      return {
        label: 'LDL',
        displayValue: `${ldl} mg/dL`,
        score: calcularPuntajeExacto('Colesterol', ldl, contexto),
      }
    }
    case 'Glucosa': {
      const paraclinics = formData.paraclinics as { hba1c?: string }
      const hba1c = parseFloat(paraclinics?.hba1c ?? '')
      if (!hba1c) return null
      return {
        label: 'HbA1c',
        displayValue: `${hba1c.toFixed(1)} %`,
        score: calcularPuntajeExacto('Glucosa', hba1c, contexto),
      }
    }
    case 'Disfunción eréctil': {
      const iief = formData.iief as number[]
      if (iief.some(v => v === 0)) return null
      const suma = sumArr(iief)
      return {
        label: 'Suma',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Disfunción eréctil', suma, contexto),
      }
    }
    case 'Nicotina': {
      // Mismo cálculo que generateUrl(): smokeStatus[] → código 1-6
      const smoked = formData.smoked as boolean | null
      if (smoked === null) return null
      const labels: Record<number, string> = {
        1: 'No fumador', 2: 'Ex >5 años', 3: 'Ex 1-5 años',
        4: 'Ex <1 año', 5: 'Fumador actual', 6: 'Vapeador',
      }
      let nicotina = 1
      if (smoked) {
        const s = formData.smokeStatus as number[]
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
      const v = parseFloat(formData.activity as string)
      if (isNaN(v) || (formData.activity as string) === '') return null
      return {
        label: 'Actividad',
        displayValue: `${v} min/sem`,
        score: calcularPuntajeExacto('Actividad física', v, contexto),
      }
    }
    case 'Sueño': {
      const v = parseFloat(formData.sleep as string)
      if (isNaN(v) || (formData.sleep as string) === '') return null
      return {
        label: 'Sueño',
        displayValue: `${v.toFixed(1)} horas`,
        score: calcularPuntajeExacto('Sueño', v, contexto),
      }
    }
    case 'Salud mental': {
      const phq = formData.phq9 as number[]
      const suma = sumArr(phq)
      // PHQ-9 puede tener todas en 0 (mínima depresión) — válido. Mostrar siempre que el array exista.
      return {
        label: 'Suma PHQ-9',
        displayValue: String(suma),
        score: calcularPuntajeExacto('Salud mental', suma, contexto),
      }
    }
    case 'Alimentación': {
      const medas = formData.medas as number[]
      if (medas.some(v => v < 0)) return null  // -1 = sin responder
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

### Integración en cada step de `Questionnaire.tsx`

En cada step con scoring, agregar el chip al lado del `<h2>`:

**Patrón base** (ejemplo paso 4 MSPSS):

```tsx
case 4:
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <User className="w-6 h-6 text-blue-600" /> Apoyo Social (MSPSS)
        </h2>
        <ScoreChip {...computeChipScoreOrFallback('Red de apoyo')} />
      </div>
      {/* ...resto del step inalterado... */}
    </div>
  );
```

**Helper local** (definir una sola vez al top del componente, después del state):

```tsx
const chipContexto: ContextoClinico = {
  isSCA: false,  // EP-5 no necesita SCA — el chip muestra el valor sin contexto SCA pre-aplicado
  isDM2: false,
  isPluripatologico: false,
  isPocaExpectativa: false,
  edad: 0,
  takesMeds: formData.takesMeds === true,
  iiefAplica: formData.gender === 'Masculino' && formData.hasSexualActivity === true,
};
const computeChipScoreOrFallback = (name: string) => {
  const result = computeChipScore(name, formData as unknown as Record<string, unknown>, chipContexto);
  return result
    ? { label: result.label, displayValue: result.displayValue, score: result.score }
    : { label: 'Pendiente', displayValue: null, score: null };
};
```

**Nota sobre `chipContexto.isSCA`/`isDM2`:** estos flags solo afectan el cálculo de Colesterol (LDL) y Glucosa (HbA1c). En el chip dejamos `false` como default conservador — el chip muestra el valor sin contexto SCA/DM2, mientras que el reporte final (que tiene acceso al contexto completo) puede mostrar un valor diferente. Esto es una decisión consciente: el chip sirve como feedback rápido durante captura, no como predicción exacta del puntaje final que el médico verá tras revisar el contexto del paciente. Documentado explícitamente.

### Steps con múltiples chips

- **Step 12 (paraclínicos):** 2 chips inline después del header — `<ScoreChip ... 'Colesterol' />` y `<ScoreChip ... 'Glucosa' />`. Layout: `<div className="flex flex-wrap gap-2">` para que respondan en móvil.
- **Step 16 (hábitos):** 2 chips — `'Actividad física'` y `'Sueño'`. Mismo patrón.

## EP-6 — Keyboard navigation

### Hook nuevo: `src/hooks/useKeyboardSelection.ts`

```ts
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
      // Ignorar si es un input editable
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement) {
        if (target.type !== 'radio' && target.type !== 'checkbox' && target.type !== 'button') return
      }
      if (target instanceof HTMLTextAreaElement) return
      if (target.isContentEditable) return
      // Ignorar si hay modificadores
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const num = parseInt(e.key, 10)
      if (isNaN(num) || num < 1 || num > 9) return

      // Encontrar el grupo activo
      const group = target.closest('[data-keyboard-group]') as HTMLElement | null
      if (!group) return

      const btn = group.querySelector(`[data-key="${num}"]`) as HTMLElement | null
      if (!btn) return

      e.preventDefault()
      btn.click()
      // Tras click, mover el foco al botón clickeado para que el siguiente número actúe sobre el mismo grupo
      btn.focus()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
```

### Auto-focus al cambiar de step

En `Questionnaire.tsx`, agregar un nuevo `useEffect`:

```tsx
useEffect(() => {
  // Después del render del step, si hay un grupo Likert/binario, enfocar su primera opción.
  const t = setTimeout(() => {
    const firstGroup = document.querySelector('[data-keyboard-group]') as HTMLElement | null
    const firstBtn = firstGroup?.querySelector('[data-key="1"]') as HTMLElement | null
    firstBtn?.focus()
  }, 50)
  return () => clearTimeout(t)
}, [step])
```

50ms de delay para esperar a que el DOM se monte tras el cambio de step.

### Marcado de DOM por step

Cada grupo de respuestas (1 pregunta Likert con N opciones, o 1 binario Sí/No) recibe `data-keyboard-group` único. Cada opción dentro recibe `data-key` con el índice 1-N.

**Mapa de marcado:**

| Step | Grupos | data-keyboard-group | Opciones (data-key) |
|------|--------|---------------------|----------------------|
| 4 (MSPSS) | 12 preguntas | `mspss-${idx}` | 1-7 (Likert 7 opciones) |
| 5 (HES) | 8 preguntas | `hes-${idx}` | 1-5 |
| 7 (takesMeds) | 1 binario | `takes-meds-gate` | 1 (Sí), 2 (No) |
| 8 (medAccess) | 1 grupo + 1 motivo | `med-access` | 1, 2, 3; `med-access-motivo` con 1-N para los motivos |
| 9 (ARMS) | 12 preguntas | `arms-${idx}` | 1-4 |
| 13 (IIEF gate) | 1 binario | `sex-activity-gate` | 1 (Sí), 2 (No) |
| 13 (IIEF preguntas, si aplica) | 5 preguntas | `iief-${idx}` | 1-5 |
| 14 (smoked) | 1 binario | `smoked-gate` | 1 (Sí), 2 (No) |
| 15 (smokeStatus) | radios múltiples | `nicotina` | 1-6 |
| 17 (PHQ-9) | 9 preguntas + 1 dificultad | `phq9-${idx}` y `phq9-dif` | 1-4 (PHQ usa 0-3 internamente; chip mostrará la suma) |
| 18 (Alimentación / MEDAS) | 8 preguntas | `medas-${idx}` | 1-N por pregunta |

**Nota PHQ-9:** internamente el array `phq9` guarda 0-3 pero las opciones visibles son 4 (ningún día / varios / más de la mitad / casi todos). Al usuario le aparecen 4 opciones, y los atajos 1-4 mapean a las 4 opciones (que internamente son valores 0-3). El componente debe usar `data-key="1"` para "ningún día" (= valor interno 0), `data-key="2"` para "varios días" (= valor interno 1), etc.

### Steps SIN marcado

- 1 (welcome): no hay inputs.
- 2 (consent): solo checkbox + link.
- 3 (datos personales): inputs de texto/select.
- 6 (antecedentes): chips multi-select — los números no aplican (selección no es escalar).
- 10, 11, 12, 16: inputs numéricos — los números van al input.
- 19, 20: estados terminales.

### Inicialización

`useKeyboardSelection()` se llama UNA vez al top del componente `Questionnaire`. El hook agrega un único listener global que se mantiene durante toda la vida del componente.

## Estructura de archivos

### Modificados (3)

- `src/components/admin/clinical/Questionnaire.tsx` — TODO en este archivo:
  - EP-2 (~líneas 1760-1764): top-center popup + botón X.
  - EP-5 (~líneas 100-200 helper local; render de cada step): integrar `<ScoreChip>` con `computeChipScoreOrFallback` en steps 4, 5, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18.
  - EP-6 (top-of-component): `useKeyboardSelection()` + auto-focus useEffect; en cada grupo de respuestas: agregar `data-keyboard-group` y `data-key`.
- `src/lib/clinical/scoring.ts` — agregar `interface ChipResult` + función `computeChipScore`. NO modificar `calcularPuntajeExacto` ni `recomputeAssessment`.
- `package.json` — sin cambios (no nuevas dependencias).

### Nuevos (2)

- `src/components/admin/clinical/ScoreChip.tsx` — componente reusable.
- `src/hooks/useKeyboardSelection.ts` — hook global.

### Sin tocar

- `types.ts`, `actions.ts`, `QuestionnaireWrapper.tsx`, `ClinicalHistoryClient.tsx`, `constants.ts`, ReportPage*, dashboard, Excel.

## Verificación

1. `npx tsc --noEmit` limpio.
2. `npm run lint` limpio.
3. `npm run build` pasa.
4. Verificación numérica de `computeChipScore` con casos puntuales:
   - MSPSS [7,7,7,7,7,7,7,7,7,7,7,7] → display "7.0", score 100.
   - HES [5,5,5,5,5,5,5,5] → display "40", score 100.
   - ARMS [1,1,1,1,1,1,1,1,1,1,1,1] → display "12", score 100.
   - PHQ-9 [0,0,0,0,0,0,0,0,0] → display "0", score 100.
   - IIEF [5,5,5,5,5] → display "25", score 100.
5. Smoke manual:
   - **EP-2:** popup aparece arriba-centro al cambiar de step, X cierra, auto-dismiss 6s funciona.
   - **EP-5:** chips se actualizan en vivo al modificar respuestas; valores coinciden con los del PDF al completar la EP.
   - **EP-6:** Tab navega entre opciones; números 1-N seleccionan en MSPSS, HES, ARMS, PHQ-9, Alimentación, IIEF, takesMeds, smoked, hasSexualActivity, medAccess, nicotina; números NO interfieren con inputs numéricos (vitales, antropometría, paraclínicos, actividad/sueño).

## Criterios de éxito

- Las 3 mejoras coexisten sin regresiones funcionales.
- Los chips muestran valores idénticos a los del reporte final (con la salvedad documentada de que el chip usa contexto SCA/DM2 = false).
- La navegación por teclado completa MSPSS sin tocar el mouse: Tab para empezar, números 1-7 por pregunta, Tab para siguiente pregunta.
- El popup top-center no tapa el contenido en steps con scroll interno.
- TypeScript, lint, build pasan limpios.

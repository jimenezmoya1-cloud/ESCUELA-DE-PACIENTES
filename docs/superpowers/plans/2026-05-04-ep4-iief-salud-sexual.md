# EP-4: IIEF-5 Sexual Health Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la sección actual de "Salud Sexual" (paso 13 del Questionnaire, 6 preguntas no scoreadas) con el IIEF-5 estándar (5 preguntas, 5-25 puntos), agregar gate "¿Tienes actividad sexual?" Sí/No, conectar al motor de scoring con curva piecewise (verde 22-25, amarillo 12-21, rojo 5-11), y mostrar el componente en el reporte solo cuando aplica (hombre + Sí).

**Architecture:**
- Nuevo flag `iiefAplica: boolean` en `ContextoClinico` (sigue el patrón de `takesMeds` de EP-3).
- Nuevo case `'Disfunción eréctil'` en `scoring.ts` con interpolación por tramos.
- Filtro defensivo en `recomputeAssessment` extendido para omitir 'Disfunción eréctil' cuando `!iiefAplica`.
- Wiring del flag por las 4 call sites: `QuestionnaireWrapper.tsx`, `actions.ts`, `ClinicalHistoryClient.tsx`, más el origen del valor en `Questionnaire.tsx`.

**Tech Stack:** TypeScript, Next.js 16, React 19. Sin tests JS — verificación por `npx tsc --noEmit` + `npm run lint` + `npm run build` + Node 24 strip-types numerical test + smoke manual.

**Spec source:** `docs/superpowers/specs/2026-05-04-ep4-iief-salud-sexual-design.md`

---

## File Structure

**Modificados (6):**
- `src/lib/clinical/types.ts` — agregar `iiefAplica: boolean` a `ContextoClinico`.
- `src/lib/clinical/scoring.ts` — nuevo case `'Disfunción eréctil'` + extender filtro en `recomputeAssessment`.
- `src/components/admin/clinical/Questionnaire.tsx` — state replace `erectileDysfunction` → `hasSexualActivity` + `iief`; validación case 13; render case 13; URL params en `generateUrl()`.
- `src/components/admin/clinical/QuestionnaireWrapper.tsx` — agregar `disfuncion_erectil` al map + filtro condicional por `iief_aplica`.
- `src/lib/clinical/actions.ts` — derivar `iiefAplica` del raw + pasarlo al contexto.
- `src/components/admin/clinical/ClinicalHistoryClient.tsx` — state `iiefAplica` derivado + extender `componentesVisibles` + pasar al contexto del recompute + agregar a deps array.

**Sin tocar:**
- `src/lib/clinical/constants.ts` (`SCORES_INICIALES` se queda con 13 — IIEF se introduce condicionalmente upstream).
- `src/components/admin/clinical/ReportPage*.tsx` — iteran dinámicamente.
- `dashboard-aggregations.ts`, `build-clinical-excel.ts` — verificar al implementar.
- DB schema.

---

## Task 1: Tipo `iiefAplica` + case scoring + filtro defensivo

**Files:**
- Modify: `src/lib/clinical/types.ts:1-8` (add field).
- Modify: `src/lib/clinical/scoring.ts` (new case in switch + extend filter in `recomputeAssessment`).

Estos dos cambios se commitean juntos: agregar el field al type rompe call sites (actions.ts, ClinicalHistoryClient.tsx) que se arreglan en Tasks 4 y 5.

- [ ] **Step 1: Extender `ContextoClinico`**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/types.ts`, localizar:

```ts
export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
  takesMeds: boolean
}
```

Reemplazar por:

```ts
export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
  takesMeds: boolean
  iiefAplica: boolean
}
```

- [ ] **Step 2: Agregar case `'Disfunción eréctil'` al switch en `scoring.ts`**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/scoring.ts`, localizar el `default:` del switch en `calcularPuntajeExacto` (al final del switch, antes de `}`). Insertar el nuevo case INMEDIATAMENTE ANTES del `default`:

Localizar:

```ts
    case 'Salud mental':
      // Doc PHQ-9: 0-4 mínima verde, 5-14 leve/moderada amarillo, ≥15 severa rojo.
      if (valor <= 4) return reglaDeTresRango(valor, 0, 4, 100, 80)
      if (valor <= 14) return reglaDeTresRango(valor, 5, 14, 79, 51)
      return reglaDeTresRango(valor, 15, 27, 50, 0)

    default:
      return 0
  }
}
```

Reemplazar por:

```ts
    case 'Salud mental':
      // Doc PHQ-9: 0-4 mínima verde, 5-14 leve/moderada amarillo, ≥15 severa rojo.
      if (valor <= 4) return reglaDeTresRango(valor, 0, 4, 100, 80)
      if (valor <= 14) return reglaDeTresRango(valor, 5, 14, 79, 51)
      return reglaDeTresRango(valor, 15, 27, 50, 0)

    case 'Disfunción eréctil':
      // IIEF-5: rango 5-25. Verde 22-25, amarillo 12-21, rojo 5-11.
      if (valor <= 11) return reglaDeTresRango(valor, 5, 11, 0, 50)
      if (valor <= 21) return reglaDeTresRango(valor, 12, 21, 51, 79)
      return reglaDeTresRango(valor, 22, 25, 80, 100)

    default:
      return 0
  }
}
```

- [ ] **Step 3: Extender el filtro defensivo en `recomputeAssessment`**

En el mismo archivo, localizar:

```ts
  // Filtro defensivo: si el paciente no toma medicamentos, omitir Acceso y Adherencia
  // del cómputo (no diluir el score global con valores neutros). El upstream
  // (QuestionnaireWrapper) ya filtra al guardar; este es defense-in-depth para
  // evaluaciones legacy y otras call sites.
  const filtered = contexto.takesMeds
    ? componentes
    : componentes.filter(
        (c) =>
          c.nombre !== 'Acceso a medicamentos' &&
          c.nombre !== 'Adherencia a medicamentos',
      )
```

Reemplazar por:

```ts
  // Filtro defensivo: omitir componentes que no aplican al paciente para no diluir
  // el score global. El upstream (QuestionnaireWrapper) ya filtra al guardar; este
  // es defense-in-depth para evaluaciones legacy y otras call sites.
  //   - Si !takesMeds: omitir Acceso + Adherencia.
  //   - Si !iiefAplica: omitir Disfunción eréctil.
  const filtered = componentes.filter((c) => {
    if (!contexto.takesMeds && (c.nombre === 'Acceso a medicamentos' || c.nombre === 'Adherencia a medicamentos')) return false
    if (!contexto.iiefAplica && c.nombre === 'Disfunción eréctil') return false
    return true
  })
```

- [ ] **Step 4: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head -10`

Expected: errores solo en los 2 call sites que construyen `ContextoClinico` sin `iiefAplica` (`actions.ts` y `ClinicalHistoryClient.tsx`). Sin errores en `scoring.ts` ni `types.ts`.

- [ ] **Step 5: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/types.ts src/lib/clinical/scoring.ts
git commit -m "feat(scoring): add Disfunción eréctil case and iiefAplica context flag"
```

---

## Task 2: Reemplazar el state, validación y render del case 13 en `Questionnaire.tsx`

**Files:**
- Modify: `src/components/admin/clinical/Questionnaire.tsx` (state inicial ~línea 184, validación ~línea 382, render case 13 ~líneas 1159-1213, getCaimedMessage no cambia).

- [ ] **Step 1: Reemplazar `erectileDysfunction` en el state inicial**

Localizar (~línea 184):

```ts
    erectileDysfunction: Array(6).fill(0),
```

Reemplazar por:

```ts
    hasSexualActivity: null as boolean | null,
    iief: Array(5).fill(0),
```

- [ ] **Step 2: Actualizar la validación del case 13**

Localizar (~línea 382):

```ts
      case 13: return formData.gender !== 'Masculino' || formData.erectileDysfunction.every(v => v >= 0);
```

Reemplazar por:

```ts
      case 13:
        if (formData.gender !== 'Masculino') return true;
        if (formData.hasSexualActivity === null) return false;
        if (formData.hasSexualActivity === false) return true;
        return formData.iief.every(v => v >= 1);
```

- [ ] **Step 3: Reemplazar el render del case 13**

Localizar el bloque del case 13 (~líneas 1159-1213). Comienza con `case 13:` y termina con el `);` justo antes de `case 14:`. Reemplazar TODO el bloque por:

```tsx
      case 13: {
        const setHasActivity = (v: boolean) => {
          if (v === false) {
            setFormData({ ...formData, hasSexualActivity: false, iief: Array(5).fill(0) });
          } else {
            setFormData({ ...formData, hasSexualActivity: true });
          }
        };
        const setIiefAnswer = (idx: number, val: number) => {
          const newIief = [...formData.iief];
          newIief[idx] = val;
          setFormData({ ...formData, iief: newIief });
        };
        const iiefQuestions: { question: string; options: { val: number; label: string }[] }[] = [
          {
            question: '¿Cómo calificarías tu confianza para conseguir y mantener una erección?',
            options: [
              { val: 1, label: 'Muy bajo' },
              { val: 2, label: 'Bajo' },
              { val: 3, label: 'Moderado' },
              { val: 4, label: 'Alto' },
              { val: 5, label: 'Muy alto' },
            ],
          },
          {
            question: '¿Con qué frecuencia tus erecciones fueron suficientemente firmes para penetrar a tu pareja?',
            options: [
              { val: 1, label: 'Casi nunca' },
              { val: 2, label: 'Pocas veces' },
              { val: 3, label: 'A veces' },
              { val: 4, label: 'La mayoría de las veces' },
              { val: 5, label: 'Casi siempre' },
            ],
          },
          {
            question: 'Durante las relaciones sexuales, ¿con qué frecuencia mantuviste la erección después de penetrar a tu pareja?',
            options: [
              { val: 1, label: 'Casi nunca' },
              { val: 2, label: 'Pocas veces' },
              { val: 3, label: 'A veces' },
              { val: 4, label: 'La mayoría de las veces' },
              { val: 5, label: 'Casi siempre' },
            ],
          },
          {
            question: 'Durante el coito, ¿qué tan difícil fue mantener la erección hasta completar el acto?',
            options: [
              { val: 1, label: 'Extremadamente difícil' },
              { val: 2, label: 'Muy difícil' },
              { val: 3, label: 'Difícil' },
              { val: 4, label: 'Algo difícil' },
              { val: 5, label: 'Sin dificultad' },
            ],
          },
          {
            question: 'Cuando intentaste tener relaciones, ¿qué tan satisfactorias fueron?',
            options: [
              { val: 1, label: 'Nada satisfactorias' },
              { val: 2, label: 'Poco satisfactorias' },
              { val: 3, label: 'Moderadamente satisfactorias' },
              { val: 4, label: 'Muy satisfactorias' },
              { val: 5, label: 'Extremadamente satisfactorias' },
            ],
          },
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Salud Sexual
            </h2>
            <p className="text-slate-600 font-medium">¿Tienes actividad sexual?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setHasActivity(true)}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  formData.hasSexualActivity === true
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-2xl block mb-2" aria-hidden="true">✓</span>
                <span className="font-bold text-slate-700">Sí</span>
              </button>
              <button
                type="button"
                onClick={() => setHasActivity(false)}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  formData.hasSexualActivity === false
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-2xl block mb-2" aria-hidden="true">✗</span>
                <span className="font-bold text-slate-700">No</span>
              </button>
            </div>

            {formData.hasSexualActivity === true && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {iiefQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {q.options.map(opt => (
                        <label
                          key={opt.val}
                          className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer transition-all text-xs text-center ${
                            formData.iief[idx] === opt.val
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`iief_${idx}`}
                            value={opt.val}
                            checked={formData.iief[idx] === opt.val}
                            onChange={() => setIiefAnswer(idx, opt.val)}
                            className="hidden"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
```

- [ ] **Step 4: Agregar params al `generateUrl()`**

Localizar (~línea 317):

```ts
      takesMeds: formData.takesMeds ? 'true' : 'false',
```

Insertar INMEDIATAMENTE DESPUÉS:

```ts
      // IIEF-5: solo aplica si gender=Masculino y respondió Sí al gate.
      disfuncion_erectil: formData.iief.reduce((a, b) => a + b, 0).toString(),
      iief_aplica: (formData.gender === 'Masculino' && formData.hasSexualActivity === true) ? 'true' : 'false',
```

- [ ] **Step 5: Verificar TypeScript en este archivo**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | grep "Questionnaire.tsx" | head`

Expected: sin output (cero errores en `Questionnaire.tsx`). Si hay error sobre `formData.erectileDysfunction`, confirmar que el state inicial cambió en Step 1.

- [ ] **Step 6: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint 2>&1 | grep "Questionnaire.tsx" | head`
Expected: sin nuevos errores en este archivo.

- [ ] **Step 7: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/Questionnaire.tsx
git commit -m "feat(ep): replace case 13 with IIEF-5 gate and 5 questions"
```

---

## Task 3: Wiring en `QuestionnaireWrapper.tsx`

**Files:**
- Modify: `src/components/admin/clinical/QuestionnaireWrapper.tsx` (URL_TO_COMPONENTE map ~líneas 15-29, filter ~líneas 98-105).

- [ ] **Step 1: Agregar `disfuncion_erectil` al map**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/components/admin/clinical/QuestionnaireWrapper.tsx`, localizar:

```ts
const URL_TO_COMPONENTE: Record<string, string> = {
  peso: "Peso",
  presion_arterial: "Presión arterial",
  glucosa: "Glucosa",
  nicotina: "Nicotina",
  actividad: "Actividad física",
  sueno: "Sueño",
  empoderamiento: "Empoderamiento",
  adherencia: "Adherencia a medicamentos",
  acceso: "Acceso a medicamentos",
  red_apoyo: "Red de apoyo",
  alimentacion: "Alimentación",
  colesterol: "Colesterol",
  salud_mental: "Salud mental",
}
```

Reemplazar por:

```ts
const URL_TO_COMPONENTE: Record<string, string> = {
  peso: "Peso",
  presion_arterial: "Presión arterial",
  glucosa: "Glucosa",
  nicotina: "Nicotina",
  actividad: "Actividad física",
  sueno: "Sueño",
  empoderamiento: "Empoderamiento",
  adherencia: "Adherencia a medicamentos",
  acceso: "Acceso a medicamentos",
  red_apoyo: "Red de apoyo",
  alimentacion: "Alimentación",
  colesterol: "Colesterol",
  salud_mental: "Salud mental",
  disfuncion_erectil: "Disfunción eréctil",
}
```

- [ ] **Step 2: Extender el filtro condicional**

Localizar (~líneas 98-105):

```ts
          const takesMeds = params.get("takesMeds") !== "false"
          const components: ComponenteScore[] = Object.entries(URL_TO_COMPONENTE)
            .filter(([key]) => takesMeds || (key !== "adherencia" && key !== "acceso"))
            .map(([key, nombreComp]) => {
              const raw = params.get(key)
              const valorNum = raw ? parseFloat(raw) : 0
              return { nombre: nombreComp, valor: isNaN(valorNum) ? 0 : valorNum, puntaje: 0 }
            })
```

Reemplazar por:

```ts
          const takesMeds = params.get("takesMeds") !== "false"
          const iiefAplica = params.get("iief_aplica") === "true"
          const components: ComponenteScore[] = Object.entries(URL_TO_COMPONENTE)
            .filter(([key]) => {
              if (!takesMeds && (key === "adherencia" || key === "acceso")) return false
              if (!iiefAplica && key === "disfuncion_erectil") return false
              return true
            })
            .map(([key, nombreComp]) => {
              const raw = params.get(key)
              const valorNum = raw ? parseFloat(raw) : 0
              return { nombre: nombreComp, valor: isNaN(valorNum) ? 0 : valorNum, puntaje: 0 }
            })
```

- [ ] **Step 3: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | grep "QuestionnaireWrapper.tsx" | head`
Expected: sin output.

- [ ] **Step 4: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/QuestionnaireWrapper.tsx
git commit -m "feat(clinical): wire disfuncion_erectil into QuestionnaireWrapper map and filter"
```

---

## Task 4: Wiring server-side en `actions.ts`

**Files:**
- Modify: `src/lib/clinical/actions.ts:54-65` (extend context construction in `saveAssessment`).

- [ ] **Step 1: Derivar `iiefAplica` y agregar al contexto**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/actions.ts`, localizar:

```ts
  // Derivar takesMeds del raw_questionnaire. Default true (conservador):
  // si el campo no existe, se comporta idéntico al pre-EP-3.
  const rawTakesMeds = (input.raw_questionnaire as Record<string, unknown> | null | undefined)?.takesMeds
  const takesMeds = rawTakesMeds !== 'false'

  const contexto: ContextoClinico = {
    isSCA: input.is_sca,
    isDM2: input.is_dm2,
    isPluripatologico: input.is_pluripatologico,
    isPocaExpectativa: input.is_poca_expectativa,
    edad,
    takesMeds,
  }
```

Reemplazar por:

```ts
  // Derivar takesMeds del raw_questionnaire. Default true (conservador):
  // si el campo no existe, se comporta idéntico al pre-EP-3.
  const rawTakesMeds = (input.raw_questionnaire as Record<string, unknown> | null | undefined)?.takesMeds
  const takesMeds = rawTakesMeds !== 'false'

  // Derivar iiefAplica del raw_questionnaire. Default false (omitir IIEF si no
  // se sabe explícitamente que aplica — más conservador que takesMeds porque
  // mostrar IIEF inadvertidamente sería peor que ocultarlo).
  const rawIiefAplica = (input.raw_questionnaire as Record<string, unknown> | null | undefined)?.iief_aplica
  const iiefAplica = rawIiefAplica === 'true'

  const contexto: ContextoClinico = {
    isSCA: input.is_sca,
    isDM2: input.is_dm2,
    isPluripatologico: input.is_pluripatologico,
    isPocaExpectativa: input.is_poca_expectativa,
    edad,
    takesMeds,
    iiefAplica,
  }
```

- [ ] **Step 2: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | grep "actions.ts" | head`
Expected: sin output.

Quedará 1 error pendiente en `ClinicalHistoryClient.tsx` (Task 5).

- [ ] **Step 3: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/actions.ts
git commit -m "feat(clinical): derive iiefAplica from raw and pass to scoring context"
```

---

## Task 5: Wiring client-side en `ClinicalHistoryClient.tsx`

**Files:**
- Modify: `src/components/admin/clinical/ClinicalHistoryClient.tsx` (state ~línea 90-93, componentesVisibles ~línea 102-108, useEffect ~línea 110-131).

- [ ] **Step 1: Agregar state `iiefAplica`**

Localizar el bloque del `useState` para `takesMeds` (~líneas 90-93):

```tsx
  const [takesMeds] = useState<boolean>(() => {
    const raw = initialAssessment?.raw_questionnaire as Record<string, unknown> | null | undefined
    return raw?.takesMeds !== 'false'
  })
```

Insertar INMEDIATAMENTE DESPUÉS:

```tsx
  const [iiefAplica] = useState<boolean>(() => {
    const raw = initialAssessment?.raw_questionnaire as Record<string, unknown> | null | undefined
    return raw?.iief_aplica === 'true'
  })
```

- [ ] **Step 2: Extender `componentesVisibles`**

Localizar (~líneas 102-108):

```tsx
  const componentesVisibles = takesMeds
    ? componentes
    : componentes.filter(
        (c) =>
          c.nombre !== 'Acceso a medicamentos' &&
          c.nombre !== 'Adherencia a medicamentos',
      )
```

Reemplazar por:

```tsx
  const componentesVisibles = componentes.filter((c) => {
    if (!takesMeds && (c.nombre === 'Acceso a medicamentos' || c.nombre === 'Adherencia a medicamentos')) return false
    if (!iiefAplica && c.nombre === 'Disfunción eréctil') return false
    return true
  })
```

- [ ] **Step 3: Pasar `iiefAplica` al recompute + agregar a deps**

Localizar (~líneas 110-131):

```tsx
  useEffect(() => {
    const result = recomputeAssessment(componentes, {
      isSCA,
      isDM2,
      isPluripatologico,
      isPocaExpectativa,
      edad: edadCalculada,
      takesMeds,
    })
    // recomputeAssessment puede devolver menos componentes si filtró Acceso/Adherencia.
    // Mergeamos los puntajes recomputados sobre el state completo, preservando los
    // componentes filtrados intactos (con su valor original) para evitar perder data
    // si algún día se reactivara takesMeds.
    setComponentes((prev) =>
      prev.map((c) => {
        const updated = result.components.find((rc) => rc.nombre === c.nombre)
        return updated ? { ...c, puntaje: updated.puntaje } : c
      }),
    )
    setPaciente((prev) => ({ ...prev, scoreGlobal: result.scoreGlobal, nivel: result.nivel, metaScore: result.metaScore }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSCA, isDM2, isPluripatologico, isPocaExpectativa, edadCalculada, valoresKey, takesMeds])
```

Reemplazar por:

```tsx
  useEffect(() => {
    const result = recomputeAssessment(componentes, {
      isSCA,
      isDM2,
      isPluripatologico,
      isPocaExpectativa,
      edad: edadCalculada,
      takesMeds,
      iiefAplica,
    })
    // recomputeAssessment puede devolver menos componentes si filtró Acceso/Adherencia/Disfunción eréctil.
    // Mergeamos los puntajes recomputados sobre el state completo, preservando los
    // componentes filtrados intactos (con su valor original) para evitar perder data
    // si algún día se reactivaran los flags.
    setComponentes((prev) =>
      prev.map((c) => {
        const updated = result.components.find((rc) => rc.nombre === c.nombre)
        return updated ? { ...c, puntaje: updated.puntaje } : c
      }),
    )
    setPaciente((prev) => ({ ...prev, scoreGlobal: result.scoreGlobal, nivel: result.nivel, metaScore: result.metaScore }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSCA, isDM2, isPluripatologico, isPocaExpectativa, edadCalculada, valoresKey, takesMeds, iiefAplica])
```

- [ ] **Step 4: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: cero errores.

- [ ] **Step 5: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint 2>&1 | grep "ClinicalHistoryClient.tsx" | head`
Expected: sin nuevos errores.

- [ ] **Step 6: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/ClinicalHistoryClient.tsx
git commit -m "feat(clinical): wire iiefAplica in ClinicalHistoryClient and hide Disfunción eréctil"
```

---

## Task 6: Build + numeric verification + smoke

**Files:** ninguno modificado.

- [ ] **Step 1: Build de producción**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build`
Expected: build exitoso, ~19 páginas estáticas.

- [ ] **Step 2: Verificación numérica de la curva via Node 24 strip-types**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
cat > /tmp/ep4-verify.mts <<'EOF'
// Self-contained verification of the IIEF curve.
const reglaDeTresRango = (v: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  if (v <= Math.min(inMin, inMax)) return outMin
  if (v >= Math.max(inMin, inMax)) return outMax
  return Math.round(outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin))
}

const iief = (v: number) => {
  if (v <= 11) return reglaDeTresRango(v, 5, 11, 0, 50)
  if (v <= 21) return reglaDeTresRango(v, 12, 21, 51, 79)
  return reglaDeTresRango(v, 22, 25, 80, 100)
}

const test = (n: string, a: number, e: number) => console.log(`  [${a===e?'OK ':'FAIL'}] ${n}: ${a} (esperado ${e})`)

console.log('Disfunción eréctil:')
test('5 (mínimo)',   iief(5), 0)
test('11 (límite rojo)', iief(11), 50)
test('12 (inicio amarillo)', iief(12), 51)
test('15 (medio amarillo)', iief(15), 60)
test('21 (límite amarillo)', iief(21), 79)
test('22 (inicio verde)', iief(22), 80)
test('25 (máximo)', iief(25), 100)
EOF
node --experimental-strip-types --no-warnings /tmp/ep4-verify.mts
rm /tmp/ep4-verify.mts
```

Expected output: las 7 líneas `OK` con valores esperados.

- [ ] **Step 3: Smoke manual end-to-end**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

El controller pasará al usuario los siguientes casos para validación visual:

**Caso A — Hombre + Sí + 5 respuestas máximas:**
1. Crear paciente, sexo Masculino. Llegar al paso 13.
2. Click "Sí". Aparecen 5 preguntas.
3. Marcar la última opción de cada pregunta (5 puntos cada una). Total IIEF = 25.
4. Avanzar y completar el cuestionario.
5. En el reporte: el componente "Disfunción eréctil" aparece con score = **100**.

**Caso B — Hombre + Sí + 5 respuestas mínimas:**
1. Mismo flujo, marcar la primera opción de cada pregunta (1 punto cada una). Total = 5.
2. Score componente = **0**. Aparece como rojo en el reporte.

**Caso C — Hombre + No:**
1. En el paso 13, click "No". Las 5 preguntas NO aparecen. Avanzar.
2. En el reporte: "Disfunción eréctil" NO aparece en NINGUNA parte (ni "Perfil detallado", ni "Top peores", ni el editor).
3. Score global se calcula sin este componente.

**Caso D — Mujer:**
1. Crear paciente, sexo Femenino. El paso 13 se SALTA automáticamente (debería pasar de 12 → 14 directamente).
2. En el reporte: "Disfunción eréctil" NO aparece.

**Caso E — Round-trip:**
1. Tomar paciente del Caso A (hombre + Sí + IIEF=25). Entrar a modo edición. Cambiar algún otro componente (e.g., HbA1c). Click "Guardar".
2. Recargar la página.
3. "Disfunción eréctil" debe SEGUIR visible con el mismo score = 100 (verifica que `iief_aplica` se preserva en el round-trip).

**Caso F — Hombre + Sí + intermedio:**
1. Hombre + Sí + 5 respuestas con valor 3 cada una. Total = 15.
2. Score = **60** (medio del tramo amarillo).

Detener el dev server.

- [ ] **Step 4: Commit final si hubo ajustes**

Si los smokes pasaron sin ajustes, NO hacer commit vacío.

---

## Notas para el implementador

- **No agregar IIEF a `SCORES_INICIALES`.** Se introduce condicionalmente en `QuestionnaireWrapper.tsx`. Esto preserva retrocompatibilidad con evaluaciones legacy.
- **No tocar las validaciones de pasos 1-12 ni 14+** en `Questionnaire.tsx`. Solo case 13.
- **No tocar `getCaimedMessage` para case 13.** El mensaje actual se mantiene ("La salud cardiovascular se refleja en todo tu cuerpo. En CAIMED cuidamos tu bienestar integral.").
- **El skip por gender ya está implementado** en `handleNext` línea ~198 (`step === 12 && gender !== 'Masculino' → setStep(14)`). No tocar.
- **El round-trip ya está implementado** por EP-3 (`handleSaveAssessment` preserva `raw_questionnaire`). No requiere fix adicional.
- **Pre-existing TS errors en `.next/types/routes.d.ts`** son ruido, ignorar.
- **Pre-existing lint errors** en otras carpetas (`.worktrees/`, `.next/`) son ruido. Solo mirar errores en archivos editados.

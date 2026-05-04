# EP-3: Scoring Engine Corrections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir 3 curvas del motor de scoring (Acceso a medicamentos, Nicotina, Actividad física) y agregar filtro defensivo para omitir Acceso + Adherencia del cómputo y del UI cuando `takesMeds=false`, manejado vía nuevo flag `takesMeds` en `ContextoClinico`.

**Architecture:**
- Cambios localizados en `scoring.ts` (3 cases del switch + filtro en `recomputeAssessment`).
- Extensión del `ContextoClinico` con un campo boolean `takesMeds`.
- Wiring del flag en las 2 call sites server/client de `recomputeAssessment`.
- Derivación visible de componentes en `ClinicalHistoryClient` para ocultar Acceso + Adherencia del editor + reportes cuando aplique.

**Tech Stack:** TypeScript, Next.js 16, React 19. Sin tests JS — verificación por `npx tsc --noEmit` + `npm run lint` + `npm run build` + smoke manual con casos numéricos exactos.

**Spec source:** `docs/superpowers/specs/2026-05-04-ep3-scoring-corrections-design.md`

---

## File Structure

**Modificados (4):**
- `src/lib/clinical/types.ts` — agregar `takesMeds: boolean` a `ContextoClinico`.
- `src/lib/clinical/scoring.ts` — 3 cases (Acceso, Nicotina, Actividad) + filtro en `recomputeAssessment`.
- `src/lib/clinical/actions.ts` — derivar `takesMeds` del `raw_questionnaire` y pasarlo al contexto en `saveAssessment`.
- `src/components/admin/clinical/ClinicalHistoryClient.tsx` — state `takesMeds` + `componentesVisibles` derivado + wiring a `recomputeAssessment` y `ReportPage1/2/3`.

**Sin tocar:**
- `src/components/admin/clinical/Questionnaire.tsx` — captura sigue intacta.
- `src/components/admin/clinical/QuestionnaireWrapper.tsx` — ya filtra upstream y pasa `raw_questionnaire.takesMeds`.
- `src/lib/clinical/constants.ts` (`SCORES_INICIALES`).
- `src/components/admin/clinical/ReportPage*.tsx` — reciben `componentesVisibles` como prop y siguen iterando dinámicamente.
- `src/lib/clinical/dashboard-aggregations.ts`, `src/lib/clinical/build-clinical-excel.ts`.
- DB schema.

---

## Task 1: Agregar `takesMeds` a `ContextoClinico`

**Files:**
- Modify: `src/lib/clinical/types.ts:1-7`

- [ ] **Step 1: Agregar campo al type**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/types.ts`, localizar:

```ts
export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
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
}
```

- [ ] **Step 2: Verificar TypeScript reporta los call sites que faltan**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head -20`

Expected: errores de tipo en los call sites que construyen `ContextoClinico` sin `takesMeds`. Específicamente al menos en:
- `src/lib/clinical/actions.ts:54-60`
- `src/components/admin/clinical/ClinicalHistoryClient.tsx:99-105`

Estos errores SE RESUELVEN en Tasks 3 y 4. No commitear todavía — Task 2 también modifica `scoring.ts` y se commitea junto.

---

## Task 2: Aplicar las 3 correcciones de curva + filtro defensivo en `scoring.ts`

**Files:**
- Modify: `src/lib/clinical/scoring.ts:42-47` (Acceso), `:107-118` (Nicotina), `:93-97` (Actividad), `:237-249` (recomputeAssessment).

- [ ] **Step 1: Corregir case 'Acceso a medicamentos'**

Localizar en `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/scoring.ts`:

```ts
    case 'Acceso a medicamentos':
      // Doc: 1=Total verde, 2=Parcial amarillo, 3=Negación rojo.
      if (valor === 1) return 100
      if (valor === 2) return 65
      return 25
```

Reemplazar por:

```ts
    case 'Acceso a medicamentos':
      // Doc: 1=Total verde, 2=Parcial amarillo, 3=Negación rojo.
      // Usuario 2026-05-04: Sí=100, Parcialmente=66, No=1.
      if (valor === 1) return 100
      if (valor === 2) return 66
      return 1
```

- [ ] **Step 2: Corregir case 'Nicotina'**

Localizar:

```ts
    case 'Nicotina':
      // Doc: nunca/ex>5a verde, vapeador/humo 2da mano amarillo, fumador rojo.
      // Mapeo del cuestionario:
      //   1 = no fumador, 2 = ex >5 años, 3 = ex 1-5 años, 4 = ex <1 año,
      //   5 = fumador actual cigarrillo, 6 = fumador electrónico/vapeador.
      if (valor === 1) return 100 // verde
      if (valor === 2) return 90  // verde (ex ≥5a)
      if (valor === 3) return 70  // amarillo (ex 1-5a)
      if (valor === 4) return 55  // amarillo (ex <1a, riesgo de recaída)
      if (valor === 5) return 0   // rojo (fumador actual)
      if (valor === 6) return 60  // amarillo (vapeador / humo 2da mano)
      return 0
```

Reemplazar por:

```ts
    case 'Nicotina':
      // Mapeo del cuestionario:
      //   1 = no fumador, 2 = ex >5 años, 3 = ex 1-5 años, 4 = ex <1 año,
      //   5 = fumador actual cigarrillo, 6 = fumador electrónico/vapeador.
      // Usuario 2026-05-04: vapeador ahora cuenta igual que fumador actual (0).
      if (valor === 1) return 100  // No fumador
      if (valor === 2) return 75   // Ex >5 años
      if (valor === 3) return 60   // Ex 1-5 años
      if (valor === 4) return 25   // Ex <1 año
      if (valor === 5) return 0    // Fumador actual cigarrillo
      if (valor === 6) return 0    // Vapeador / cigarrillo electrónico
      return 0
```

- [ ] **Step 3: Corregir case 'Actividad física'**

Localizar:

```ts
    case 'Actividad física':
      // Doc: ≥120 min/sem verde, 60-119 amarillo, <60 rojo.
      if (valor >= 120) return reglaDeTresRango(valor, 120, 300, 80, 100)
      if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
      return reglaDeTresRango(valor, 0, 59, 0, 50)
```

Reemplazar por:

```ts
    case 'Actividad física':
      // Doc: ≥120 min/sem verde, 60-119 amarillo, <60 rojo.
      // Usuario 2026-05-04: 100 puntos a 150 min (no a 300).
      if (valor >= 120) return reglaDeTresRango(valor, 120, 150, 80, 100)
      if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
      return reglaDeTresRango(valor, 0, 59, 0, 50)
```

- [ ] **Step 4: Filtro defensivo en `recomputeAssessment`**

Localizar al final del archivo:

```ts
export const recomputeAssessment = (
  componentes: ComponenteScore[],
  contexto: ContextoClinico,
): { components: ComponenteScore[]; scoreGlobal: number; nivel: 'Verde' | 'Amarillo' | 'Rojo'; metaScore: number } => {
  const recomputed = componentes.map((c) => {
    const valorNum = typeof c.valor === 'number' ? c.valor : parseFloat(String(c.valor).replace(',', '.')) || 0
    return { ...c, puntaje: calcularPuntajeExacto(c.nombre, valorNum, contexto) }
  })
  const scoreGlobal = calcularScoreGlobal(recomputed)
  const nivel = determinarNivel(scoreGlobal)
  const metaScore = calcularMetaScore(scoreGlobal)
  return { components: recomputed, scoreGlobal, nivel, metaScore }
}
```

Reemplazar por:

```ts
export const recomputeAssessment = (
  componentes: ComponenteScore[],
  contexto: ContextoClinico,
): { components: ComponenteScore[]; scoreGlobal: number; nivel: 'Verde' | 'Amarillo' | 'Rojo'; metaScore: number } => {
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
  const recomputed = filtered.map((c) => {
    const valorNum = typeof c.valor === 'number' ? c.valor : parseFloat(String(c.valor).replace(',', '.')) || 0
    return { ...c, puntaje: calcularPuntajeExacto(c.nombre, valorNum, contexto) }
  })
  const scoreGlobal = calcularScoreGlobal(recomputed)
  const nivel = determinarNivel(scoreGlobal)
  const metaScore = calcularMetaScore(scoreGlobal)
  return { components: recomputed, scoreGlobal, nivel, metaScore }
}
```

- [ ] **Step 5: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head -20`

Expected: errores **solo** en los call sites de `recomputeAssessment` que aún no pasan `takesMeds` en su contexto (`actions.ts:54-60` y `ClinicalHistoryClient.tsx:99-105`). Sin errores en `scoring.ts` ni `types.ts`.

- [ ] **Step 6: Commit Tasks 1+2 juntos**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/types.ts src/lib/clinical/scoring.ts
git commit -m "feat(scoring): correct 3 curves and add takesMeds context flag"
```

(Tasks 1 y 2 se commitean juntos porque el cambio del type fuerza errores que solo se resuelven con el filtro nuevo. Tasks 3 y 4 cierran los errores en sus respectivos call sites.)

---

## Task 3: Wiring server-side en `actions.ts`

**Files:**
- Modify: `src/lib/clinical/actions.ts:6-7` (import) y `:54-61` (construcción del contexto en `saveAssessment`).

- [ ] **Step 1: Importar `ContextoClinico` type**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/lib/clinical/actions.ts`, localizar:

```ts
import type { ComponenteScore, AlertaItem, CreatorSignature } from "./types"
```

Reemplazar por:

```ts
import type { ComponenteScore, AlertaItem, CreatorSignature, ContextoClinico } from "./types"
```

- [ ] **Step 2: Derivar `takesMeds` del raw y pasarlo al contexto**

Localizar el bloque de construcción del contexto (líneas ~54-61):

```ts
  const contexto = {
    isSCA: input.is_sca,
    isDM2: input.is_dm2,
    isPluripatologico: input.is_pluripatologico,
    isPocaExpectativa: input.is_poca_expectativa,
    edad,
  }
  const { components, scoreGlobal, nivel, metaScore } = recomputeAssessment(input.components, contexto)
```

Reemplazar por:

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
  const { components, scoreGlobal, nivel, metaScore } = recomputeAssessment(input.components, contexto)
```

- [ ] **Step 3: Verificar TypeScript en este archivo**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | grep "actions.ts" | head`

Expected: sin output (cero errores en `actions.ts`).

- [ ] **Step 4: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/actions.ts
git commit -m "feat(clinical): wire takesMeds to scoring context in saveAssessment"
```

---

## Task 4: Wiring client-side en `ClinicalHistoryClient.tsx`

**Files:**
- Modify: `src/components/admin/clinical/ClinicalHistoryClient.tsx` — agregar state `takesMeds` (~línea 90), derivar `componentesVisibles`, actualizar `useEffect` de recomputo (~línea 98-109), pasar `componentesVisibles` a `ReportPage1` (línea 222) y `ReportPage2` (línea 237).

- [ ] **Step 1: Agregar state `takesMeds`**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/components/admin/clinical/ClinicalHistoryClient.tsx`, localizar el bloque de useState (líneas ~80-90):

```tsx
  const [paciente, setPaciente] = useState<DatosPaciente>(buildPaciente())
  const [componentes, setComponentes] = useState<ComponenteScore[]>(initialAssessment?.components ?? SCORES_INICIALES)
  const [alertas, setAlertas] = useState<DatosAlertas>(
    initialAssessment
      ? { criticas: initialAssessment.alertas_criticas, orientadoras: initialAssessment.alertas_orientadoras }
      : ALERTAS_INICIALES,
  )
  const [isSCA, setIsSCA] = useState(initialAssessment?.is_sca ?? false)
  const [isDM2, setIsDM2] = useState(initialAssessment?.is_dm2 ?? false)
  const [isPluripatologico, setIsPluripatologico] = useState(initialAssessment?.is_pluripatologico ?? false)
  const [isPocaExpectativa, setIsPocaExpectativa] = useState(initialAssessment?.is_poca_expectativa ?? false)
  const [edadCalculada, setEdadCalculada] = useState(0)
```

Inmediatamente después del state `isPocaExpectativa` (entre `setIsPocaExpectativa` y `edadCalculada`), agregar:

```tsx
  const [takesMeds] = useState<boolean>(() => {
    const raw = initialAssessment?.raw_questionnaire as Record<string, unknown> | null | undefined
    return raw?.takesMeds !== 'false'
  })
```

(Sin setter porque el flag no se modifica desde este componente — establecido al crear la EP en `Questionnaire`.)

- [ ] **Step 2: Derivar `componentesVisibles`**

Inmediatamente después de la declaración de `valoresKey` (línea ~96):

```tsx
  const valoresKey = componentes.map((c) => c.valor).join("|")
```

Agregar:

```tsx
  const componentesVisibles = takesMeds
    ? componentes
    : componentes.filter(
        (c) =>
          c.nombre !== 'Acceso a medicamentos' &&
          c.nombre !== 'Adherencia a medicamentos',
      )
```

- [ ] **Step 3: Actualizar el `useEffect` de recomputo**

Localizar (líneas ~98-109):

```tsx
  useEffect(() => {
    const result = recomputeAssessment(componentes, {
      isSCA,
      isDM2,
      isPluripatologico,
      isPocaExpectativa,
      edad: edadCalculada,
    })
    setComponentes(result.components)
    setPaciente((prev) => ({ ...prev, scoreGlobal: result.scoreGlobal, nivel: result.nivel, metaScore: result.metaScore }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSCA, isDM2, isPluripatologico, isPocaExpectativa, edadCalculada, valoresKey])
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

- [ ] **Step 4: Pasar `componentesVisibles` a las report pages**

Localizar (línea ~222):

```tsx
          componentes={componentes}
```

(Aparece dos veces: una en `<ReportPage1>` línea ~222, otra en `<ReportPage2>` línea ~237.)

En **ambas** ocurrencias dentro del bloque de `<ReportPage1 ... componentes={componentes}` y `<ReportPage2 ... componentes={componentes}`, reemplazar por:

```tsx
          componentes={componentesVisibles}
```

(`ReportPage3` no recibe `componentes` así que no se toca.)

- [ ] **Step 5: Verificar TypeScript**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head -10`

Expected: cero errores. Si TS reclama por el tipo de `raw_questionnaire`, confirmar que el cast en Step 1 (`as Record<string, unknown> | null | undefined`) está presente.

- [ ] **Step 6: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint`

Expected: sin nuevos errores ni warnings en este archivo.

- [ ] **Step 7: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/ClinicalHistoryClient.tsx
git commit -m "feat(clinical): wire takesMeds in ClinicalHistoryClient and hide Acceso/Adherencia"
```

---

## Task 5: Build de producción + verificación numérica + smoke

**Files:** ninguno modificado.

- [ ] **Step 1: Build de producción**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build`
Expected: build exitoso, sin errores TypeScript ni lint, ~19 páginas estáticas generadas.

- [ ] **Step 2: Verificación numérica de las 3 curvas vía Node 24 strip-types**

Node 24 soporta strip-types nativamente (`tsx` no está instalado en este repo). Crear un archivo temporal y ejecutarlo:

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
cat > /tmp/ep3-verify.mts <<'EOF'
import { calcularPuntajeExacto } from './src/lib/clinical/scoring.ts'
const ctx = { isSCA: false, isDM2: false, isPluripatologico: false, isPocaExpectativa: false, edad: 40, takesMeds: true }
console.log('Acceso:')
console.log('  Sí:        ', calcularPuntajeExacto('Acceso a medicamentos', 1, ctx), '→ esperado 100')
console.log('  Parcial:   ', calcularPuntajeExacto('Acceso a medicamentos', 2, ctx), '→ esperado 66')
console.log('  No:        ', calcularPuntajeExacto('Acceso a medicamentos', 3, ctx), '→ esperado 1')
console.log('Nicotina:')
const nicotinaExp = [100, 75, 60, 25, 0, 0]
for (const v of [1, 2, 3, 4, 5, 6]) {
  console.log(`  código ${v}:  `, calcularPuntajeExacto('Nicotina', v, ctx), `→ esperado ${nicotinaExp[v-1]}`)
}
console.log('Actividad:')
const actExp: Record<number, number> = { 0: 0, 60: 51, 120: 80, 150: 100, 200: 100, 300: 100 }
for (const v of [0, 60, 120, 150, 200, 300]) {
  console.log(`  ${v} min:    `, calcularPuntajeExacto('Actividad física', v, ctx), `→ esperado ${actExp[v]}`)
}
EOF
node --experimental-strip-types --no-warnings /tmp/ep3-verify.mts
rm /tmp/ep3-verify.mts
```

Expected output: cada línea muestra valor calculado seguido de "→ esperado X" donde ambos coinciden.

Si por alguna razón el strip-types no funciona (Node version mismatch, cambios en flags), omitir este step y confiar en el smoke manual del Step 3.

- [ ] **Step 3: Smoke manual end-to-end con casos del usuario**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

Esto requiere autenticación admin. Esquema de los casos a verificar (el controller pasará esto al usuario para validación visual):

**Caso A — Paciente nuevo, takesMeds=true, valores estándar:**
1. Crear paciente y abrir EP.
2. Completar el cuestionario con `Acceso = Parcialmente`. Al final del flujo, en el reporte verificar que el componente Acceso muestra **66** puntos.
3. Repetir con `Acceso = No`: debe mostrar **1**.

**Caso B — Paciente nuevo, fumador electrónico (vapeador):**
1. En el paso de tabaquismo, marcar fumador electrónico.
2. En el reporte, Nicotina debe mostrar **0** (anteriormente daba 60).

**Caso C — Paciente nuevo, actividad física = 150 min/sem:**
1. En el paso de actividad, ingresar 150 minutos.
2. En el reporte, Actividad física debe mostrar **100** (anteriormente daba ~83).

**Caso D — Paciente nuevo, takesMeds=false:**
1. Marcar "No tomo medicamentos" en el paso 7.
2. En el reporte:
   - El "Perfil de Salud Detallado" no muestra Acceso a medicamentos ni Adherencia a medicamentos.
   - El "Top peores componentes" tampoco las muestra.
   - El editor (modo edición) tampoco las muestra.
   - El score global se calcula sobre 11 componentes (no 13).
3. Generar el PDF y verificar que las 2 escalas no aparecen ahí tampoco.

**Caso E — Paciente legacy en DB con `takesMeds=true` y los 13 componentes:**
1. Abrir un paciente con EP existente (creada antes de este branch).
2. Verificar que el reporte se ve idéntico al que se veía antes (excepto por las 3 nuevas curvas que aplican si los valores caen en sus tramos).
3. Sin re-save: el comportamiento es lazy (recompute en client-side al abrir).

Detener el dev server con Ctrl+C después de validar.

- [ ] **Step 4: Commit final si hubo ajustes**

Si los smokes pasaron sin ajustes, NO hacer commit vacío. Si hubo correcciones menores, commitearlas con mensaje descriptivo.

---

## Notas para el implementador

- **No agregar tests JS:** este proyecto no tiene framework de tests. Verificación es typecheck + lint + build + smoke. La verificación numérica del Step 2 de Task 5 es una herramienta opcional.
- **No tocar `scoring.ts` fuera de los 3 cases especificados + `recomputeAssessment`.** El resto del switch (Empoderamiento, Adherencia, Peso, Glucosa, Sueño, Red de apoyo, Alimentación, Colesterol, Salud mental, Presión arterial) sigue intacto.
- **No agregar UI para toggle `takesMeds`** en `ClinicalHistoryClient`. El flag es read-only desde la perspectiva del editor; se establece en `Questionnaire`.
- **Si TS reclama por el cast `raw_questionnaire as Record<string, unknown>`**, validar el tipo real en `database.ts` (probablemente `Json | null`). Ajustar el cast si es necesario.
- **Pre-existing TS errors en `.next/types/routes.d.ts`** son ruido, ignorar.
- **El filtro defensivo en `recomputeAssessment` es redundante** con el filtro upstream en `QuestionnaireWrapper.tsx:98-105`. Es defensa en profundidad para legacy data y otras call sites — no lo elimines.

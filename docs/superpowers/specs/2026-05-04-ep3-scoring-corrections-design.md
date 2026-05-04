# Spec EP-3: Correcciones del motor de scoring

**Fecha:** 2026-05-04
**Sub-proyecto:** EP-3 (de la descomposición de 6 sub-proyectos del rework de la Evaluación Preventiva)

## Contexto

El motor de scoring actual ([scoring.ts](../../src/lib/clinical/scoring.ts)) traduce ~13 escalas heterogéneas a un puntaje 0-100 vía interpolación lineal por tramos. Comparando contra el documento técnico (`insumos_construccion/LÓGICA, ORIGEN DE DATOS Y MODELO DE ATENCIÓN (1).pdf`) y las reglas explícitas del usuario, hay 3 curvas con valores incorrectos y 1 caso de manejo de "no medicamentos" que necesita defense-in-depth.

## Alcance

### IN

- Corrección de 3 curvas en `calcularPuntajeExacto`: Acceso a medicamentos, Nicotina, Actividad física.
- Filtro defensivo en `recomputeAssessment` para omitir Acceso + Adherencia cuando `takesMeds=false`.
- Wiring del flag `takesMeds` por las 3 call sites de `recomputeAssessment` (a través de `ContextoClinico`).
- Hide de Acceso/Adherencia en el editor de scores de `ClinicalHistoryClient` cuando `takesMeds=false`.

### OUT (otros sub-proyectos)

- IIEF / disfunción eréctil (EP-4: salud sexual completa).
- Display de score en vivo en chips por escala (EP-5: live chips).
- Cambios al cuestionario de captura (formularios de los pasos 7-9 ya capturan correctamente).
- Migración batch de evaluaciones legacy (recomputo on-demand cuando el médico edite la EP).

## Cambios concretos en `scoring.ts`

### Cambio 1 — Acceso a medicamentos

**Antes:**
```ts
case 'Acceso a medicamentos':
  if (valor === 1) return 100
  if (valor === 2) return 65
  return 25
```

**Después:**
```ts
case 'Acceso a medicamentos':
  // Doc: 1=Total verde, 2=Parcial amarillo, 3=Negación rojo.
  // Usuario 2026-05-04: Sí=100, Parcialmente=66, No=1.
  if (valor === 1) return 100
  if (valor === 2) return 66
  return 1
```

### Cambio 2 — Nicotina

**Antes:**
```ts
case 'Nicotina':
  if (valor === 1) return 100
  if (valor === 2) return 90
  if (valor === 3) return 70
  if (valor === 4) return 55
  if (valor === 5) return 0
  if (valor === 6) return 60
  return 0
```

**Después:**
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

### Cambio 3 — Actividad física

**Antes:**
```ts
case 'Actividad física':
  if (valor >= 120) return reglaDeTresRango(valor, 120, 300, 80, 100)
  if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
  return reglaDeTresRango(valor, 0, 59, 0, 50)
```

**Después:**
```ts
case 'Actividad física':
  // Doc: ≥120 min/sem verde, 60-119 amarillo, <60 rojo.
  // Usuario 2026-05-04: 100 puntos a 150 min (no a 300).
  if (valor >= 120) return reglaDeTresRango(valor, 120, 150, 80, 100)
  if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
  return reglaDeTresRango(valor, 0, 59, 0, 50)
```

Verificación numérica:
- 0 min → 0
- 60 min → 51
- 120 min → 80
- **150 min → 100** (anteriormente daba ~83)
- 200 min → 100 (saturado)
- 300 min → 100 (saturado)

### Cambio 4 — Filtro defensivo "no meds" en `recomputeAssessment`

**Estado actual:** `QuestionnaireWrapper.tsx:98-105` ya filtra Acceso + Adherencia cuando `takesMeds=false` antes de llamar a `saveAssessment`. Las nuevas evaluaciones quedan correctamente con 11 componentes en DB.

**Por qué agregar filtro adicional en scoring:**
- Defense-in-depth contra evaluaciones legacy en DB que pueden tener los 13 componentes (creadas antes de ese filtro upstream).
- Ensure consistency para cualquier call site futuro de `recomputeAssessment`.
- Fail-safe si el médico edita un `componentes` array que incluye los 2 médicamentos pero hace toggle del flag `takesMeds`.

**Cambio en `types.ts`:**
```ts
export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
  takesMeds: boolean  // ← NUEVO
}
```

**Cambio en `scoring.ts:recomputeAssessment`:**
```ts
export const recomputeAssessment = (
  componentes: ComponenteScore[],
  contexto: ContextoClinico,
): { components: ComponenteScore[]; scoreGlobal: number; nivel: 'Verde' | 'Amarillo' | 'Rojo'; metaScore: number } => {
  const filtered = contexto.takesMeds
    ? componentes
    : componentes.filter(c =>
        c.nombre !== 'Acceso a medicamentos' &&
        c.nombre !== 'Adherencia a medicamentos'
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

## Wiring del flag `takesMeds` por las 3 call sites

### a) [actions.ts](../../src/lib/clinical/actions.ts:54-61) — `saveAssessment` server-side

Hoy construye el contexto sin `takesMeds`. Cambio:
```ts
const takesMeds = input.raw_questionnaire?.takesMeds !== 'false'
const contexto: ContextoClinico = {
  isSCA: input.is_sca,
  isDM2: input.is_dm2,
  isPluripatologico: input.is_pluripatologico,
  isPocaExpectativa: input.is_poca_expectativa,
  edad,
  takesMeds,
}
```

Default conservador (`!== 'false'`): si `raw_questionnaire` no tiene el campo (data legacy o malformada), default = `true` (no filtra, comportamiento idéntico al actual).

### b) [QuestionnaireWrapper.tsx](../../src/components/admin/clinical/QuestionnaireWrapper.tsx)

No requiere cambio directo en este archivo: ya filtra Acceso + Adherencia upstream y pasa `raw_questionnaire` con `takesMeds` al `saveAssessment`. El cambio en `actions.ts` (a) ya consume ese campo.

### c) [ClinicalHistoryClient.tsx](../../src/components/admin/clinical/ClinicalHistoryClient.tsx:80-109) — recomputo client-side

Hoy mantiene state de `isSCA`, `isDM2`, etc. Necesita:
```ts
// Nuevo state, derivado del initialAssessment con default true:
const [takesMeds, setTakesMeds] = useState(
  initialAssessment?.raw_questionnaire?.takesMeds !== 'false'
)

// Pasar al contexto:
const result = recomputeAssessment(componentes, {
  isSCA, isDM2, isPluripatologico, isPocaExpectativa, edad: edadCalculada,
  takesMeds,
})
```

Y en el render del editor de componentes (donde se muestran los 13 sliders/inputs), filtrar Acceso/Adherencia cuando `takesMeds=false`:
```tsx
{componentes
  .filter(c => takesMeds || (c.nombre !== 'Acceso a medicamentos' && c.nombre !== 'Adherencia a medicamentos'))
  .map(...)}
```

**No agregamos toggle UI para `takesMeds`** en ClinicalHistoryClient — el flag se establece al crear la evaluación vía `Questionnaire`. Cambiar `takesMeds` después requiere recrear la EP. Esto preserva el comportamiento actual y evita una decisión de UI que pertenecería a EP-5 o un sub-proyecto futuro.

## Estructura de archivos

### Modificados

- `src/lib/clinical/types.ts` — agregar `takesMeds: boolean` a `ContextoClinico` (1 línea).
- `src/lib/clinical/scoring.ts` — actualizar 3 cases del switch + filtro en `recomputeAssessment` (~15 líneas afectadas).
- `src/lib/clinical/actions.ts` — agregar `takesMeds` derivado al contexto (~3 líneas afectadas en `saveAssessment`, ~líneas 54-61).
- `src/components/admin/clinical/ClinicalHistoryClient.tsx` — state + pasar al contexto + filtro en render del editor (~10 líneas afectadas).

### Sin tocar

- `src/components/admin/clinical/Questionnaire.tsx` — captura sigue intacta.
- `src/components/admin/clinical/QuestionnaireWrapper.tsx` — ya filtra upstream.
- `src/lib/clinical/constants.ts` (`SCORES_INICIALES`) — sigue con los 13 componentes.
- `src/components/admin/clinical/ReportPage*.tsx` — iteran dinámicamente sobre `componentes`, automáticamente excluyen los filtrados.
- `src/lib/clinical/dashboard-aggregations.ts`, `src/lib/clinical/build-clinical-excel.ts` — leen valores crudos del raw, no los puntajes individuales para clasificar.
- DB schema — no se requiere migración. El flag se deriva del `raw_questionnaire` JSONB existente.

### Nuevos

- Ninguno.

## Datos legacy

Evaluaciones existentes en DB:
- Si `raw_questionnaire.takesMeds === 'false'` y los 13 componentes están en `components` (caso pre-filtro upstream): el filtro en `recomputeAssessment` los elimina al re-render en ClinicalHistoryClient o al re-save vía `saveAssessment`.
- Si `raw_questionnaire` no tiene el campo `takesMeds`: default = `true`, comportamiento idéntico al actual.
- **No hay migración batch.** El recomputo es lazy: ocurre al próximo evento de save/recompute en cada evaluación.

## Verificación

1. `npx tsc --noEmit` limpio.
2. `npm run lint` limpio.
3. `npm run build` pasa.
4. Smoke manual:
   - Paciente nuevo con `takesMeds=true` y `medAccess=2` → score de Acceso = **66** (anteriormente 65).
   - Paciente nuevo con `takesMeds=true` y `medAccess=3` → score de Acceso = **1** (anteriormente 25).
   - Paciente nuevo con `takesMeds=true`, fumador electrónico (smokeStatus=6) → score de Nicotina = **0** (anteriormente 60).
   - Paciente nuevo con 150 min de actividad → score de Actividad = **100** (anteriormente ~83).
   - Paciente nuevo con `takesMeds=false` → PDF y "Perfil de salud detallado" no muestran Acceso ni Adherencia. Score global no incluye estas dos.
   - Editar una EP existente con `takesMeds=false` → editor de componentes oculta Acceso y Adherencia.
5. Smoke de regresión:
   - Paciente con `takesMeds=true` y todos los valores estándar → score global no cambia significativamente excepto donde las 3 nuevas curvas apliquen.

## Criterios de éxito

- Los 3 cambios numéricos producen los puntajes esperados (verificación 4).
- Cuando `takesMeds=false`, Acceso y Adherencia desaparecen del PDF, del "Perfil detallado", del "Top peores" y del cómputo del score global.
- Evaluaciones legacy sin el flag explícito siguen funcionando idénticamente al comportamiento previo (default `takesMeds=true`).
- TypeScript, lint y build pasan limpios.

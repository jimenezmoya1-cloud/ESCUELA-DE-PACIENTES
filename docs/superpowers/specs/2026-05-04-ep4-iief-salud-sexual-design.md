# Spec EP-4: IIEF-5 (salud sexual) reemplazando la sección actual

**Fecha:** 2026-05-04
**Sub-proyecto:** EP-4 (de la descomposición de 6 sub-proyectos del rework de la Evaluación Preventiva)

## Contexto

La EP actualmente tiene un paso 13 "Salud Sexual (IIEF-5)" en [Questionnaire.tsx](../../src/components/admin/clinical/Questionnaire.tsx) con 6 preguntas, sin opción "no actividad sexual", y **NO conectado al motor de scoring** — los datos se capturan pero nunca se computan ni aparecen en el reporte. Hay un campo `formData.erectileDysfunction: Array(6).fill(0)` que es un dead-end.

Necesitamos:
1. Reemplazar por el IIEF-5 estándar (5 preguntas, score 5-25).
2. Agregar un gate "¿Tienes actividad sexual? Sí/No" antes del cuestionario.
3. Conectar al scoring engine con curva piecewise (verde 22-25, amarillo 12-21, rojo 5-11).
4. Mostrar en el reporte solo cuando aplica (hombre + actividad sexual = sí).

## Alcance

### IN

- Rediseño del case 13 del Questionnaire con gate + 5 preguntas IIEF-5.
- Nuevo case `'Disfunción eréctil'` en `scoring.ts` con interpolación lineal por tramos.
- Nuevo flag `iiefAplica` en `ContextoClinico` para filtro defensivo.
- Wiring del flag por las 4 call sites (Questionnaire→URL params→QuestionnaireWrapper→actions/ClinicalHistoryClient).
- Hide del componente del editor + reportes cuando no aplica (hombre sin actividad, o mujer).

### OUT (otros sub-proyectos)

- FSFI / scoring sexual para mujeres (sub-proyecto futuro independiente).
- Live chips de score en el cuestionario (EP-5).
- Navegación por teclado (EP-6).
- Cambios al manejo de tabaquismo, salud mental, u otros componentes existentes (no EP-4).

## Naming y curva de scoring

**Nombre del componente:** `'Disfunción eréctil'` (sigue la convención del codebase de nombrar el concepto clínico, no el instrumento; matches el wording explícito del usuario).

**Curva en `scoring.ts`** (nuevo case en el switch de `calcularPuntajeExacto`):

```ts
case 'Disfunción eréctil':
  // IIEF-5: rango 5-25. Verde 22-25, amarillo 12-21, rojo 5-11.
  if (valor <= 11) return reglaDeTresRango(valor, 5, 11, 0, 50)     // Rojo
  if (valor <= 21) return reglaDeTresRango(valor, 12, 21, 51, 79)   // Amarillo
  return reglaDeTresRango(valor, 22, 25, 80, 100)                   // Verde
```

**Verificación numérica:**
- 5 → 0 (peor)
- 11 → 50 (límite rojo/amarillo)
- 12 → 51 (inicio amarillo)
- 15 → 60 (medio amarillo)
- 21 → 79 (límite amarillo/verde)
- 22 → 80 (inicio verde)
- 25 → 100 (mejor)

## UX del paso 13

```
┌────────────────────────────────────────────────────────┐
│  💗 Salud sexual                                        │
│                                                         │
│  Para personalizar tu evaluación, necesitamos saber:    │
│                                                         │
│  ¿Tienes actividad sexual?                              │
│  ┌─────────────┐    ┌─────────────┐                     │
│  │  ✓ Sí       │    │  ✗ No       │                     │
│  └─────────────┘    └─────────────┘                     │
│                                                         │
│  ─── (si responde Sí, aparecen las 5 preguntas) ───     │
│                                                         │
│  1. ¿Cómo calificarías tu confianza para conseguir y    │
│     mantener una erección?                              │
│  ( ) Muy bajo  ( ) Bajo  ( ) Moderado  ( ) Alto         │
│  ( ) Muy alto                                           │
│                                                         │
│  2-5. (preguntas de frecuencia, opciones 1-5)           │
└────────────────────────────────────────────────────────┘
```

### Comportamiento

- **Botones del gate** (Sí/No): mismo estilo que otros botones grandes del cuestionario (rounded-2xl, blue-600 cuando seleccionado).
- **Si elige Sí:** las 5 preguntas aparecen con animación suave debajo del gate. Validación: las 5 deben tener respuesta para avanzar.
- **Si elige No:** el resto del bloque queda oculto, el paso se marca como válido (puede avanzar al siguiente). `iiefAplica=false`.
- **Si cambia de Sí a No después de responder:** las respuestas previas se pierden (`iief: Array(5).fill(0)`); puede recuperarlas si vuelve a Sí (parten de cero pero el comportamiento es claro).
- **Pacientes mujeres** (`gender !== 'Masculino'`): paso 13 skipea automáticamente (ya implementado en líneas ~192-196 del Questionnaire). `iiefAplica` queda en `false` por default.

### Preguntas y opciones (5 preguntas IIEF-5)

| # | Pregunta | Opciones (valor → label) |
|---|----------|--------------------------|
| 1 | ¿Cómo calificarías tu confianza para conseguir y mantener una erección? | 1=Muy bajo, 2=Bajo, 3=Moderado, 4=Alto, 5=Muy alto |
| 2 | ¿Con qué frecuencia tus erecciones fueron suficientemente firmes para penetrar a tu pareja? | 1=Casi nunca, 2=Pocas veces, 3=A veces, 4=La mayoría, 5=Casi siempre |
| 3 | Durante las relaciones sexuales, ¿con qué frecuencia mantuviste la erección después de penetrar a tu pareja? | (mismo set 1-5) |
| 4 | Durante el coito, ¿qué tan difícil fue mantener la erección hasta completar el acto? | 1=Extremadamente difícil, 2=Muy difícil, 3=Difícil, 4=Algo difícil, 5=Sin dificultad |
| 5 | Cuando intentaste tener relaciones, ¿qué tan satisfactorias fueron? | 1=Nada satisfactorias, 2=Poco, 3=Moderadamente, 4=Mucho, 5=Extremadamente |

**Mapeo del xlsx Q1 (que usa 0-4):** se ajusta sumando 1 al valor → 1-5. Esto preserva la semántica del IIEF-5 estándar.

## Modelo de datos

### `formData` (en Questionnaire.tsx)

**Reemplazar:**
```ts
erectileDysfunction: Array(6).fill(0),
```

**Por:**
```ts
hasSexualActivity: null as boolean | null,  // null = sin responder gate
iief: Array(5).fill(0),                      // 0 = sin responder; respuestas válidas 1-5
```

### Validación (`isStepValid` case 13)

```ts
case 13:
  if (formData.gender !== 'Masculino') return true             // skip total
  if (formData.hasSexualActivity === null) return false        // gate sin responder
  if (formData.hasSexualActivity === false) return true        // No → válido
  return formData.iief.every(v => v >= 1)                       // Sí → todas las 5 respondidas (1-5)
```

### URL params (`generateUrl()` en Questionnaire.tsx)

Agregar al final del bloque de URLSearchParams:

```ts
disfuncion_erectil: formData.iief.reduce((a, b) => a + b, 0).toString(),  // total 5-25 si aplica, 0 si no
iief_aplica: (formData.gender === 'Masculino' && formData.hasSexualActivity === true) ? 'true' : 'false',
```

## Wiring del flag por las 4 call sites

### a) `QuestionnaireWrapper.tsx`

Extender `URL_TO_COMPONENTE`:

```ts
const URL_TO_COMPONENTE: Record<string, string> = {
  // ... existentes
  disfuncion_erectil: "Disfunción eréctil",  // NUEVO
}
```

Filtrar por gender/actividad antes de construir el array de componentes (junto al filtro takesMeds existente):

```ts
const takesMeds = params.get("takesMeds") !== "false"
const iiefAplica = params.get("iief_aplica") === "true"

const components: ComponenteScore[] = Object.entries(URL_TO_COMPONENTE)
  .filter(([key]) => {
    if (!takesMeds && (key === "adherencia" || key === "acceso")) return false
    if (!iiefAplica && key === "disfuncion_erectil") return false
    return true
  })
  .map(([key, nombreComp]) => { /* ... existente ... */ })
```

### b) `types.ts`

```ts
export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
  takesMeds: boolean
  iiefAplica: boolean   // NUEVO
}
```

### c) `scoring.ts::recomputeAssessment`

Extender filtro defensivo:

```ts
const filtered = componentes.filter((c) => {
  if (!contexto.takesMeds && (c.nombre === 'Acceso a medicamentos' || c.nombre === 'Adherencia a medicamentos')) return false
  if (!contexto.iiefAplica && c.nombre === 'Disfunción eréctil') return false
  return true
})
```

### d) `actions.ts::saveAssessment`

```ts
const rawIiefAplica = (input.raw_questionnaire as Record<string, unknown> | null | undefined)?.iief_aplica
const iiefAplica = rawIiefAplica === 'true'  // default false (más conservador que takesMeds)

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

### e) `ClinicalHistoryClient.tsx`

State derivado:

```ts
const [iiefAplica] = useState<boolean>(() => {
  const raw = initialAssessment?.raw_questionnaire as Record<string, unknown> | null | undefined
  return raw?.iief_aplica === 'true'
})
```

Extender `componentesVisibles`:

```ts
const componentesVisibles = componentes.filter((c) => {
  if (!takesMeds && (c.nombre === 'Acceso a medicamentos' || c.nombre === 'Adherencia a medicamentos')) return false
  if (!iiefAplica && c.nombre === 'Disfunción eréctil') return false
  return true
})
```

Pasar al contexto del recompute:

```ts
const result = recomputeAssessment(componentes, {
  isSCA, isDM2, isPluripatologico, isPocaExpectativa, edad: edadCalculada,
  takesMeds, iiefAplica,
})
```

## Estructura de archivos

### Modificados (5)

- `src/components/admin/clinical/Questionnaire.tsx` — state, validación, render del case 13, generateUrl().
- `src/lib/clinical/types.ts` — agregar `iiefAplica: boolean`.
- `src/lib/clinical/scoring.ts` — nuevo case `'Disfunción eréctil'` + extender filtro en `recomputeAssessment`.
- `src/lib/clinical/actions.ts` — derivar `iiefAplica` y pasar al contexto.
- `src/components/admin/clinical/QuestionnaireWrapper.tsx` — agregar al map + filtro.
- `src/components/admin/clinical/ClinicalHistoryClient.tsx` — state + componentesVisibles + context.

### Sin tocar

- `src/lib/clinical/constants.ts` (`SCORES_INICIALES` se queda con 13 componentes; IIEF se introduce condicionalmente upstream).
- `src/components/admin/clinical/ReportPage*.tsx` — iteran dinámicamente.
- `src/lib/clinical/dashboard-aggregations.ts`, `src/lib/clinical/build-clinical-excel.ts` — verificar al implementar; si export Excel ya itera dinámicamente, no requiere cambio.
- DB schema (sin migración).

## Datos legacy

Evaluaciones existentes sin `iief_aplica` en `raw_questionnaire`:
- Default `false` → IIEF NO aparece.
- Comportamiento idéntico al actual (donde IIEF nunca aparecía en el reporte de todas formas).

## Round-trip

El fix de EP-3 (`handleSaveAssessment` preserva `raw_questionnaire`) automáticamente preserva `iief_aplica` y `disfuncion_erectil` al re-guardar. No se requiere fix adicional.

## Verificación

1. `npx tsc --noEmit` limpio.
2. `npm run lint` limpio.
3. `npm run build` pasa.
4. Verificación numérica de la curva:
   - IIEF=5 → 0; IIEF=11 → 50; IIEF=12 → 51; IIEF=15 → 64; IIEF=21 → 79; IIEF=22 → 80; IIEF=25 → 100.
5. Smoke manual:
   - Hombre + Sí + 5 respuestas máximas → IIEF total = 25, score componente = 100.
   - Hombre + Sí + 5 respuestas mínimas → IIEF total = 5, score componente = 0.
   - Hombre + No → paso 13 muestra solo el gate, avanza, IIEF NO aparece en reporte.
   - Mujer → paso 13 skipea, IIEF NO aparece.
   - Re-save de un hombre con IIEF=15 → flag preservado, valor preservado.

## Criterios de éxito

- La curva produce los valores exactos esperados (verificación 4).
- El gate funciona: Sí muestra 5 preguntas, No oculta y permite avanzar.
- El componente IIEF aparece en el "Perfil de Salud Detallado" del reporte SOLO para hombres con actividad sexual.
- El componente NO dilluye el score global cuando no aplica.
- Mujeres y hombres sin actividad sexual no ven el componente en NINGUNA parte del reporte ni del editor.
- Datos legacy se comportan idéntico al pre-EP-4.
- Round-trip preserva el flag.

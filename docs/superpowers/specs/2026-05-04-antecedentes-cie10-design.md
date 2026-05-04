# Spec: Antecedentes con CIE-10 en cuestionario de evaluación de salud

**Fecha:** 2026-05-04
**Archivo afectado principal:** `src/components/admin/clinical/Questionnaire.tsx` (paso 6)

## Contexto

El paso 6 ("Antecedentes") del cuestionario actualmente muestra una rejilla con ~40 enfermedades hardcodeadas. El scoring clínico depende de detectar `'Diabetes'` y `'Infarto cardiaco' / 'Trombosis cerebral'` dentro de `formData.diseases` para activar las banderas `dm2` y `sca`.

Necesitamos:

1. Destacar visualmente las dos condiciones de mayor peso clínico (Diabetes mellitus y Síndrome coronario agudo) como botones grandes.
2. Conservar un set compacto de chips para las patologías cardio-comunes.
3. Permitir registrar cualquier otro antecedente buscando en el catálogo CIE-10 completo (~12.6 K códigos del archivo `insumos_construccion/CIE 10 actualizada.xlsx`).
4. Preservar el scoring existente sin tocarlo.

## Diseño UX

Layout vertical en el paso 6:

```
🫀 Antecedentes

¿Tiene alguna de estas dos condiciones?
[ 🩸 Diabetes mellitus ]   [ ⚡ Síndrome coronario agudo ]

Otras patologías frecuentes:
[💊 Hipertensión]  [🫀 Dislipidemia]  [⚖️ Sobrepeso u obesidad]
[🚬 Tabaquismo activo]  [🩺 Enfermedad renal crónica]  [😴 Apnea del sueño]

Buscar otro antecedente (CIE-10):
🔍 Código, nombre o descripción...

(resultados de búsqueda — máximo 30, con botón [+] para agregar)

Antecedentes CIE-10 seleccionados:
✓ I10X — Hipertensión esencial      [✕]
✓ E785 — Hiperlipidemia mixta       [✕]

──────────────
☐ Ninguno de los anteriores
☐ No sabe qué enfermedad tiene
```

### Comportamiento

- **Botones DM y SCA:** toggle único cada uno. Al activar Diabetes mellitus, se agrega el string `'Diabetes'` a `formData.diseases`. Al activar Síndrome coronario agudo, se agrega `'Infarto cardiaco'` a `formData.diseases`. Esto preserva el scoring sin cambios.
- **Chips Set A (6 chips):** toggle multi-select sobre `formData.diseases` con strings idénticos a los actuales:
  - `'Hipertensión'`
  - `'Dislipidemia'`
  - `'Sobrepeso u obesidad'`
  - `'Tabaquismo activo'` *(nuevo string; chip informativo, NO altera el scoring de tabaquismo del paso 14-15)*
  - `'Enfermedad del riñón'`
  - `'Apnea del sueño (ronquido con pausas al respirar)'`
- **Buscador CIE-10:**
  - Input con icono lupa.
  - Filtrado client-side, substring match sobre código + nombre + descripción, normalizado (lowercase, sin acentos).
  - Debounce 150 ms.
  - Muestra máximo 30 resultados; cada uno con botón `[+]` que lo agrega a `formData.cie10`.
  - Bloquea agregar duplicados (oculta el `[+]` o lo deshabilita si el código ya está seleccionado).
  - Mientras carga el JSON: spinner pequeño con texto "Cargando catálogo CIE-10…".
- **Lista de seleccionados CIE-10:** debajo del buscador, cada item con `[✕]` para remover. Si hay 0 selecciones, no se muestra la sección.
- **"Ninguno" / "No sabe":** botones excluyentes. Al activar uno, se limpia todo (DM, SCA, chips, lista CIE-10) y se ocultan los chips + buscador hasta que se desactive. Mismo comportamiento que la versión actual.

## Modelo de datos

Cambios en `formData` (state inicial en `Questionnaire.tsx`):

```ts
diseases: [] as string[],                            // intacto
cie10: [] as { code: string; name: string }[],       // NUEVO
```

### Strings exactos que toggla cada control

| Control                       | String en `diseases`                                    |
|-------------------------------|---------------------------------------------------------|
| Botón Diabetes mellitus       | `'Diabetes'`                                            |
| Botón Síndrome coronario agudo| `'Infarto cardiaco'`                                    |
| Chip Hipertensión             | `'Hipertensión'`                                        |
| Chip Dislipidemia             | `'Dislipidemia'`                                        |
| Chip Sobrepeso u obesidad     | `'Sobrepeso u obesidad'`                                |
| Chip Tabaquismo activo        | `'Tabaquismo activo'`                                   |
| Chip Enfermedad renal crónica | `'Enfermedad del riñón'`                                |
| Chip Apnea del sueño          | `'Apnea del sueño (ronquido con pausas al respirar)'`   |
| Botón Ninguno                 | `'Ninguna'`                                             |
| Botón No sabe                 | `'No sé qué enfermedad tengo'`                          |

## Scoring (sin cambios)

`Questionnaire.tsx` líneas 221-223 permanecen intactas:

```ts
const hasComorbidities = formData.diseases.length > 0
  && !formData.diseases.includes('Ninguna')
  && !formData.diseases.includes('No sé qué enfermedad tengo');
const sca = formData.diseases.includes('Infarto cardiaco')
         || formData.diseases.includes('Trombosis cerebral');
const dm2 = formData.diseases.includes('Diabetes');
```

`src/lib/clinical/scoring.ts` no se toca.

## Catálogo CIE-10: pre-procesamiento y carga

### Pre-procesamiento (one-shot, manual)

Nuevo script: `scripts/build-cie10-json.mjs`

- Lee `insumos_construccion/CIE 10 actualizada.xlsx`, hoja `CIE-10`.
- Filtra solo filas donde `Habilitado === 'SI'`.
- Genera `public/data/cie10.json` con shape:
  ```ts
  type Cie10Entry = {
    code: string;        // ej: "E119"
    name: string;        // ej: "DIABETES MELLITUS NO INSULINODEPENDIENTE SIN MENCION DE COMPLICACION"
    description: string; // ej: "DIABETES MELLITUS NO INSULINODEPENDIENTE"
    search: string;      // `${code} ${name} ${description}` lowercased + sin acentos
  };
  ```
- Tamaño esperado: ~1 MB sin comprimir, ~250 KB gzipped.
- Se ejecuta manualmente (`npm run build:cie10` u otro nombre) cuando se actualice el xlsx.
- El JSON se commitea al repo para que el deploy no dependa del archivo local.

Librería: revisar si el proyecto ya usa `xlsx` o `exceljs`; reutilizar la que esté disponible.

### Carga en runtime

- Componente nuevo `AntecedentesStep.tsx` (ver "Estructura de archivos") hace `fetch('/data/cie10.json')` la primera vez que el usuario llega al paso 6.
- Cache en estado del componente (no re-fetch si retroceden y avanzan dentro del mismo cuestionario).
- Mientras carga: input bloqueado con spinner + texto "Cargando catálogo CIE-10…".
- Si el fetch falla: mensaje "No se pudo cargar el catálogo CIE-10. Recarga la página para reintentar." Los chips y botones siguen funcionando aunque falle el fetch.

### Búsqueda

- Función pura: `entries.filter(e => e.search.includes(normalize(query)))`.
- `normalize()` = lowercase + remover diacríticos: `s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')`.
- Debounce 150 ms con `useEffect` o `useDeferredValue`.
- Limit a 30 resultados.

## Export en URL params

`Questionnaire.tsx` línea 294, agregar nuevo param:

```ts
antecedentes: (formData.diseases ?? []).join(', '),                  // intacto
antecedentes_cie10: (formData.cie10 ?? [])                           // NUEVO
  .map(c => `${c.code} - ${c.name}`).join('; '),
```

## Export Excel y dashboard

Verificar al implementar:

- `src/lib/clinical/build-clinical-excel.ts`: si hay un mapa explícito de columnas, agregar entry para `antecedentes_cie10` con header "Antecedentes CIE-10". Si itera dinámicamente sobre `Object.entries(params)`, no requiere cambio.
- `src/lib/clinical/dashboard-aggregations.ts`: revisar si hay alguna agregación que dependa de `antecedentes`. Si la nueva columna debe agregarse al dashboard, actualizar; si no, dejar intacta.

## Estructura de archivos

### Nuevos

- `scripts/build-cie10-json.mjs` — script Node que convierte el xlsx a JSON.
- `public/data/cie10.json` — catálogo generado, commiteado al repo.
- `src/components/admin/clinical/AntecedentesStep.tsx` — componente que encapsula todo el paso 6.
  - Props: `{ diseases: string[]; cie10: Cie10Selection[]; onChange: (next: { diseases: string[]; cie10: Cie10Selection[] }) => void }`
  - Estado interno: query del buscador, JSON cargado, estado loading/error.
- `src/lib/clinical/data/cie10.ts` — types compartidos (`Cie10Entry`, `Cie10Selection`) + función `normalize()`.

### Modificados

- `src/components/admin/clinical/Questionnaire.tsx`:
  - State inicial (línea ~148): agregar `cie10: [] as { code: string; name: string }[]`.
  - Reemplazar el bloque `case 6` (líneas 784-863) por `<AntecedentesStep diseases={formData.diseases} cie10={formData.cie10} onChange={({diseases, cie10}) => setFormData({...formData, diseases, cie10})} />`.
  - Agregar `antecedentes_cie10` al `URLSearchParams` (cerca de línea 294).
- `src/lib/clinical/build-clinical-excel.ts` — agregar columna si el mapeo es manual.

### Sin tocar

- `src/lib/clinical/scoring.ts`.
- Lógica de `dm2` / `sca` / `hasComorbidities` en `Questionnaire.tsx` líneas 221-223.

## Razón por la que se extrae a componente nuevo

`Questionnaire.tsx` ya tiene 1.719 líneas. Meter el buscador CIE-10 + estado de fetch + lógica de filtrado inline lo vuelve inmanejable. `AntecedentesStep.tsx` queda con responsabilidad única (un paso del cuestionario) y se puede testear/iterar de forma aislada. Esto sigue el patrón del proyecto: el resto de pasos del cuestionario son inline, pero este es el primero que justifica extracción por carga de datos asíncrona y lógica de búsqueda.

## Criterios de éxito

- El scoring `dm2`, `sca` y `hasComorbidities` produce los mismos valores que la versión actual cuando el usuario marca las mismas patologías.
- El export en URL params incluye `antecedentes` (mismo formato actual) y `antecedentes_cie10` (nuevo).
- El usuario puede buscar "diabetes" y ver resultados como `E10X`, `E11X`, `E110`, etc. en menos de 200 ms tras dejar de escribir.
- El usuario puede agregar 5+ códigos CIE-10 y removerlos individualmente.
- "Ninguno" y "No sabe" siguen comportándose como excluyentes.
- El catálogo se carga una sola vez por sesión del cuestionario.

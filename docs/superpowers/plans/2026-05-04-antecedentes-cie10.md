# Antecedentes CIE-10 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la rejilla hardcodeada de antecedentes (paso 6) por dos botones destacados (DM, SCA), 6 chips de selección rápida y un buscador del catálogo CIE-10 completo, preservando el scoring existente.

**Architecture:**
- Pre-procesamos `insumos_construccion/CIE 10 actualizada.xlsx` → `public/data/cie10.json` con un script Node manual (one-shot, commiteado al repo).
- Extraemos el paso 6 a un componente nuevo `AntecedentesStep.tsx` que carga el JSON lazy via `fetch` y filtra client-side por substring.
- `formData.diseases: string[]` mantiene los strings exactos que ya usa el scoring; agregamos `formData.cie10: { code, name }[]` como campo paralelo. El export en URL params añade un nuevo param `antecedentes_cie10`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind, librería `xlsx` (ya instalada). Sin framework de tests JS — verificación por `npx tsc --noEmit` + `npm run lint` + smoke manual en dev server.

**Spec source:** `docs/superpowers/specs/2026-05-04-antecedentes-cie10-design.md`

---

## File Structure

**Nuevos:**
- `scripts/build-cie10-json.mjs` — script Node que convierte el xlsx a JSON.
- `public/data/cie10.json` — catálogo generado, commiteado al repo.
- `src/lib/clinical/data/cie10.ts` — types compartidos + función `normalizeCie10()`.
- `src/components/admin/clinical/AntecedentesStep.tsx` — componente del paso 6.

**Modificados:**
- `src/components/admin/clinical/Questionnaire.tsx` — state inicial, render del case 6, URL params.
- `src/lib/clinical/build-clinical-excel.ts` — agregar columna "Antecedentes CIE-10".
- `package.json` — script `build:cie10`.

**Sin tocar:**
- `src/lib/clinical/scoring.ts`
- `src/lib/clinical/dashboard-aggregations.ts` (la card "Antecedentes — top 5" sigue leyendo solo `antecedentes`, lo cual es correcto: los chips son lo que aporta valor agregado — los códigos CIE-10 individuales no tendrían top 5 útil con baja n.)
- Líneas 221-223 de `Questionnaire.tsx` (lógica `dm2` / `sca` / `hasComorbidities`).

---

## Task 1: Tipos compartidos y función de normalización

**Files:**
- Create: `src/lib/clinical/data/cie10.ts`

- [ ] **Step 1: Crear el archivo con types y `normalizeCie10`**

```ts
// src/lib/clinical/data/cie10.ts

export type Cie10Entry = {
  code: string;
  name: string;
  description: string;
  search: string;
};

export type Cie10Selection = {
  code: string;
  name: string;
};

export function normalizeCie10(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
```

- [ ] **Step 2: Verificar TypeScript compila**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/data/cie10.ts
git commit -m "feat(clinical): add CIE-10 shared types and normalizer"
```

---

## Task 2: Script de pre-procesamiento del xlsx → JSON

**Files:**
- Create: `scripts/build-cie10-json.mjs`
- Modify: `package.json` (agregar script `build:cie10`)
- Create: `public/data/cie10.json` (generado)

- [ ] **Step 1: Crear el script**

```js
// scripts/build-cie10-json.mjs
// Genera public/data/cie10.json a partir del xlsx maestro.
// Uso: npm run build:cie10
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const XLSX_PATH = resolve(
  REPO_ROOT,
  "..",
  "insumos_construccion",
  "CIE 10 actualizada.xlsx",
);
const OUT_PATH = resolve(REPO_ROOT, "public/data/cie10.json");

function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets["CIE-10"];
if (!ws) {
  console.error("Sheet 'CIE-10' not found in", XLSX_PATH);
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

const entries = [];
for (const r of rows) {
  if (String(r.Habilitado).trim().toUpperCase() !== "SI") continue;
  const code = String(r.Codigo ?? "").trim();
  const name = String(r.Nombre ?? "").trim();
  const description = String(r.Descripcion ?? "").trim();
  if (!code || !name) continue;
  entries.push({
    code,
    name,
    description,
    search: normalize(`${code} ${name} ${description}`),
  });
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(entries));
console.log(`Wrote ${entries.length} CIE-10 entries to ${OUT_PATH}`);
```

- [ ] **Step 2: Agregar script a package.json**

Modificar la sección `scripts` de `package.json` para que quede:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "build:cie10": "node scripts/build-cie10-json.mjs"
}
```

- [ ] **Step 3: Ejecutar el script y verificar el JSON**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build:cie10`
Expected: imprime "Wrote NNNNN CIE-10 entries to .../public/data/cie10.json" donde NNNNN está entre 11000 y 13000.

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && node -e "const d=require('./public/data/cie10.json'); console.log('count:',d.length); console.log('sample:',d.slice(0,2));"`
Expected: count > 11000; sample muestra dos objetos con `code`, `name`, `description`, `search` no vacíos.

- [ ] **Step 4: Verificar que diabetes y SCA aparecen**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && node -e "const d=require('./public/data/cie10.json'); console.log(d.filter(e=>e.search.includes('diabetes')).slice(0,3).map(e=>e.code+' '+e.name));"`
Expected: lista no vacía con códigos de diabetes (E10x, E11x, etc).

- [ ] **Step 5: Commit (incluye el JSON generado)**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add scripts/build-cie10-json.mjs package.json public/data/cie10.json
git commit -m "feat(clinical): add CIE-10 dataset and build script"
```

---

## Task 3: Componente `AntecedentesStep` — esqueleto + carga de catálogo

**Files:**
- Create: `src/components/admin/clinical/AntecedentesStep.tsx`

- [ ] **Step 1: Crear el componente con props, state y fetch del JSON**

```tsx
// src/components/admin/clinical/AntecedentesStep.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Search, Plus, X, Loader2 } from "lucide-react";
import {
  type Cie10Entry,
  type Cie10Selection,
  normalizeCie10,
} from "@/lib/clinical/data/cie10";

interface Props {
  diseases: string[];
  cie10: Cie10Selection[];
  onChange: (next: { diseases: string[]; cie10: Cie10Selection[] }) => void;
}

const QUICK_CHIPS: { id: string; icon: string; label?: string }[] = [
  { id: "Hipertensión", icon: "💊" },
  { id: "Dislipidemia", icon: "🫀" },
  { id: "Sobrepeso u obesidad", icon: "⚖️" },
  { id: "Tabaquismo activo", icon: "🚬" },
  { id: "Enfermedad del riñón", icon: "🩺", label: "Enfermedad renal crónica" },
  {
    id: "Apnea del sueño (ronquido con pausas al respirar)",
    icon: "😴",
    label: "Apnea del sueño",
  },
];

const NONE = "Ninguna";
const UNKNOWN = "No sé qué enfermedad tengo";
const DIABETES = "Diabetes";
const SCA = "Infarto cardiaco";

export default function AntecedentesStep({ diseases, cie10, onChange }: Props) {
  const [catalog, setCatalog] = useState<Cie10Entry[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/data/cie10.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Cie10Entry[]>;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled)
          setCatalogError(
            "No se pudo cargar el catálogo CIE-10. Recarga la página para reintentar.",
          );
        console.error("CIE-10 fetch failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo<Cie10Entry[]>(() => {
    if (!catalog || debounced.trim().length < 2) return [];
    const q = normalizeCie10(debounced.trim());
    const out: Cie10Entry[] = [];
    for (const e of catalog) {
      if (e.search.includes(q)) {
        out.push(e);
        if (out.length >= 30) break;
      }
    }
    return out;
  }, [catalog, debounced]);

  const isNone = diseases.includes(NONE);
  const isUnknown = diseases.includes(UNKNOWN);
  const exclusiveActive = isNone || isUnknown;
  const selectedCie10Codes = useMemo(
    () => new Set(cie10.map((c) => c.code)),
    [cie10],
  );

  const toggleDisease = (id: string) => {
    if (id === NONE || id === UNKNOWN) {
      const alreadyOn = diseases.includes(id);
      onChange({
        diseases: alreadyOn ? [] : [id],
        cie10: alreadyOn ? cie10 : [],
      });
      return;
    }
    const next = diseases.includes(id)
      ? diseases.filter((x) => x !== id)
      : [...diseases.filter((x) => x !== NONE && x !== UNKNOWN), id];
    onChange({ diseases: next, cie10 });
  };

  const addCie10 = (e: Cie10Entry) => {
    if (selectedCie10Codes.has(e.code)) return;
    onChange({ diseases, cie10: [...cie10, { code: e.code, name: e.name }] });
  };

  const removeCie10 = (code: string) => {
    onChange({ diseases, cie10: cie10.filter((c) => c.code !== code) });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
        <Activity className="w-6 h-6 text-blue-600" /> Antecedentes
      </h2>

      {/* Botones grandes DM y SCA */}
      <div>
        <p className="text-slate-600 font-medium mb-3">
          ¿Tiene alguna de estas dos condiciones?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={exclusiveActive}
            onClick={() => toggleDisease(DIABETES)}
            className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
              diseases.includes(DIABETES)
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-slate-200 bg-white hover:border-blue-300"
            } ${exclusiveActive ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span className="text-3xl">🩸</span>
            <span className="font-bold text-slate-700 text-lg">
              Diabetes mellitus
            </span>
          </button>
          <button
            type="button"
            disabled={exclusiveActive}
            onClick={() => toggleDisease(SCA)}
            className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
              diseases.includes(SCA)
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-slate-200 bg-white hover:border-blue-300"
            } ${exclusiveActive ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span className="text-3xl">⚡</span>
            <span className="font-bold text-slate-700 text-lg">
              Síndrome coronario agudo
            </span>
          </button>
        </div>
      </div>

      {/* Chips Set A */}
      {!exclusiveActive && (
        <div>
          <p className="text-slate-600 font-medium mb-3">
            Otras patologías frecuentes:
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((c) => {
              const on = diseases.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleDisease(c.id)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 ${
                    on
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label || c.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Buscador CIE-10 */}
      {!exclusiveActive && (
        <div>
          <label className="block text-slate-600 font-medium mb-2">
            Buscar otro antecedente (CIE-10):
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!catalog}
              placeholder={
                catalog
                  ? "Código, nombre o descripción..."
                  : "Cargando catálogo CIE-10…"
              }
              className="w-full pl-9 pr-9 py-2 rounded-xl border-2 border-slate-200 focus:border-blue-400 outline-none disabled:bg-slate-50"
            />
            {!catalog && !catalogError && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          {catalogError && (
            <p className="text-sm text-red-600 mt-2">{catalogError}</p>
          )}

          {results.length > 0 && (
            <ul className="mt-3 max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {results.map((e) => {
                const already = selectedCie10Codes.has(e.code);
                return (
                  <li
                    key={e.code}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800">
                        {e.code} — {e.name}
                      </div>
                      {e.description && (
                        <div className="text-xs text-slate-500 truncate">
                          {e.description}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => addCie10(e)}
                      className={`shrink-0 p-2 rounded-lg ${
                        already
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      aria-label={
                        already ? "Ya seleccionado" : `Agregar ${e.code}`
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {cie10.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 font-medium mb-2">
                Antecedentes CIE-10 seleccionados:
              </p>
              <ul className="space-y-2">
                {cie10.map((c) => (
                  <li
                    key={c.code}
                    className="flex items-start gap-3 p-2 rounded-lg bg-blue-50 border border-blue-100"
                  >
                    <span className="text-sm font-bold text-blue-900 flex-1">
                      {c.code} — {c.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCie10(c.code)}
                      className="shrink-0 p-1 text-blue-700 hover:text-red-600"
                      aria-label={`Quitar ${c.code}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Excluyentes */}
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <button
          type="button"
          onClick={() => toggleDisease(NONE)}
          className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
            isNone
              ? "border-blue-600 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-300"
          }`}
        >
          <span className="text-xl">❌</span>
          <span className="font-bold text-slate-700">
            Ninguno de los anteriores
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleDisease(UNKNOWN)}
          className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
            isUnknown
              ? "border-blue-600 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-300"
          }`}
        >
          <span className="text-xl">❓</span>
          <span className="font-bold text-slate-700">
            No sé qué enfermedad tengo
          </span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript compila**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit`
Expected: sin errores. Si hay errores de import (`@/lib/...`), revisar `tsconfig.json` y `paths`.

- [ ] **Step 3: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint`
Expected: sin errores ni warnings nuevos en el archivo creado.

- [ ] **Step 4: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/AntecedentesStep.tsx
git commit -m "feat(clinical): add AntecedentesStep component with CIE-10 search"
```

---

## Task 4: Integrar `AntecedentesStep` en `Questionnaire.tsx`

**Files:**
- Modify: `src/components/admin/clinical/Questionnaire.tsx` (state inicial ~línea 148, render del case 6 ~líneas 784-863, URL params ~línea 294)

- [ ] **Step 1: Agregar import del componente nuevo**

En la cabecera de imports de `src/components/admin/clinical/Questionnaire.tsx`, después del import de `colombia-health`, agregar:

```ts
import AntecedentesStep from './AntecedentesStep';
import type { Cie10Selection } from '@/lib/clinical/data/cie10';
```

- [ ] **Step 2: Agregar `cie10` al state inicial**

En `useState({...})` (alrededor de línea 120), localizar:

```ts
diseases: [] as string[],
```

y agregar inmediatamente debajo:

```ts
cie10: [] as Cie10Selection[],
```

- [ ] **Step 3: Reemplazar el render del case 6**

Localizar el bloque que empieza en la línea ~784 (`case 6:`) y termina en la línea ~863 (justo antes de `case 7:`). Reemplazar todo el bloque por:

```tsx
case 6:
  return (
    <AntecedentesStep
      diseases={formData.diseases}
      cie10={formData.cie10}
      onChange={({ diseases, cie10 }) =>
        setFormData({ ...formData, diseases, cie10 })
      }
    />
  );
```

Esto elimina la const local `toggleDisease` (la nueva versión vive dentro del componente) y la rejilla hardcodeada.

- [ ] **Step 4: Agregar `antecedentes_cie10` al URLSearchParams**

En `generateUrl()`, localizar la línea (~294):

```ts
antecedentes: (formData.diseases ?? []).join(', '),
```

y agregar inmediatamente debajo:

```ts
antecedentes_cie10: (formData.cie10 ?? [])
  .map((c) => `${c.code} - ${c.name}`)
  .join('; '),
```

- [ ] **Step 5: Verificar TypeScript compila**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit`
Expected: sin errores. Si hay error sobre el tipo de `formData.cie10`, confirmar que el cast `as Cie10Selection[]` quedó en el state inicial.

- [ ] **Step 6: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 7: Smoke test manual en dev server**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

Abrir el cuestionario admin → llegar al paso 6 "Antecedentes". Verificar:

1. Se ven los dos botones grandes (Diabetes mellitus, Síndrome coronario agudo).
2. Se ven los 6 chips de Set A debajo.
3. Aparece el input de búsqueda con texto "Cargando catálogo CIE-10…" brevemente, luego "Código, nombre o descripción...".
4. Al escribir "diabetes" aparecen resultados (E10x, E11x).
5. Al click [+] en un resultado, baja a la lista de "Antecedentes CIE-10 seleccionados" y el [+] queda gris.
6. Al click [✕] en un seleccionado, desaparece.
7. Al click "Ninguno de los anteriores", se desactivan todos los chips/botones y se ocultan chips y buscador. Al volver a clicarlo, se re-habilita.
8. Marcar el botón "Diabetes mellitus" + chip "Hipertensión" + 1 código CIE-10 → completar el cuestionario hasta el final → revisar que la URL generada tenga `antecedentes=Diabetes%2C+Hipertensi%C3%B3n` y `antecedentes_cie10=...`.

Detener el dev server con Ctrl+C después de verificar.

- [ ] **Step 8: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/Questionnaire.tsx
git commit -m "feat(clinical): wire AntecedentesStep into questionnaire (case 6)"
```

---

## Task 5: Agregar columna "Antecedentes CIE-10" al export Excel

**Files:**
- Modify: `src/lib/clinical/build-clinical-excel.ts` (header en línea ~149, data row en línea ~207)

- [ ] **Step 1: Agregar el header**

Localizar la línea 149 que dice `"Antecedentes",` y reemplazarla por:

```ts
"Antecedentes",
"Antecedentes CIE-10",
```

- [ ] **Step 2: Agregar la celda de datos**

Localizar la línea 207 que dice `raw.antecedentes ?? "",` y reemplazarla por:

```ts
raw.antecedentes ?? "",
raw.antecedentes_cie10 ?? "",
```

- [ ] **Step 3: Verificar TypeScript compila**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit`
Expected: sin errores. Si TypeScript se queja porque `raw.antecedentes_cie10` no existe en el tipo, ubicar la definición del tipo `raw` (probablemente cerca del top de `build-clinical-excel.ts` o en `src/lib/clinical/types.ts`) y agregarle la propiedad `antecedentes_cie10?: string;`.

- [ ] **Step 4: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/lib/clinical/build-clinical-excel.ts src/lib/clinical/types.ts
git commit -m "feat(clinical): add Antecedentes CIE-10 column to Excel export"
```

(Si no se modificó `types.ts`, omitirlo del `git add`.)

---

## Task 6: Smoke test integral

**Files:** ninguno

- [ ] **Step 1: Build de producción**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build`
Expected: build exitoso, sin errores de TypeScript ni de lint.

- [ ] **Step 2: Smoke en dev**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

Repetir el flujo del Task 4, Step 7 con casos límite adicionales:

1. **Solo CIE-10, sin chips:** marcar 2 códigos CIE-10, ningún chip ni botón grande. Completar. Verificar que `antecedentes` queda vacío y `antecedentes_cie10` tiene los 2 códigos.
2. **Solo "Ninguno":** marcar "Ninguno de los anteriores". Completar. Verificar que `antecedentes=Ninguna` en la URL final.
3. **DM + SCA + 3 chips + 4 CIE-10:** verificar que el scoring detecta `dm2` y `sca` (mirar el reporte clínico generado o, en consola del browser, buscar el log de `dm2`/`sca` si existe).
4. **Búsqueda por código exacto:** en el buscador escribir `I10` → debe aparecer hipertensión esencial.
5. **Búsqueda por nombre con tilde:** escribir `hipertension` (sin tilde) → debe encontrar resultados (validación de la normalización).
6. **Bloqueo de duplicados:** seleccionar el mismo CIE-10 dos veces → el [+] del segundo intento debe estar gris.

Detener el dev server.

- [ ] **Step 3: Commit final si hubo ajustes durante smoke**

Si surge algún ajuste menor durante el smoke, aplicarlo y commitear. Si no, no hacer commit vacío.

---

## Notas para el implementador

- **No tocar** las líneas 221-223 de `Questionnaire.tsx` (`hasComorbidities`, `sca`, `dm2`). Los strings que envía el nuevo componente son idénticos a los que ya espera ese código.
- **No tocar** `dashboard-aggregations.ts`. La card "Antecedentes — top 5" debe seguir leyendo solo `antecedentes` (chips + DM/SCA) — los códigos CIE-10 individuales no producen un top útil.
- **Si `npx tsc --noEmit` ya falla antes de empezar el plan** (errores preexistentes), tomar nota del baseline antes de Task 1 para no atribuirlos a tus cambios.
- **El JSON `public/data/cie10.json` se commitea**. Esto evita tener que correr el script en CI/CD y garantiza determinismo del deploy.

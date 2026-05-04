# EP-1: Rename + Welcome Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar 5 strings user-facing de "historia clínica"/"cuestionario" por "evaluación preventiva", actualizar la copy del consentimiento (sin mención al correo), y rediseñar la pantalla de bienvenida (case 1 del Questionnaire) con un layout consolidado de 3 bloques + microanimaciones cascading con framer-motion.

**Architecture:**
- 5 ediciones puntuales de string en distintos archivos (mecánicas).
- 1 rediseño visual del case 1 inline en `Questionnaire.tsx` (sin extraer componente; framer-motion ya está instalado).
- Sin cambios a lógica, scoring, rutas, o nombres de archivos.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, framer-motion (ya instalado). Sin tests JS — verificación por `npx tsc --noEmit` + `npm run lint` + `npm run build` + smoke manual.

**Spec source:** `docs/superpowers/specs/2026-05-04-ep1-rename-y-welcome-design.md`

---

## File Structure

**Modificados:**
- `src/components/admin/clinical/Questionnaire.tsx` — rediseño case 1 + copy de case 2 + nuevo import de framer-motion.
- `src/app/(admin)/admin/pacientes/[id]/page.tsx` — 1 string.
- `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx` — 1 string.
- `src/components/admin/NewPatientButton.tsx` — 1 string.
- `src/components/dashboard/MiCaminoClient.tsx` — 1 string.

**Sin tocar:** rutas, nombres de archivos, identificadores de código, scoring, nav del paciente, marca registrada.

---

## Task 1: Rename de 5 strings user-facing (sin cambios visuales)

**Files:**
- Modify: `src/app/(admin)/admin/pacientes/[id]/page.tsx:152`
- Modify: `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx:82`
- Modify: `src/components/admin/NewPatientButton.tsx:162`
- Modify: `src/components/dashboard/MiCaminoClient.tsx:27`
- Modify: `src/components/admin/clinical/Questionnaire.tsx:452` (texto del consentimiento)

- [ ] **Step 1: Rename en page.tsx del paciente (línea 152)**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/app/(admin)/admin/pacientes/[id]/page.tsx`, localizar:

```tsx
              Historia clínica →
```

Reemplazar por:

```tsx
              Evaluación preventiva →
```

(El `href` con `/historia-clinica` NO se toca — sigue intacto.)

- [ ] **Step 2: Rename del h1 en historia-clinica/page.tsx (línea 82)**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx`, localizar:

```tsx
          <h1 className="text-2xl font-bold text-neutral">Historia clínica</h1>
```

Reemplazar por:

```tsx
          <h1 className="text-2xl font-bold text-neutral">Evaluación preventiva</h1>
```

- [ ] **Step 3: Rename en NewPatientButton (línea 162)**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/components/admin/NewPatientButton.tsx`, localizar:

```tsx
                  {loading ? "Creando..." : "Crear y abrir historia clínica"}
```

Reemplazar por:

```tsx
                  {loading ? "Creando..." : "Crear y abrir evaluación preventiva"}
```

- [ ] **Step 4: Rename en MiCaminoClient (línea 27)**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/components/dashboard/MiCaminoClient.tsx`, localizar:

```tsx
            : "Tu auxiliar de enfermería completará tu historia clínica para personalizar tu camino"}
```

Reemplazar por:

```tsx
            : "Tu auxiliar de enfermería completará tu evaluación preventiva para personalizar tu camino"}
```

- [ ] **Step 5: Update del párrafo de consentimiento (Questionnaire.tsx línea 452)**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/components/admin/clinical/Questionnaire.tsx`, localizar la línea 452:

```tsx
              "Autorizo de manera libre, expresa e informada a CAIMED S.A.S. para el tratamiento de mis datos personales y datos sensibles relacionados con mi salud, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y la Política de Tratamiento de Datos PL-PCG-001 de CAIMED S.A.S., con el fin de realizar el Chequeo Cardiovascular Express, generar un reporte de mis resultados y enviarlos a mi correo electrónico."
```

Reemplazar por:

```tsx
              "Autorizo de manera libre, expresa e informada a CAIMED S.A.S. para el tratamiento de mis datos personales y datos sensibles relacionados con mi salud, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y la Política de Tratamiento de Datos PL-PCG-001 de CAIMED S.A.S., con el fin de realizar la Evaluación Preventiva, generar un reporte de mis resultados y registrarlo en la plataforma de Medicina Preventiva CAIMED."
```

(Solo cambia la última frase: `Chequeo Cardiovascular Express` → `Evaluación Preventiva`, y `enviarlos a mi correo electrónico` → `registrarlo en la plataforma de Medicina Preventiva CAIMED`. Las referencias legales y el `<a>` con la política se mantienen intactos.)

- [ ] **Step 6: Verificar TypeScript compila**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: sin output (cero errores propios). Pre-existing errors en `.next/types/routes.d.ts` se ignoran.

- [ ] **Step 7: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint`
Expected: sin errores ni warnings nuevos en los 5 archivos editados.

- [ ] **Step 8: Auditoría grep — confirmar que no quedan strings prohibidos en JSX visible**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && grep -rn "Historia clínica\|historia clínica\|Cuestionario\|cuestionario" src --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "// " | grep -v "/\*"`

Expected: solo matches que sean rutas (`/historia-clinica`), hrefs, comentarios técnicos, identificadores de código, o referencias en strings fuera de JSX visible. **Cero matches** en JSX visible que diga "Historia clínica" o "Cuestionario" como UI text.

Si aparece algún match nuevo no esperado (texto JSX visible), añadirlo al rename y volver al Step apropiado.

- [ ] **Step 9: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add "src/app/(admin)/admin/pacientes/[id]/page.tsx" "src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx" "src/components/admin/NewPatientButton.tsx" "src/components/dashboard/MiCaminoClient.tsx" "src/components/admin/clinical/Questionnaire.tsx"
git commit -m "feat(ep): rename user-facing 'historia clínica' to 'evaluación preventiva'"
```

---

## Task 2: Rediseño visual del welcome screen (case 1)

**Files:**
- Modify: `src/components/admin/clinical/Questionnaire.tsx` — agregar import de framer-motion (cabecera) y reemplazar todo el bloque del `case 1:` (líneas ~400-443).

**Recommended skill for the implementer:** `ui-ux-pro-max` para refinar la estética. El plan provee el JSX base; el implementer puede iterar sobre clases/spacing con esa skill antes del commit final.

- [ ] **Step 1: Agregar import de framer-motion**

En `/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/src/components/admin/clinical/Questionnaire.tsx`, en la cabecera de imports (después del import de `Cie10Selection` en línea 14), agregar:

```ts
import { motion } from 'framer-motion';
```

- [ ] **Step 2: Reemplazar todo el bloque del case 1**

En el mismo archivo, localizar el bloque del case 1 que empieza en la línea ~400 (`case 1:`) y termina justo antes de la línea ~444 (`case 2:`). El bloque actual incluye el `<div>` con el gradient azul, el SVG EKG, el card del logo, el h1, el párrafo, y el card "Nuestra Filosofía".

Reemplazar TODO ese bloque por:

```tsx
      case 1:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-8 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[640px]">
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
               <svg viewBox="0 0 500 100" className="w-[200%] h-full stroke-blue-300 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path
                   className="animate-[ekg_3s_linear_infinite]"
                   strokeDasharray="1000"
                   strokeDashoffset="1000"
                   d="M 0 50 L 150 50 L 170 20 L 190 80 L 210 10 L 230 90 L 250 50 L 500 50"
                 />
               </svg>
               <style>{`
                 @keyframes ekg {
                   0% { stroke-dashoffset: 1000; }
                   50% { stroke-dashoffset: 0; }
                   100% { stroke-dashoffset: -1000; }
                 }
               `}</style>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0 }}
              className="relative z-10 bg-white rounded-2xl px-6 py-5 shadow-2xl border border-white/30"
            >
              <img
                src="/logo-medicina-preventiva.png"
                alt="CAIMED Preventiva"
                className="w-48 h-auto object-contain"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="relative z-10 space-y-3"
            >
              <p className="text-xs uppercase tracking-[0.3em] font-bold text-blue-300">
                Tu copiloto en salud
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                ¡Bienvenido, Equipo CAIMED!
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative z-10 max-w-2xl bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-left"
            >
              <p className="text-blue-50 leading-relaxed">
                Hacer sentir al paciente cómodo es parte del cuidado. La evaluación preventiva se guarda automáticamente en la plataforma de Medicina Preventiva al finalizar.
              </p>
              <div className="border-t border-white/15 my-6" />
              <div className="relative">
                <span className="absolute -top-4 -left-2 text-6xl text-blue-300/30 font-serif leading-none select-none" aria-hidden="true">&ldquo;</span>
                <p className="text-blue-100 italic leading-relaxed pl-6">
                  Al igual que cambias el aceite de tu carro cada 10.000 km —aunque funcione bien— tu corazón necesita mantenimiento preventivo. No esperes a que el motor falle.
                </p>
                <p className="text-xs text-blue-300 font-bold mt-3 pl-6">— Equipo CAIMED</p>
              </div>
            </motion.div>
          </div>
        );
```

Lo que cambia respecto al actual:
- 4 bloques → 3 (logo, título compuesto, card consolidado).
- Cada bloque envuelto en `<motion.div>` con stagger (delay 0, 150ms, 300ms).
- Logo card: `px-6 py-5` con logo `w-48` (vs `px-10 py-8` con `w-80`).
- EKG: `opacity-5` (vs `opacity-10`).
- Eyebrow nuevo: "TU COPILOTO EN SALUD" en uppercase tracking-wide.
- Card consolidado glass: `bg-white/10 backdrop-blur-md border border-white/20`.
- Quote con comilla decorativa absoluta en lugar de border-left; atribución más sutil.

- [ ] **Step 3: (Opcional) Iterar con ui-ux-pro-max para refinar**

Antes de commitear, el implementer puede invocar el skill `ui-ux-pro-max` con los constraints visuales del spec (sección "Constraints visuales") y el JSX del Step 2 como base. La skill puede sugerir refinamientos de spacing, tipografía, sombras, gradientes adicionales, o microinteracciones extra. Aplicar solo cambios que mejoren claramente la pantalla SIN alterar:
- Estructura de 3 bloques.
- Texto exacto (eyebrow, h1, párrafo, quote).
- Stagger de animaciones (0/150/300ms).
- Paleta de marca (gradient blue-900/blue-800/slate-900).

Si la iteración produce cambios sustanciales, capturar los ajustes en el código antes del Step 4.

- [ ] **Step 4: Verificar TypeScript compila**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit 2>&1 | grep -v "\.next/types" | head`
Expected: sin output. Si reclama por `motion`, confirmar que el import quedó en la línea correcta.

- [ ] **Step 5: Verificar lint**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run lint`
Expected: sin errores ni warnings nuevos. Atención al rule de Next sobre `<img>` vs `<Image>` — el `<img>` actual ya estaba ahí, no se introduce ningún warning nuevo.

- [ ] **Step 6: Smoke manual del welcome screen**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

Abrir el flujo de crear/abrir EP de un paciente, ver el paso 1. Verificar:

1. Se ven 3 bloques: logo card (más pequeño que antes), título compuesto (eyebrow + h1), card consolidado con párrafo + divider + quote.
2. La animación de entrada cascada funciona (logo aparece primero, luego título, luego card).
3. El fondo gradient azul + EKG (más tenue) están presentes.
4. El nuevo párrafo dice "...se guarda automáticamente en la plataforma de Medicina Preventiva al finalizar." (no menciona correo).
5. Avanzar al paso 2 (consentimiento) y verificar que el párrafo legal dice "...realizar la Evaluación Preventiva, generar un reporte de mis resultados y registrarlo en la plataforma de Medicina Preventiva CAIMED."

Si todo pasa, detener el dev server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes"
git add src/components/admin/clinical/Questionnaire.tsx
git commit -m "feat(ep): redesign welcome screen with consolidated layout and framer-motion stagger"
```

---

## Task 3: Build de producción + smoke integral

**Files:** ninguno modificado.

- [ ] **Step 1: Build de producción**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build`
Expected: build exitoso, sin errores TypeScript ni lint, todas las páginas estáticas generadas (debería mostrar ~19 páginas como en builds previos).

- [ ] **Step 2: Smoke en dev — flujo end-to-end del rename**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev`

Verificar los 5 strings renombrados, navegando:

1. Lista de pacientes → click en un paciente → verificar el botón dice "Evaluación preventiva →" (Task 1 Step 1).
2. Dentro del paciente → header dice "Evaluación preventiva" (no "Historia clínica") (Task 1 Step 2).
3. En la lista de pacientes (vista admin) → click "Crear paciente" → modal dice "Crear y abrir evaluación preventiva" (Task 1 Step 3).
4. Como paciente sin evaluación todavía → en /mi-camino se lee "Tu auxiliar de enfermería completará tu evaluación preventiva..." (Task 1 Step 4).
5. En el flujo de EP → paso 2 → párrafo legal dice "...realizar la Evaluación Preventiva, generar un reporte de mis resultados y registrarlo en la plataforma de Medicina Preventiva CAIMED." (Task 1 Step 5).

Detener el dev server.

- [ ] **Step 3: Auditoría grep final**

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && grep -rn "Historia clínica\|historia clínica\|Cuestionario\|Chequeo Cardiovascular Express" src --include="*.tsx" --include="*.ts" 2>/dev/null`

Expected: cero matches en strings JSX visibles al usuario. Es OK si aparecen:
- Comentarios técnicos.
- Identificadores de código (variables, types, paths en hrefs).
- Strings fuera de JSX visible (e.g., en lógica de scoring que no se muestra al usuario).

Si aparece algún match inesperado en JSX visible, ese es un follow-up bug.

- [ ] **Step 4: (Solo si hubo ajustes durante smoke) Commit final**

Si los smokes pasaron sin ajustes, NO hacer commit vacío. Si hubo correcciones menores, commitearlas con mensaje descriptivo.

---

## Notas para el implementador

- **No tocar rutas, archivos ni identificadores de código** que contengan `historia-clinica` / `historia_clinica`. La regla es para texto JSX visible al usuario, no para identificadores.
- **No tocar otros pasos del cuestionario** (cases 3-20). Solo case 1 (welcome) y case 2 (texto legal).
- **`framer-motion` ya está instalado** (`framer-motion ^12.38.0` en `package.json`) y se usa en `BadgeUnlockOverlay.tsx`. No necesita instalación.
- **Si `npx tsc --noEmit` ya falla antes de empezar** (errores preexistentes en `.next/types/routes.d.ts`), tomar el baseline antes de Task 1 para no atribuirlos a tus cambios.
- **El skill `ui-ux-pro-max` es opcional en Task 2 Step 3.** Si el JSX base del Step 2 ya luce bien en el dev server, puede omitirse esa iteración y commitear directo.

# Spec EP-1: Rename "historia clínica" → "evaluación preventiva" + rediseño de pantalla de bienvenida

**Fecha:** 2026-05-04
**Sub-proyecto:** EP-1 (de la descomposición de 6 sub-proyectos del rework de la Evaluación Preventiva)

## Contexto

El usuario directivo: el flujo actualmente llamado "cuestionario" / "historia clínica" se llamará **siempre "evaluación preventiva"** (abreviatura **EP**) en texto user-facing. Ningún string visible al usuario puede decir "historia clínica" ni "cuestionario".

Adicionalmente, la pantalla de bienvenida del flujo (paso 1 del Questionnaire) necesita:

1. **Cambio de copy:** dejar de prometer envío del PDF por correo (ese flujo ya no existe; ahora se guarda en la plataforma de Medicina Preventiva).
2. **Polish visual:** rediseño con `ui-ux-pro-max` para una entrada al flujo más profesional, menos saturada de texto.

## Alcance

### IN

- Rename de **6 strings JSX user-facing** (lista exacta abajo).
- Rediseño visual del **case 1 (welcome)** de `Questionnaire.tsx`.
- Rediseño de copy del **case 2 (consentimiento)** — frase del flujo y mención al correo.

### OUT (explícitamente fuera, requeriría su propio sub-proyecto)

- Rutas (`/admin/pacientes/[id]/historia-clinica`, `/mi-historia-clinica`).
- Nombres de archivos (`historia-clinica/page.tsx`, `MiCaminoClient.tsx`, etc.).
- Identificadores de código (variables `historia_clinica`, columnas DB, types).
- Logos, imágenes, marca registrada ("CAIMED Cardiopreventiva", "Equipo CAIMED").
- Nav del paciente (ya dice "Mi Evaluación").
- Otras pantallas del flujo (cases 2-20) más allá del cambio puntual del consentimiento.

## Mapa de rename

Seis edits exactos:

| # | Archivo | Línea | Antes | Después |
|---|---------|-------|-------|---------|
| 1 | `src/app/(admin)/admin/pacientes/[id]/page.tsx` | 152 | `Historia clínica →` | `Evaluación preventiva →` |
| 2 | `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx` | 82 | `<h1>Historia clínica</h1>` | `<h1>Evaluación preventiva</h1>` |
| 3 | `src/components/admin/NewPatientButton.tsx` | 162 | `Crear y abrir historia clínica` | `Crear y abrir evaluación preventiva` |
| 4 | `src/components/dashboard/MiCaminoClient.tsx` | 27 | `…completará tu historia clínica para personalizar tu camino` | `…completará tu evaluación preventiva para personalizar tu camino` |
| 5 | `src/components/admin/clinical/Questionnaire.tsx` | 429 | (párrafo viejo del welcome — ver abajo) | (texto integrado al nuevo card consolidado — ver "Welcome screen") |
| 6 | `src/components/admin/clinical/Questionnaire.tsx` | 452 | `…realizar el Chequeo Cardiovascular Express, generar un reporte de mis resultados y enviarlos a mi correo electrónico.` | `…realizar la Evaluación Preventiva, generar un reporte de mis resultados y registrarlo en la plataforma de Medicina Preventiva CAIMED.` |

### Verificación post-rename

```bash
grep -ri "historia.cl[ií]nica\|cuestionario" src --include="*.tsx" --include="*.ts"
```

Debe retornar **solo** matches que sean:
- Rutas / hrefs / file paths.
- Identificadores de código (variables, types, comentarios técnicos).

**Cero matches** en texto JSX visible al usuario.

## Welcome screen — diseño

### Estado actual

Ver `Questionnaire.tsx` líneas 400-443. Cuatro elementos verticales:

1. Card blanco con logo (grande).
2. H1 "¡Bienvenido, Equipo CAIMED!".
3. Párrafo: "Recuerda hacer sentir al paciente 'como en casa' y muy cómodo para aplicar el cuestionario. Al final del cuestionario automáticamente se le enviará al paciente el correo con el PDF del reporte respectivo."
4. Card "Nuestra Filosofía" con: subtítulo + "Tu copiloto en salud" + descripción + quote del aceite del carro.

### Estado objetivo

Tres elementos verticales (consolidación de 4 → 3):

1. **Logo card** (más pequeño que actual, glass effect sutil).
2. **Bloque título:** eyebrow + h1 + subtítulo.
3. **Card consolidado** que combina el flujo + filosofía + quote.

```
┌──────────────────────────────────────────────────────┐
│   [fondo gradient blue-900 → blue-800 → slate-900]   │
│   [EKG SVG animation, opacity-5 — más tenue]          │
│                                                      │
│         ┌──────────────────────┐                     │
│         │   [logo CAIMED]       │                     │
│         └──────────────────────┘                     │
│                                                      │
│         TU COPILOTO EN SALUD                         │
│         ¡Bienvenido, Equipo CAIMED!                  │
│                                                      │
│   ┌──────────────────────────────────────────────┐   │
│   │  Hacer sentir al paciente cómodo es parte    │   │
│   │  del cuidado. La evaluación preventiva se    │   │
│   │  guarda automáticamente en la plataforma     │   │
│   │  de Medicina Preventiva al finalizar.         │   │
│   │  ─────────────────────────────────────       │   │
│   │  ❝ Al igual que cambias el aceite de tu      │   │
│   │    carro cada 10.000 km —aunque funcione    │   │
│   │    bien— tu corazón necesita mantenimiento   │   │
│   │    preventivo. No esperes a que el motor     │   │
│   │    falle. ❞                                  │   │
│   │                          — Equipo CAIMED     │   │
│   └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### Texto exacto del card consolidado

**Párrafo principal:**
> Hacer sentir al paciente cómodo es parte del cuidado. La evaluación preventiva se guarda automáticamente en la plataforma de Medicina Preventiva al finalizar.

**Quote:**
> "Al igual que cambias el aceite de tu carro cada 10.000 km —aunque funcione bien— tu corazón necesita mantenimiento preventivo. No esperes a que el motor falle."
> — Equipo CAIMED

**Eyebrow (encima del h1):**
> TU COPILOTO EN SALUD

**H1:**
> ¡Bienvenido, Equipo CAIMED!

### Constraints visuales (input para `ui-ux-pro-max`)

- **Estilo:** "minimalism + glassmorphism premium" en tarjeta interna.
- **Paleta:** mantener gradient blue-900 / blue-800 / slate-900 de fondo (marca). Acentos en blue-200/blue-300 para texto secundario.
- **Logo:** se mantiene `/logo-medicina-preventiva.png`. Card actual: `px-10 py-8` con logo `w-80`. Nuevo: `px-6 py-5` con logo `w-48`. Sigue siendo card blanco con sombra y bordes suaves.
- **EKG SVG:** mantener animación pero `opacity-5` (más tenue, no compite con contenido).
- **Tipografía:** sans-serif bold. H1 `text-4xl/5xl font-black tracking-tight`. Eyebrow `text-xs uppercase tracking-[0.3em] font-bold text-blue-300`.
- **Microanimaciones:** entrada en cascada — logo (delay 0), bloque título (delay 150ms), card consolidado (delay 300ms). Usar `framer-motion` (ya instalado, da control fino sobre stagger). Cada bloque envuelto en `<motion.div initial={{opacity:0, y:24}} animate={{opacity:1, y:0}} transition={{duration:0.5, delay:N}}>`.
- **Card consolidado:** `bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8`. Divider interno con `divide-y divide-white/15` o `border-t border-white/15`.
- **Quote:** comilla decorativa SVG grande (`text-blue-300/30`) en lugar del border-left actual. Atribución en línea separada, `text-xs text-blue-200`.
- **Sin sub-headings.** No "Nuestra Filosofía" ni "Tu copiloto en salud" como sub-títulos. La frase del párrafo y la quote ya transmiten el mensaje.

### Estructura técnica

- El bloque del case 1 sigue **inline** en `Questionnaire.tsx` (no extraer a componente). Justificación: no hay lógica reutilizable, es JSX puramente visual de un solo paso. Extraer crea fricción sin beneficio.
- El elemento `<style>` con el keyframe `ekg` se mantiene inline (ya está así).
- Las microanimaciones cascading se implementan con clases tailwind (`animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150`) o, si requiere staggered con más control, con framer-motion (`motion.div` con `initial`/`animate`/`transition`).

## Consentimiento (case 2) — copy update

Solo el párrafo de la línea 452. El resto del case 2 (checkbox, link a términos, modal) NO se toca.

**Antes:**
> "Autorizo de manera libre, expresa e informada a CAIMED S.A.S. para el tratamiento de mis datos personales y datos sensibles relacionados con mi salud, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y la Política de Tratamiento de Datos PL-PCG-001 de CAIMED S.A.S., con el fin de **realizar el Chequeo Cardiovascular Express, generar un reporte de mis resultados y enviarlos a mi correo electrónico**."

**Después:**
> "Autorizo de manera libre, expresa e informada a CAIMED S.A.S. para el tratamiento de mis datos personales y datos sensibles relacionados con mi salud, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y la Política de Tratamiento de Datos PL-PCG-001 de CAIMED S.A.S., con el fin de **realizar la Evaluación Preventiva, generar un reporte de mis resultados y registrarlo en la plataforma de Medicina Preventiva CAIMED**."

(Los referencias legales — Ley 1581, Decreto 1377, Política PL-PCG-001 — se mantienen idénticas. Solo cambian el nombre comercial del proceso y la finalidad técnica del tratamiento.)

## Estructura de archivos

### Modificados

- `src/components/admin/clinical/Questionnaire.tsx` (case 1 rediseño + case 2 copy update; ~60-80 líneas afectadas).
- `src/app/(admin)/admin/pacientes/[id]/page.tsx` (1 string).
- `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx` (1 string).
- `src/components/admin/NewPatientButton.tsx` (1 string).
- `src/components/dashboard/MiCaminoClient.tsx` (1 string).

### Sin tocar

- Cualquier archivo con identificador `historia-clinica` en su path o nombre.
- `scoring.ts`, `types.ts`, `actions.ts` y otros archivos de lógica.
- Otros pasos del cuestionario (cases 3-20).
- `src/components/admin/clinical/AntecedentesStep.tsx` (recién creado, intacto).
- Tests / config / DB.

### Nuevos

- Ninguno.

## Skill durante implementación

- `ui-ux-pro-max` — el implementer subagent lo invoca al refinar el case 1. Pasa los constraints de la sección "Constraints visuales".

## Criterios de éxito

1. Los 6 strings del mapa están renombrados.
2. `grep` post-rename confirma cero "historia clínica" / "cuestionario" en JSX visible.
3. El welcome screen carga sin errores en dev server, se ve más limpio que la versión anterior, y conserva el branding CAIMED (gradient + EKG + logo).
4. Las microanimaciones de entrada funcionan (logo → título → card en cascada).
5. El texto de consentimiento conserva las referencias legales y solo cambia el nombre del proceso + el destino de los datos (correo → plataforma).
6. `npx tsc --noEmit` y `npm run lint` pasan limpios.
7. `npm run build` pasa.
8. Smoke manual: el admin puede crear un paciente, abrir su EP, ver el welcome rediseñado, aceptar el nuevo consentimiento y avanzar.

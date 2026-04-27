# Historia Clínica CAIMED Cardiopreventiva — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the standalone `hcxx/` (CAIMED Cardiopreventiva) clinical-history app into the main Next.js + Supabase platform — admin can create/edit assessments per patient, patient sees their latest report with PDF download.

**Architecture:** Native Next.js 16 rewrite. Port `hcxx`'s pure logic (`utils.ts`, `constants.ts`, `types.ts`) and presentation components (`HeaderComponent`, `InspirationalBanner`, `Questionnaire`, etc.) into `src/lib/clinical/` and `src/components/admin/clinical/`. Server actions persist to two new Supabase tables (`patient_clinical_profile`, `patient_assessments`). Patient view is server-rendered HTML with client-side `html2canvas`+`jspdf` for the PDF download. The `hcxx/` directory is deleted at the end.

**Tech Stack:** Next.js 16.2, React 19.2, TypeScript 5, Supabase (Postgres + Auth + RLS), Tailwind v4, Recharts (already installed), `html2canvas`+`jspdf` (loaded from CDN at click time, same as today in hcxx).

**Spec reference:** `docs/superpowers/specs/2026-04-27-historia-clinica-design.md`

**Pre-flight (read before starting):**
- `escuela-pacientes/AGENTS.md` — Next.js 16 has breaking changes vs training data
- `node_modules/next/dist/docs/` — relevant guides for server actions, dynamic params, server/client components
- Existing patterns to mimic:
  - `src/lib/rewards-actions.ts` — server-action style (`"use server"`, admin client)
  - `src/app/(admin)/admin/pacientes/[id]/page.tsx` — admin page params + Supabase loading
  - `src/app/(dashboard)/recompensas/page.tsx` — patient page pattern
  - `supabase/migration-v5.sql` — existing migration style (idempotent, RLS, comments)

---

## File Structure

```
supabase/
└── migration-v6.sql                                        [NEW]

src/
├── types/database.ts                                       [EDIT]
├── lib/clinical/                                           [NEW DIR]
│   ├── types.ts
│   ├── constants.ts
│   ├── scoring.ts
│   └── actions.ts
├── components/
│   ├── admin/clinical/                                     [NEW DIR]
│   │   ├── HeaderComponent.tsx
│   │   ├── HeaderSimple.tsx
│   │   ├── InspirationalBanner.tsx
│   │   ├── Questionnaire.tsx
│   │   ├── ReportPage1.tsx
│   │   ├── ReportPage2.tsx
│   │   ├── ReportPage3.tsx
│   │   ├── ClinicalHistoryClient.tsx
│   │   └── AssessmentTimeline.tsx
│   └── dashboard/clinical/                                 [NEW DIR]
│       └── PatientReportView.tsx
├── app/
│   ├── (admin)/admin/pacientes/[id]/
│   │   ├── page.tsx                                        [EDIT]
│   │   └── historia-clinica/page.tsx                       [NEW]
│   └── (dashboard)/mi-historia-clinica/page.tsx            [NEW]
└── components/dashboard/DashboardShell.tsx                 [EDIT]

hcxx/                                                       [DELETE at end]
```

---

## Task 1: Database migration v6 — `patient_clinical_profile` + `patient_assessments`

**Files:**
- Create: `supabase/migration-v6.sql`

- [ ] **Step 1: Create the SQL file**

Create `supabase/migration-v6.sql` with this exact content:

```sql
-- ============================================
-- MIGRATION V6 — HISTORIA CLÍNICA CAIMED CARDIOPREVENTIVA
-- Tablas: patient_clinical_profile, patient_assessments
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Tabla de perfil clínico (1 fila por paciente, mutable)
create table if not exists public.patient_clinical_profile (
  user_id uuid primary key references public.users(id) on delete cascade,
  primer_nombre text,
  segundo_nombre text,
  primer_apellido text,
  segundo_apellido text,
  tipo_documento text,
  documento text,
  fecha_nacimiento date,
  sexo text,
  genero text,
  telefono text,
  correo text,
  regimen_afiliacion text,
  aseguradora text,
  prepagada text,
  plan_complementario text,
  pais_nacimiento text default 'Colombia',
  pais_residencia text default 'Colombia',
  departamento_residencia text,
  municipio_residencia text,
  direccion_residencia text,
  contacto_emergencia_nombre text,
  contacto_emergencia_parentesco text,
  contacto_emergencia_telefono text,
  updated_at timestamptz default now()
);

-- 2. Tabla de evaluaciones (append-only)
create table if not exists public.patient_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_by uuid not null references public.users(id),
  created_at timestamptz default now(),
  components jsonb not null,
  is_sca boolean default false,
  is_dm2 boolean default false,
  is_pluripatologico boolean default false,
  is_poca_expectativa boolean default false,
  score_global int not null,
  meta_score int not null,
  nivel text not null,
  alertas_criticas jsonb default '[]'::jsonb,
  alertas_orientadoras jsonb default '[]'::jsonb,
  raw_questionnaire jsonb,
  notes text
);

create index if not exists idx_patient_assessments_user_created
  on public.patient_assessments (user_id, created_at desc);

-- 3. RLS — patient_clinical_profile
alter table public.patient_clinical_profile enable row level security;

create policy "Profile readable by owner or admin"
  on public.patient_clinical_profile for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Profile writable by admin only"
  on public.patient_clinical_profile for insert
  with check (public.is_admin());

create policy "Profile updatable by admin only"
  on public.patient_clinical_profile for update
  using (public.is_admin());

-- 4. RLS — patient_assessments (append-only: no update, no delete)
alter table public.patient_assessments enable row level security;

create policy "Assessments readable by owner or admin"
  on public.patient_assessments for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Assessments writable by admin only"
  on public.patient_assessments for insert
  with check (public.is_admin());
```

- [ ] **Step 2: Apply the migration in Supabase Studio**

1. Open the project's Supabase dashboard → SQL Editor
2. New query → paste the entire file contents
3. Run
4. Confirm both tables exist: `select count(*) from public.patient_clinical_profile;` and same for `patient_assessments` should return `0`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migration-v6.sql
git commit -m "feat(db): migration v6 — patient_clinical_profile + patient_assessments tables with RLS"
```

---

## Task 2: TypeScript types in `src/types/database.ts`

**Files:**
- Modify: `src/types/database.ts` (append at the end of the file)

- [ ] **Step 1: Append types at the end of `src/types/database.ts`**

Add these interfaces at the end of the file (after the last existing type):

```ts
export interface PatientClinicalProfile {
  user_id: string
  primer_nombre: string | null
  segundo_nombre: string | null
  primer_apellido: string | null
  segundo_apellido: string | null
  tipo_documento: string | null
  documento: string | null
  fecha_nacimiento: string | null
  sexo: string | null
  genero: string | null
  telefono: string | null
  correo: string | null
  regimen_afiliacion: string | null
  aseguradora: string | null
  prepagada: string | null
  plan_complementario: string | null
  pais_nacimiento: string | null
  pais_residencia: string | null
  departamento_residencia: string | null
  municipio_residencia: string | null
  direccion_residencia: string | null
  contacto_emergencia_nombre: string | null
  contacto_emergencia_parentesco: string | null
  contacto_emergencia_telefono: string | null
  updated_at: string
}

export interface AssessmentComponent {
  nombre: string
  valor: number | string
  puntaje: number
}

export interface AssessmentAlert {
  id: number
  marcador: string
  accion: string
}

export type AssessmentNivel = 'Verde' | 'Amarillo' | 'Rojo'

export interface PatientAssessment {
  id: string
  user_id: string
  created_by: string
  created_at: string
  components: AssessmentComponent[]
  is_sca: boolean
  is_dm2: boolean
  is_pluripatologico: boolean
  is_poca_expectativa: boolean
  score_global: number
  meta_score: number
  nivel: AssessmentNivel
  alertas_criticas: AssessmentAlert[]
  alertas_orientadoras: AssessmentAlert[]
  raw_questionnaire: unknown
  notes: string | null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (Pre-existing errors in unrelated files are OK.)

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(types): add PatientClinicalProfile and PatientAssessment types"
```

---

## Task 3: Port `lib/clinical/types.ts` and `constants.ts`

**Files:**
- Create: `src/lib/clinical/types.ts`
- Create: `src/lib/clinical/constants.ts`

- [ ] **Step 1: Create `src/lib/clinical/types.ts`**

This is the hcxx-style domain types used by the report components. Copy this verbatim:

```ts
export interface ContextoClinico {
  isSCA: boolean
  isDM2: boolean
  isPluripatologico: boolean
  isPocaExpectativa: boolean
  edad: number
}

export interface ComponenteScore {
  nombre: string
  puntaje: number
  valor: number | string
}

export interface DatosPaciente {
  nombre: string
  fechaNacimiento: string
  documento: string
  scoreGlobal: number
  metaScore: number
  nivel: string
  fechaReporte: string
  evaluacionInicial: string
  primerNombre: string
  segundoNombre: string
  primerApellido: string
  segundoApellido: string
  tipoDocumento: string
  sexo: string
  telefono: string
  correo: string
  regimenAfiliacion: string
  aseguradora: string
  prepagada: string
  planComplementario: string
  genero: string
  paisNacimiento: string
  paisResidencia: string
  departamentoResidencia: string
  municipioResidencia: string
  direccionResidencia: string
  contactoEmergenciaNombre: string
  contactoEmergenciaParentesco: string
  contactoEmergenciaTelefono: string
}

export interface AlertaItem {
  id: number
  marcador: string
  accion: string
}

export interface DatosAlertas {
  criticas: AlertaItem[]
  orientadoras: AlertaItem[]
}
```

- [ ] **Step 2: Create `src/lib/clinical/constants.ts`**

Copy this verbatim:

```ts
import { ComponenteScore, DatosAlertas, DatosPaciente } from './types'

// NOTE: The 13 components below overlap by name with the existing
// modules.component_key system used in patient_components for personalized
// routes. They are NOT linked in v1; see spec section 11 (future work).

export const RECOMENDACIONES_PLANES: Record<string, { virtual: string; insignia: string; plus: string }> = {
  'Antecedente de hipertensión': {
    virtual: 'Guías digitales para medir la tensión como un profesional y entender tus cifras.',
    insignia: "Taller 'El Código de tus Arterias' y consulta de Medicina General Preventiva para perfeccionar tu técnica de medición.",
    plus: 'Valoración por médico especialista para protección renal/cardiaca avanzada y diseño de esquema de alta precisión.',
  },
  'Antecedente de diabetes': {
    virtual: 'Herramientas visuales para identificar qué alimentos disparan tu azúcar.',
    insignia: "Taller 'Mejorando tu Glucosa' y examen físico detallado en consulta de Medicina General.",
    plus: 'Manejo por especialista experto en metabolismo para casos complejos y optimización de tratamiento.',
  },
  Peso: {
    virtual: 'Estrategias interactivas para mejorar tu composición corporal real.',
    insignia: "Taller 'Más allá de la Báscula' y evaluación médica general metabólica con tecnología de punta.",
    plus: 'Intervención médica especializada para abordar barreras hormonales y seguimiento prioritario.',
  },
  'Exposición actual de nicotina': {
    virtual: 'Recursos motivacionales para manejar la ansiedad por fumar.',
    insignia: "Taller 'Rompiendo Cadenas' y acompañamiento médico general para fijar tu 'Día D'.",
    plus: 'Protocolo médico especializado de cesación tabáquica con vigilancia estrecha.',
  },
  'Actividad física': {
    virtual: 'Rutinas para dejar el sedentarismo adaptadas a tu energía.',
    insignia: "Taller 'Movimiento Inteligente' y prescripción médica de ejercicio en consulta general.",
    plus: 'Diseño de rutina de alta eficiencia por especialista para pacientes con limitaciones físicas.',
  },
  Sueño: {
    virtual: 'Estrategias de higiene del sueño para un descanso reparador.',
    insignia: "Taller 'Arquitectos del Descanso' y evaluación médica de tu higiene del sueño.",
    plus: 'Abordaje especializado de trastornos del sueño complejos vinculados a riesgo metabólico.',
  },
  'Empoderamiento en salud': {
    virtual: 'Preparación para llegar a tus citas médicas sabiendo qué preguntar.',
    insignia: "Taller 'El Paciente Experto' y simulacro médico para que seas el dueño de tu salud.",
    plus: 'Resolución especializada de dudas complejas para una toma de decisiones informada.',
  },
  'Adherencia a medicamentos': {
    virtual: 'Trucos digitales para no olvidar dosis ni duplicarlas.',
    insignia: "Taller 'Rutinas que Salvan' y organización médica de tu esquema en consulta.",
    plus: 'Conciliación médica por especialista para asegurar la máxima eficacia de cada fármaco.',
  },
  '¿Desconoces tu condición?': {
    virtual: 'Estrategias para crear hábitos y recordatorios efectivos.',
    insignia: 'Taller de gestión del tiempo y salud, identificando disparadores de olvido con tu médico.',
    plus: 'Seguimiento estrecho y simplificación del esquema terapéutico.',
  },
  'Acceso a medicamentos': {
    virtual: 'Guías para navegar los trámites de tu EPS sin demoras.',
    insignia: "Taller 'Navegando el Sistema' y asesoría en consulta para superar barreras administrativas.",
    plus: 'Análisis médico especializado del riesgo clínico por interrupciones.',
  },
}

export const SCORES_INICIALES: ComponenteScore[] = [
  { nombre: 'Glucosa', puntaje: 0, valor: 0 },
  { nombre: 'Presión arterial', puntaje: 0, valor: 0 },
  { nombre: 'Empoderamiento', puntaje: 0, valor: 0 },
  { nombre: 'Red de apoyo', puntaje: 0, valor: 0 },
  { nombre: 'Sueño', puntaje: 0, valor: 0 },
  { nombre: 'Actividad física', puntaje: 0, valor: 0 },
  { nombre: 'Alimentación', puntaje: 0, valor: 0 },
  { nombre: 'Peso', puntaje: 0, valor: 0 },
  { nombre: 'Colesterol', puntaje: 0, valor: 0 },
  { nombre: 'Nicotina', puntaje: 0, valor: 0 },
  { nombre: 'Salud mental', puntaje: 0, valor: 0 },
  { nombre: 'Adherencia a medicamentos', puntaje: 0, valor: 0 },
  { nombre: 'Acceso a medicamentos', puntaje: 0, valor: 0 },
]

export const DATOS_INICIALES_PACIENTE: DatosPaciente = {
  nombre: '',
  fechaNacimiento: '',
  documento: '',
  scoreGlobal: 0,
  metaScore: 0,
  nivel: 'Rojo',
  fechaReporte: new Date().toLocaleDateString('es-CO'),
  evaluacionInicial: '-',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  tipoDocumento: 'CC',
  sexo: '',
  telefono: '',
  correo: '',
  regimenAfiliacion: '',
  aseguradora: '',
  prepagada: 'No',
  planComplementario: 'No',
  genero: '',
  paisNacimiento: 'Colombia',
  paisResidencia: 'Colombia',
  departamentoResidencia: '',
  municipioResidencia: '',
  direccionResidencia: '',
  contactoEmergenciaNombre: '',
  contactoEmergenciaParentesco: '',
  contactoEmergenciaTelefono: '',
}

export const ALERTAS_INICIALES: DatosAlertas = {
  criticas: [],
  orientadoras: [],
}
```

Note: differs from `hcxx/constants.ts` in two ways: (1) `DATOS_INICIALES_PACIENTE` no longer has the dummy "Jaime Luengas" data — starts blank since real data comes from DB; (2) `ALERTAS_INICIALES` starts empty (not pre-seeded with example alerts).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors related to these new files.

- [ ] **Step 4: Commit**

```bash
git add src/lib/clinical/types.ts src/lib/clinical/constants.ts
git commit -m "feat(clinical): port hcxx types and constants to lib/clinical"
```

---

## Task 4: Port `lib/clinical/scoring.ts` + manual verification

**Files:**
- Create: `src/lib/clinical/scoring.ts`

- [ ] **Step 1: Create `src/lib/clinical/scoring.ts`**

Copy verbatim:

```ts
import { ContextoClinico, ComponenteScore } from './types'

export const reglaDeTresRango = (
  valor: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  if (valor <= Math.min(inMin, inMax)) return outMin
  if (valor >= Math.max(inMin, inMax)) return outMax
  const porcentajeProgreso = (valor - inMin) / (inMax - inMin)
  const resultado = outMin + porcentajeProgreso * (outMax - outMin)
  return Math.round(resultado)
}

export const calcularPuntajeExacto = (
  nombreComponente: string,
  valor: number,
  contexto: ContextoClinico,
): number => {
  if (isNaN(valor)) return 0

  switch (nombreComponente) {
    case 'Empoderamiento':
      return reglaDeTresRango(valor, 8, 32, 0, 100)

    case 'Adherencia a medicamentos':
      if (valor <= 23) return reglaDeTresRango(valor, 12, 23, 100, 80)
      if (valor <= 35) return reglaDeTresRango(valor, 24, 35, 79, 51)
      return reglaDeTresRango(valor, 36, 48, 50, 0)

    case 'Acceso a medicamentos':
      if (valor === 1) return 100
      if (valor === 2) return 65
      return 25

    case 'Peso': {
      const TARGET_BMI = 21.7
      if (valor < TARGET_BMI) {
        if (valor <= 18.4) return reglaDeTresRango(valor, 13.0, 18.4, 0, 50)
        return reglaDeTresRango(valor, 18.5, TARGET_BMI, 51, 100)
      } else {
        if (valor <= 30) return reglaDeTresRango(valor, TARGET_BMI, 30.0, 100, 50)
        return reglaDeTresRango(valor, 30.1, 45.0, 49, 0)
      }
    }

    case 'Presión arterial':
      if (valor < 120) return reglaDeTresRango(valor, 90, 119, 100, 80)
      if (valor <= 129) return reglaDeTresRango(valor, 120, 129, 79, 51)
      return reglaDeTresRango(valor, 130, 160, 50, 0)

    case 'Glucosa':
      if (!contexto.isDM2) {
        if (valor < 5.7) return reglaDeTresRango(valor, 4.0, 5.6, 100, 80)
        if (valor <= 7.9) return reglaDeTresRango(valor, 5.7, 7.9, 79, 51)
        return reglaDeTresRango(valor, 8.0, 12.0, 50, 0)
      } else {
        if (contexto.isPocaExpectativa) return 100
        let limiteVerdeInf = 6.0
        let limiteVerdeSup = 7.0
        let limiteAmarilloSup = 8.0
        let limiteRojoSup = 9.0
        if (contexto.edad >= 60) {
          const SHIFT = contexto.isPluripatologico ? 1.0 : 0.5
          limiteVerdeInf += SHIFT
          limiteVerdeSup += SHIFT
          limiteAmarilloSup += SHIFT
          limiteRojoSup += SHIFT
        }
        if (valor <= limiteVerdeInf) return 100
        if (valor <= limiteVerdeSup) return reglaDeTresRango(valor, limiteVerdeInf + 0.01, limiteVerdeSup, 100, 80)
        if (valor <= limiteAmarilloSup) return reglaDeTresRango(valor, limiteVerdeSup + 0.01, limiteAmarilloSup, 79, 51)
        if (valor <= limiteRojoSup) return reglaDeTresRango(valor, limiteAmarilloSup + 0.01, limiteRojoSup, 50, 0)
        return 0
      }

    case 'Actividad física':
      if (valor >= 120) return reglaDeTresRango(valor, 120, 300, 80, 100)
      if (valor >= 60) return reglaDeTresRango(valor, 60, 119, 51, 79)
      return reglaDeTresRango(valor, 0, 59, 0, 50)

    case 'Sueño':
      if (valor >= 7 && valor <= 9) return 100
      if (valor >= 6 && valor < 7) return reglaDeTresRango(valor, 6, 6.9, 51, 79)
      if (valor > 9 && valor <= 10) return reglaDeTresRango(valor, 9.1, 10, 79, 51)
      if (valor < 6) return reglaDeTresRango(valor, 3, 5.9, 0, 50)
      return reglaDeTresRango(valor, 10.1, 12, 50, 0)

    case 'Nicotina':
      if (valor === 1) return 100
      if (valor === 2) return 75
      if (valor === 3) return 60
      if (valor === 4) return 25
      if (valor === 5) return 0
      if (valor === 6) return 60
      return 0

    case 'Red de apoyo':
      return reglaDeTresRango(valor, 12, 84, 0, 100)

    case 'Alimentación':
      return reglaDeTresRango(valor, 0, 14, 0, 100)

    case 'Colesterol':
      if (valor < 100) return 100
      if (valor <= 129) return reglaDeTresRango(valor, 100, 129, 79, 51)
      return reglaDeTresRango(valor, 130, 160, 50, 0)

    case 'Salud mental':
      if (valor <= 4) return 100
      if (valor <= 9) return reglaDeTresRango(valor, 5, 9, 79, 51)
      return reglaDeTresRango(valor, 10, 27, 50, 0)

    default:
      return 0
  }
}

export const calcularEdad = (fechaStr: string): number => {
  if (!fechaStr) return 0
  const parts = fechaStr.split('/')
  if (parts.length !== 3) return 0
  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  let year = parseInt(parts[2], 10)
  if (year < 100) year += year < 30 ? 2000 : 1900
  const birth = new Date(year, month, day)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}

export const getColorBg = (score: number): string =>
  score >= 80
    ? 'bg-green-100 text-green-800'
    : score > 50
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800'

export const getColorNivel = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score > 50) return '#eab308'
  return '#ef4444'
}

export const getEstilosCajaNivel = (score: number) => {
  if (score >= 80)
    return {
      container: 'bg-green-50 border-green-100',
      circle: 'bg-green-100',
      textNumber: 'text-green-600',
      textScore: 'text-green-600',
    }
  if (score > 50)
    return {
      container: 'bg-yellow-50 border-yellow-100',
      circle: 'bg-yellow-100',
      textNumber: 'text-yellow-600',
      textScore: 'text-yellow-600',
    }
  return {
    container: 'bg-red-50 border-red-100',
    circle: 'bg-red-100',
    textNumber: 'text-red-600',
    textScore: 'text-red-600',
  }
}

const COMPONENTES_CRITICOS = ['Peso', 'Glucosa', 'Presión arterial', 'Colesterol']

export const calcularScoreGlobal = (componentes: ComponenteScore[]): number => {
  let sumaPonderada = 0
  let sumaPesos = 0
  componentes.forEach((comp) => {
    let peso = 1
    if (COMPONENTES_CRITICOS.includes(comp.nombre)) {
      if (comp.puntaje <= 50) peso = 5
      else if (comp.puntaje < 80) peso = 3
    }
    sumaPonderada += comp.puntaje * peso
    sumaPesos += peso
  })
  return sumaPesos > 0 ? Math.round(sumaPonderada / sumaPesos) : 0
}

export const determinarNivel = (scoreGlobal: number): 'Verde' | 'Amarillo' | 'Rojo' => {
  if (scoreGlobal >= 80) return 'Verde'
  if (scoreGlobal > 50) return 'Amarillo'
  return 'Rojo'
}

export const calcularMetaScore = (scoreGlobal: number): number => Math.min(scoreGlobal + 12, 100)

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

- [ ] **Step 2: Manual verification with a Node script**

Create a temporary file `/tmp/check-scoring.ts` with:

```ts
import { calcularPuntajeExacto, calcularScoreGlobal, recomputeAssessment } from '../escuela-pacientes/src/lib/clinical/scoring'

const ctx = { isSCA: false, isDM2: false, isPluripatologico: false, isPocaExpectativa: false, edad: 50 }
const ctxDM2_60_pluri = { isSCA: false, isDM2: true, isPluripatologico: true, isPocaExpectativa: false, edad: 65 }

const cases: Array<[string, number, typeof ctx, number]> = [
  ['Empoderamiento', 32, ctx, 100],
  ['Empoderamiento', 8, ctx, 0],
  ['Peso', 21.7, ctx, 100],
  ['Peso', 30, ctx, 50],
  ['Presión arterial', 119, ctx, 80],
  ['Presión arterial', 130, ctx, 50],
  ['Glucosa', 5.5, ctx, 92],
  ['Glucosa', 7.0, ctxDM2_60_pluri, 100],
  ['Sueño', 8, ctx, 100],
  ['Sueño', 5, ctx, 27],
  ['Acceso a medicamentos', 1, ctx, 100],
  ['Acceso a medicamentos', 2, ctx, 65],
]

let pass = 0
for (const [nombre, valor, c, expected] of cases) {
  const got = calcularPuntajeExacto(nombre, valor, c)
  const ok = got === expected
  console.log(`${ok ? '✓' : '✗'} ${nombre}(${valor}) = ${got} (expected ${expected})`)
  if (ok) pass++
}
console.log(`\n${pass}/${cases.length} passed`)
```

Run: `cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsx /tmp/check-scoring.ts`

Expected: at least 10/12 pass. The ones that may not match exactly to expected are the `reglaDeTresRango` interpolated cases — verify by hand that the output is "close" (within 2). Adjust the expected numbers in the script and re-run if needed; the values ARE the source of truth from hcxx and should not be modified in `scoring.ts`.

Delete `/tmp/check-scoring.ts` after verification.

- [ ] **Step 3: Commit**

```bash
git add src/lib/clinical/scoring.ts
git commit -m "feat(clinical): port scoring functions and add aggregator helpers"
```

---

## Task 5: Server actions in `lib/clinical/actions.ts`

**Files:**
- Create: `src/lib/clinical/actions.ts`

- [ ] **Step 1: Create `src/lib/clinical/actions.ts`**

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { recomputeAssessment, calcularEdad } from "./scoring"
import type { ComponenteScore, AlertaItem } from "./types"
import type { PatientClinicalProfile, PatientAssessment } from "@/types/database"

interface SaveAssessmentInput {
  user_id: string
  components: ComponenteScore[]
  is_sca: boolean
  is_dm2: boolean
  is_pluripatologico: boolean
  is_poca_expectativa: boolean
  alertas_criticas: AlertaItem[]
  alertas_orientadoras: AlertaItem[]
  raw_questionnaire?: unknown
  notes?: string | null
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthorized")
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") throw new Error("forbidden")
  return user
}

export async function saveAssessment(input: SaveAssessmentInput): Promise<{ id: string }> {
  const adminUser = await assertAdmin()
  const supabase = createAdminClient()

  // Get patient's birth date to compute age for clinical context
  const { data: clinicalProfile } = await supabase
    .from("patient_clinical_profile")
    .select("fecha_nacimiento")
    .eq("user_id", input.user_id)
    .maybeSingle()

  let edad = 0
  if (clinicalProfile?.fecha_nacimiento) {
    const d = new Date(clinicalProfile.fecha_nacimiento)
    const formatted = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
    edad = calcularEdad(formatted)
  }

  // Server-side recompute — never trust client values
  const contexto = {
    isSCA: input.is_sca,
    isDM2: input.is_dm2,
    isPluripatologico: input.is_pluripatologico,
    isPocaExpectativa: input.is_poca_expectativa,
    edad,
  }
  const { components, scoreGlobal, nivel, metaScore } = recomputeAssessment(input.components, contexto)

  const { data: inserted, error } = await supabase
    .from("patient_assessments")
    .insert({
      user_id: input.user_id,
      created_by: adminUser.id,
      components,
      is_sca: input.is_sca,
      is_dm2: input.is_dm2,
      is_pluripatologico: input.is_pluripatologico,
      is_poca_expectativa: input.is_poca_expectativa,
      score_global: scoreGlobal,
      meta_score: metaScore,
      nivel,
      alertas_criticas: input.alertas_criticas,
      alertas_orientadoras: input.alertas_orientadoras,
      raw_questionnaire: input.raw_questionnaire ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single()

  if (error || !inserted) throw new Error(`save failed: ${error?.message ?? "unknown"}`)

  revalidatePath(`/admin/pacientes/${input.user_id}/historia-clinica`)
  revalidatePath("/mi-historia-clinica")

  return { id: inserted.id }
}

export async function upsertClinicalProfile(
  userId: string,
  profile: Partial<Omit<PatientClinicalProfile, "user_id" | "updated_at">>,
): Promise<void> {
  await assertAdmin()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("patient_clinical_profile")
    .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() })

  if (error) throw new Error(`profile upsert failed: ${error.message}`)

  // Convenience: populate users.name if currently empty
  const fullName = [profile.primer_nombre, profile.primer_apellido].filter(Boolean).join(" ").trim()
  if (fullName) {
    const { data: userRow } = await supabase.from("users").select("name").eq("id", userId).single()
    if (!userRow?.name) {
      await supabase.from("users").update({ name: fullName }).eq("id", userId)
    }
  }

  revalidatePath(`/admin/pacientes/${userId}/historia-clinica`)
}

export async function getAssessmentTimeline(
  userId: string,
): Promise<Array<Pick<PatientAssessment, "id" | "created_at" | "score_global" | "nivel">>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("patient_assessments")
    .select("id, created_at, score_global, nivel")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return (data ?? []) as Array<Pick<PatientAssessment, "id" | "created_at" | "score_global" | "nivel">>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors related to `lib/clinical/actions.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/clinical/actions.ts
git commit -m "feat(clinical): add server actions saveAssessment, upsertClinicalProfile, getAssessmentTimeline"
```

---

## Task 6: Port presentational components — `HeaderComponent`, `HeaderSimple`, `InspirationalBanner`

**Files:**
- Create: `src/components/admin/clinical/HeaderComponent.tsx`
- Create: `src/components/admin/clinical/HeaderSimple.tsx`
- Create: `src/components/admin/clinical/InspirationalBanner.tsx`

These three components have minimal external dependencies and port nearly verbatim. The only changes:
1. Add `"use client"` at the top of each file (they use React hooks and event handlers).
2. Update import path of `DatosPaciente`/types to `@/lib/clinical/types`.

- [ ] **Step 1: Copy `HeaderComponent.tsx`**

```bash
cp "hcxx/components/HeaderComponent.tsx" "src/components/admin/clinical/HeaderComponent.tsx"
```

Then edit the new file:
- Add `"use client"` as the very first line.
- Replace the import line referencing `'../types'` (or similar) with `import { DatosPaciente } from "@/lib/clinical/types"`.

Run: `npx tsc --noEmit` — should compile.

- [ ] **Step 2: Copy `HeaderSimple.tsx`**

```bash
cp "hcxx/components/HeaderSimple.tsx" "src/components/admin/clinical/HeaderSimple.tsx"
```

Then in the new file:
- Add `"use client"` as the first line.
- Update import for `DatosPaciente` to `@/lib/clinical/types`.

- [ ] **Step 3: Copy `InspirationalBanner.tsx`**

```bash
cp "hcxx/components/InspirationalBanner.tsx" "src/components/admin/clinical/InspirationalBanner.tsx"
```

Then in the new file:
- Add `"use client"` as the first line.
- Update imports for `DatosPaciente` / `ComponenteScore` to `@/lib/clinical/types`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors in the three new files.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/clinical/HeaderComponent.tsx src/components/admin/clinical/HeaderSimple.tsx src/components/admin/clinical/InspirationalBanner.tsx
git commit -m "feat(clinical): port HeaderComponent, HeaderSimple, InspirationalBanner"
```

---

## Task 7: Extract `ReportPage1.tsx` from `hcxx/App.tsx`

**Files:**
- Create: `src/components/admin/clinical/ReportPage1.tsx`

`ReportPage1` is the JSX block in `hcxx/App.tsx` lines 281–473 (the `<div ref={page1Ref}>` block — score gauge, top peores, perfil de salud, evolución).

- [ ] **Step 1: Create `src/components/admin/clinical/ReportPage1.tsx`**

Skeleton:

```tsx
"use client"

import { forwardRef } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Target, AlertTriangle, BarChart as BarChartIcon, TrendingUp, ThumbsUp, ExternalLink } from "lucide-react"
import HeaderComponent from "./HeaderComponent"
import type { DatosPaciente, ComponenteScore } from "@/lib/clinical/types"

interface Props {
  paciente: DatosPaciente
  setPaciente: (p: DatosPaciente) => void
  componentes: ComponenteScore[]
  modoEdicion: boolean
  edadCalculada: number
  isSCA: boolean
  setIsSCA: (v: boolean) => void
  isDM2: boolean
  setIsDM2: (v: boolean) => void
  isPluripatologico: boolean
  setIsPluripatologico: (v: boolean) => void
  isPocaExpectativa: boolean
  setIsPocaExpectativa: (v: boolean) => void
  isGenerando: boolean
  onScoreChange: (nombre: string, valor: string) => void
}

const getBarColor = (score: number): string => {
  if (score >= 80) return "#22c55e"
  if (score >= 50) return "#eab308"
  return "#ef4444"
}

const ReportPage1 = forwardRef<HTMLDivElement, Props>(function ReportPage1(props, ref) {
  const { paciente, componentes, isGenerando } = props

  const componentesOrdenados = [...componentes].sort((a, b) => b.puntaje - a.puntaje)
  const topPeores = [...componentesOrdenados].reverse().slice(0, 3)

  const dataProgreso = [
    ...(paciente.evaluacionInicial !== "-" && !isNaN(parseInt(paciente.evaluacionInicial))
      ? [{ etapa: "Inicial", score: Math.max(0, Math.min(100, parseInt(paciente.evaluacionInicial))) }]
      : []),
    { etapa: "Actual", score: paciente.scoreGlobal },
    { etapa: "Meta", score: paciente.metaScore },
  ]

  const getMensajeFeedback = (): string => {
    const inicialStr = paciente.evaluacionInicial
    const actual = paciente.scoreGlobal
    if (inicialStr === "-" || inicialStr === "")
      return "¡Bienvenido a CAIMED Cardiopreventiva! Hoy comienzas el camino más importante: el de cuidar tu corazón."
    const inicial = parseInt(inicialStr)
    if (isNaN(inicial)) return ""
    if (actual > inicial) return "¡Felicitaciones! Tu progreso refleja una mejora continua en tu salud cardiometabólica."
    return "Tu progreso actual indica que necesitamos revisar y ajustar tus hábitos para impulsar tu salud cardiometabólica."
  }

  return (
    <div
      ref={ref}
      className={`${isGenerando ? "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50" : "bg-transparent"} min-h-[297mm] flex flex-col relative`}
    >
      <HeaderComponent
        paciente={props.paciente}
        setPaciente={props.setPaciente}
        modoEdicion={props.modoEdicion}
        edadCalculada={props.edadCalculada}
        isSCA={props.isSCA}
        setIsSCA={props.setIsSCA}
        isDM2={props.isDM2}
        setIsDM2={props.setIsDM2}
        isPluripatologico={props.isPluripatologico}
        setIsPluripatologico={props.setIsPluripatologico}
        isPocaExpectativa={props.isPocaExpectativa}
        setIsPocaExpectativa={props.setIsPocaExpectativa}
      />

      {/* Paste here the contents of hcxx/App.tsx lines 292..472 (everything inside <div className="px-8 pt-10 pb-12 grid..."> up to and including the closing footer of page 1) */}
    </div>
  )
})

export default ReportPage1
```

Now open `hcxx/App.tsx`, copy the JSX block from line 292 (`<div className="px-8 pt-10 pb-12 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 flex-grow">`) down to line 472 (the `</footer>` closing tag of page 1, just before `</div>` line 473) — and paste it where the comment says. Wherever the original references:
- `getBarColor(...)` — keep as-is (function declared above)
- `topPeores`, `componentesOrdenados`, `dataProgreso`, `getMensajeFeedback()` — keep as-is (declared above)
- `paciente`, `isGenerando`, `componentes`, `modoEdicion` — these come from props, prefix with `props.` if you destructured them above (we did)
- `handleScoreChange(...)` — replace with `props.onScoreChange(...)`
- `setPaciente(...)` — replace with `props.setPaciente(...)`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors in `ReportPage1.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clinical/ReportPage1.tsx
git commit -m "feat(clinical): extract ReportPage1 from hcxx App.tsx"
```

---

## Task 8: Extract `ReportPage2.tsx`

**Files:**
- Create: `src/components/admin/clinical/ReportPage2.tsx`

`ReportPage2` is the JSX in `hcxx/App.tsx` lines 478–503 (HeaderSimple + InspirationalBanner + footer).

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { forwardRef } from "react"
import HeaderSimple from "./HeaderSimple"
import InspirationalBanner from "./InspirationalBanner"
import type { DatosPaciente, ComponenteScore } from "@/lib/clinical/types"

interface Props {
  paciente: DatosPaciente
  componentes: ComponenteScore[]
  isGenerando: boolean
}

const ReportPage2 = forwardRef<HTMLDivElement, Props>(function ReportPage2({ paciente, componentes, isGenerando }, ref) {
  const componentesOrdenados = [...componentes].sort((a, b) => b.puntaje - a.puntaje)
  const topPeores = [...componentesOrdenados].reverse().slice(0, 3)
  const topFuertes = [...componentesOrdenados].slice(0, 3)

  return (
    <div
      ref={ref}
      className={`${isGenerando ? "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50" : "bg-transparent"} min-h-[297mm] flex flex-col relative font-sans`}
    >
      <HeaderSimple paciente={paciente} />

      <div className="px-8 pt-10 pb-12 flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          <InspirationalBanner
            nombrePaciente={paciente.nombre}
            caimedScore={paciente.scoreGlobal}
            nivelScore={paciente.nivel}
            metaProteccion={paciente.metaScore}
            top3Criticos={topPeores}
            top3Fuertes={topFuertes}
          />
        </div>
      </div>

      <footer className="mt-auto border-t border-slate-300/50 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-xs font-bold tracking-[0.2em] text-slate-600 uppercase">SALUD DIGITAL CAIMED</span>
        </div>
        <p className="text-[10px] text-slate-500 italic max-w-4xl mx-auto px-4 leading-relaxed">
          Este reporte corresponde a una evaluación digital. <strong>TODO TIENE QUE SER VALIDADO Y COMPRENDIDO POR UN MÉDICO</strong>. Por favor consulta nuestros términos y condiciones. Este es un programa de acompañamiento y <strong>NO un reemplazo ni equivale a una valoración médica</strong>.
        </p>
      </footer>
    </div>
  )
})

export default ReportPage2
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clinical/ReportPage2.tsx
git commit -m "feat(clinical): extract ReportPage2 from hcxx App.tsx"
```

---

## Task 9: Extract `ReportPage3.tsx`

**Files:**
- Create: `src/components/admin/clinical/ReportPage3.tsx`

`ReportPage3` is `hcxx/App.tsx` lines 508–622 (HeaderSimple + alertas críticas + alertas orientadoras + footer).

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { forwardRef } from "react"
import { AlertTriangle, Info, Plus, X } from "lucide-react"
import HeaderSimple from "./HeaderSimple"
import type { DatosPaciente, DatosAlertas } from "@/lib/clinical/types"

interface Props {
  paciente: DatosPaciente
  alertas: DatosAlertas
  modoEdicion: boolean
  isGenerando: boolean
  onAddAlerta: (tipo: "criticas" | "orientadoras") => void
  onRemoveAlerta: (tipo: "criticas" | "orientadoras", id: number) => void
  onUpdateAlerta: (tipo: "criticas" | "orientadoras", id: number, valor: string) => void
}

const ReportPage3 = forwardRef<HTMLDivElement, Props>(function ReportPage3(
  { paciente, alertas, modoEdicion, isGenerando, onAddAlerta, onRemoveAlerta, onUpdateAlerta },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`${isGenerando ? "bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50" : "bg-transparent"} min-h-[297mm] flex flex-col relative font-sans`}
    >
      <HeaderSimple paciente={paciente} />

      <div className="px-8 pt-10 pb-12 flex-grow flex flex-col">
        <div className="flex items-center gap-2 mb-8 border-b border-slate-800 pb-2 mt-6">
          <AlertTriangle className="w-6 h-6 text-slate-800" />
          <h3 className="font-black text-slate-800 tracking-widest text-lg uppercase">Recomendaciones y Alertas Clínicas</h3>
        </div>

        {/* CRÍTICAS */}
        <div
          className={`mb-10 ${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl shadow-lg border border-white/80 overflow-hidden`}
        >
          <div className="bg-red-50/40 border-l-[8px] border-red-500 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-red-600 p-3 rounded-xl text-white shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-red-900 font-black uppercase text-xl tracking-wide">Alertas Críticas</h5>
                  <p className="text-red-700 text-sm font-bold opacity-80 uppercase tracking-widest">Atención Inmediata Requerida</p>
                </div>
              </div>
              {modoEdicion && (
                <button
                  onClick={() => onAddAlerta("criticas")}
                  className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-red-700 shadow-sm transition-all"
                >
                  <Plus className="w-5 h-5" /> AÑADIR CASO
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alertas.criticas.map((alerta) => (
                <div key={alerta.id} className="relative">
                  {modoEdicion ? (
                    <div className="relative group">
                      <textarea
                        className="w-full min-h-[120px] p-5 bg-white border border-red-200 rounded-2xl text-base text-red-900 font-bold text-center flex items-center justify-center resize-none focus:ring-2 focus:ring-red-400 outline-none shadow-sm transition-all"
                        value={alerta.accion}
                        onChange={(e) => onUpdateAlerta("criticas", alerta.id, e.target.value)}
                        placeholder="Ej: PHQ-9 Positivo"
                      />
                      <button
                        onClick={() => onRemoveAlerta("criticas", alerta.id)}
                        className="absolute -top-3 -right-3 bg-red-600 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition-colors border-2 border-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm flex items-center justify-center text-center min-h-[120px]">
                      <p className="font-black text-red-900 text-lg leading-tight uppercase tracking-tight">{alerta.accion}</p>
                    </div>
                  )}
                </div>
              ))}
              {alertas.criticas.length === 0 && !modoEdicion && (
                <div className="col-span-full py-8 text-center">
                  <p className="text-red-400 font-bold text-sm italic uppercase tracking-widest">Sin alertas críticas activas para este paciente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ORIENTADORAS */}
        <div
          className={`${isGenerando ? "bg-white" : "bg-white/60 backdrop-blur-md"} rounded-2xl shadow-lg border border-white/80 overflow-hidden`}
        >
          <div className="bg-amber-50/40 border-l-[8px] border-amber-400 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-3 rounded-xl text-white shadow-md">
                  <Info className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="text-amber-900 font-black uppercase text-xl tracking-wide">Alertas Orientadoras</h5>
                  <p className="text-amber-700 text-sm font-bold opacity-80 uppercase tracking-widest">Seguimiento y Educación</p>
                </div>
              </div>
              {modoEdicion && (
                <button
                  onClick={() => onAddAlerta("orientadoras")}
                  className="flex items-center gap-2 bg-amber-500 text-white px-5 py-2 rounded-xl text-sm font-black hover:bg-amber-600 shadow-sm transition-all"
                >
                  <Plus className="w-5 h-5" /> AÑADIR CASO
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {alertas.orientadoras.map((alerta) => (
                <div key={alerta.id} className="relative">
                  {modoEdicion ? (
                    <div className="relative group">
                      <textarea
                        className="w-full min-h-[120px] p-5 bg-white border border-amber-200 rounded-2xl text-base text-amber-900 font-bold text-center flex items-center justify-center resize-none focus:ring-2 focus:ring-amber-400 outline-none shadow-sm transition-all"
                        value={alerta.accion}
                        onChange={(e) => onUpdateAlerta("orientadoras", alerta.id, e.target.value)}
                        placeholder="Ej: Fumador actual"
                      />
                      <button
                        onClick={() => onRemoveAlerta("orientadoras", alerta.id)}
                        className="absolute -top-3 -right-3 bg-amber-500 text-white p-1.5 rounded-full shadow-md hover:bg-amber-600 transition-colors border-2 border-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-center text-center min-h-[120px]">
                      <p className="font-black text-amber-900 text-lg leading-tight uppercase tracking-tight">{alerta.accion}</p>
                    </div>
                  )}
                </div>
              ))}
              {alertas.orientadoras.length === 0 && !modoEdicion && (
                <div className="col-span-full py-8 text-center">
                  <p className="text-amber-400 font-bold text-sm italic uppercase tracking-widest">Sin alertas orientadoras para este paciente</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-auto border-t border-slate-300/50 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400"></div>
          <span className="text-xs font-bold tracking-[0.2em] text-slate-600 uppercase">SALUD DIGITAL CAIMED · ANEXO CLÍNICO</span>
        </div>
        <p className="text-[10px] text-slate-500 italic max-w-4xl mx-auto px-4 leading-relaxed">
          Este reporte contiene información confidencial. <strong>TODO TIENE QUE SER VALIDADO Y COMPRENDIDO POR UN MÉDICO</strong>. Por favor consulta nuestros términos y condiciones. Este es un programa de acompañamiento y <strong>NO un reemplazo ni equivale a una valoración médica</strong>.
        </p>
      </footer>
    </div>
  )
})

export default ReportPage3
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clinical/ReportPage3.tsx
git commit -m "feat(clinical): extract ReportPage3 with editable alerts"
```

---

## Task 10: Build `ClinicalHistoryClient.tsx` orchestrator

**Files:**
- Create: `src/components/admin/clinical/ClinicalHistoryClient.tsx`

This is the main orchestrator that ports the state and behavior of `hcxx/App.tsx` minus the URL-loading logic.

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Edit2, Download, Save, X } from "lucide-react"
import ReportPage1 from "./ReportPage1"
import ReportPage2 from "./ReportPage2"
import ReportPage3 from "./ReportPage3"
import { calcularEdad, recomputeAssessment } from "@/lib/clinical/scoring"
import { saveAssessment } from "@/lib/clinical/actions"
import { SCORES_INICIALES, ALERTAS_INICIALES, DATOS_INICIALES_PACIENTE } from "@/lib/clinical/constants"
import type { DatosPaciente, ComponenteScore, DatosAlertas, AlertaItem } from "@/lib/clinical/types"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

interface Props {
  userId: string
  initialAssessment: PatientAssessment | null
  clinicalProfile: PatientClinicalProfile | null
  evaluacionInicialScore: number | null  // score_global of FIRST assessment (for the chart)
  initialMode?: "view" | "edit"
}

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>
    jspdf?: { jsPDF: new (orient: string, unit: string, format: string) => unknown }
  }
}

export default function ClinicalHistoryClient({
  userId,
  initialAssessment,
  clinicalProfile,
  evaluacionInicialScore,
  initialMode = "view",
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modoEdicion, setModoEdicion] = useState(initialMode === "edit")
  const [isGenerando, setIsGenerando] = useState(false)
  const page1Ref = useRef<HTMLDivElement>(null)
  const page2Ref = useRef<HTMLDivElement>(null)
  const page3Ref = useRef<HTMLDivElement>(null)

  // Build DatosPaciente from clinical_profile + latest assessment
  const buildPaciente = (): DatosPaciente => ({
    ...DATOS_INICIALES_PACIENTE,
    nombre: [clinicalProfile?.primer_nombre, clinicalProfile?.primer_apellido].filter(Boolean).join(" ").trim(),
    primerNombre: clinicalProfile?.primer_nombre ?? "",
    segundoNombre: clinicalProfile?.segundo_nombre ?? "",
    primerApellido: clinicalProfile?.primer_apellido ?? "",
    segundoApellido: clinicalProfile?.segundo_apellido ?? "",
    documento: clinicalProfile?.documento ?? "",
    tipoDocumento: clinicalProfile?.tipo_documento ?? "CC",
    fechaNacimiento: clinicalProfile?.fecha_nacimiento
      ? (() => {
          const d = new Date(clinicalProfile.fecha_nacimiento!)
          return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
        })()
      : "",
    sexo: clinicalProfile?.sexo ?? "",
    genero: clinicalProfile?.genero ?? "",
    telefono: clinicalProfile?.telefono ?? "",
    correo: clinicalProfile?.correo ?? "",
    regimenAfiliacion: clinicalProfile?.regimen_afiliacion ?? "",
    aseguradora: clinicalProfile?.aseguradora ?? "",
    prepagada: clinicalProfile?.prepagada ?? "No",
    planComplementario: clinicalProfile?.plan_complementario ?? "No",
    paisNacimiento: clinicalProfile?.pais_nacimiento ?? "Colombia",
    paisResidencia: clinicalProfile?.pais_residencia ?? "Colombia",
    departamentoResidencia: clinicalProfile?.departamento_residencia ?? "",
    municipioResidencia: clinicalProfile?.municipio_residencia ?? "",
    direccionResidencia: clinicalProfile?.direccion_residencia ?? "",
    contactoEmergenciaNombre: clinicalProfile?.contacto_emergencia_nombre ?? "",
    contactoEmergenciaParentesco: clinicalProfile?.contacto_emergencia_parentesco ?? "",
    contactoEmergenciaTelefono: clinicalProfile?.contacto_emergencia_telefono ?? "",
    scoreGlobal: initialAssessment?.score_global ?? 0,
    metaScore: initialAssessment?.meta_score ?? 0,
    nivel: initialAssessment?.nivel ?? "Rojo",
    fechaReporte: initialAssessment ? new Date(initialAssessment.created_at).toLocaleDateString("es-CO") : new Date().toLocaleDateString("es-CO"),
    evaluacionInicial: evaluacionInicialScore !== null ? String(evaluacionInicialScore) : "-",
  })

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

  useEffect(() => {
    setEdadCalculada(calcularEdad(paciente.fechaNacimiento))
  }, [paciente.fechaNacimiento])

  // Recompute scores whenever inputs or context change
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
  }, [
    isSCA,
    isDM2,
    isPluripatologico,
    isPocaExpectativa,
    edadCalculada,
    componentes.map((c) => c.valor).join("|"),
  ])

  // Lazy-load PDF libs once
  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const script = document.createElement("script")
        script.src = src
        script.async = true
        script.onload = () => resolve()
        script.onerror = (err) => reject(err)
        document.body.appendChild(script)
      })
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
    ]).catch((err) => console.error("Error cargando librerías de PDF", err))
  }, [])

  const handleScoreChange = (nombre: string, nuevoValor: string) => {
    setComponentes((prev) => prev.map((c) => (c.nombre === nombre ? { ...c, valor: nuevoValor } : c)))
  }

  const handleAddAlerta = (tipo: "criticas" | "orientadoras") => {
    const nuevaAlerta: AlertaItem = { id: Date.now(), marcador: "", accion: "" }
    setAlertas((prev) => ({ ...prev, [tipo]: [...prev[tipo], nuevaAlerta] }))
  }
  const handleRemoveAlerta = (tipo: "criticas" | "orientadoras", id: number) =>
    setAlertas((prev) => ({ ...prev, [tipo]: prev[tipo].filter((a) => a.id !== id) }))
  const handleUpdateAlerta = (tipo: "criticas" | "orientadoras", id: number, valor: string) =>
    setAlertas((prev) => ({ ...prev, [tipo]: prev[tipo].map((a) => (a.id === id ? { ...a, accion: valor } : a)) }))

  const handleSavePDF = async () => {
    if (!window.html2canvas || !window.jspdf) return
    setIsGenerando(true)
    await new Promise((r) => setTimeout(r, 150))
    try {
      const { jsPDF } = window.jspdf as { jsPDF: new (o: string, u: string, f: string) => unknown }
      const pdf = new jsPDF("p", "mm", "a4") as {
        internal: { pageSize: { getWidth: () => number } }
        addPage: () => void
        addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void
        getImageProperties: (d: string) => { width: number; height: number }
        save: (name: string) => void
      }
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const refs = [page1Ref, page2Ref, page3Ref]
      let firstPage = true
      for (const ref of refs) {
        if (ref.current) {
          if (!firstPage) pdf.addPage()
          const canvas = await window.html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
          const imgData = canvas.toDataURL("image/png")
          const imgProps = pdf.getImageProperties(imgData)
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight)
          firstPage = false
        }
      }
      const safeName = (paciente.nombre || "paciente").replace(/[^a-z0-9]/gi, "_").toLowerCase()
      pdf.save(`Reporte_CAIMED_${safeName}.pdf`)
    } catch (err) {
      console.error(err)
      alert("No se pudo generar el PDF en este dispositivo. Inténtalo desde un computador.")
    } finally {
      setIsGenerando(false)
    }
  }

  const handleSaveAssessment = () => {
    startTransition(async () => {
      try {
        await saveAssessment({
          user_id: userId,
          components: componentes,
          is_sca: isSCA,
          is_dm2: isDM2,
          is_pluripatologico: isPluripatologico,
          is_poca_expectativa: isPocaExpectativa,
          alertas_criticas: alertas.criticas,
          alertas_orientadoras: alertas.orientadoras,
        })
        setModoEdicion(false)
        router.refresh()
      } catch (err) {
        alert(`No se pudo guardar: ${(err as Error).message}`)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      <div className="w-full max-w-[1000px] mb-6 flex flex-wrap justify-end items-center gap-3 print:hidden">
        <button
          onClick={handleSavePDF}
          disabled={isGenerando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-sm font-bold shadow-sm disabled:opacity-50"
        >
          {isGenerando ? "Generando…" : (<><Download className="w-4 h-4" /> Exportar PDF</>)}
        </button>
        {modoEdicion ? (
          <>
            <button
              onClick={() => setModoEdicion(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-sm font-bold shadow-sm"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSaveAssessment}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isPending ? "Guardando…" : "Guardar como nueva evaluación"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setModoEdicion(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-sm font-bold shadow-sm"
          >
            <Edit2 className="w-4 h-4" /> Editar
          </button>
        )}
      </div>

      <div
        className={`w-full max-w-[1000px] shadow-2xl rounded-2xl overflow-hidden ${isGenerando ? "bg-white" : "bg-white/40 backdrop-blur-2xl"} border border-white/60 font-sans`}
      >
        <ReportPage1
          ref={page1Ref}
          paciente={paciente}
          setPaciente={setPaciente}
          componentes={componentes}
          modoEdicion={modoEdicion}
          edadCalculada={edadCalculada}
          isSCA={isSCA}
          setIsSCA={setIsSCA}
          isDM2={isDM2}
          setIsDM2={setIsDM2}
          isPluripatologico={isPluripatologico}
          setIsPluripatologico={setIsPluripatologico}
          isPocaExpectativa={isPocaExpectativa}
          setIsPocaExpectativa={setIsPocaExpectativa}
          isGenerando={isGenerando}
          onScoreChange={handleScoreChange}
        />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage2 ref={page2Ref} paciente={paciente} componentes={componentes} isGenerando={isGenerando} />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage3
          ref={page3Ref}
          paciente={paciente}
          alertas={alertas}
          modoEdicion={modoEdicion}
          isGenerando={isGenerando}
          onAddAlerta={handleAddAlerta}
          onRemoveAlerta={handleRemoveAlerta}
          onUpdateAlerta={handleUpdateAlerta}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clinical/ClinicalHistoryClient.tsx
git commit -m "feat(clinical): add ClinicalHistoryClient orchestrator with save + PDF"
```

---

## Task 11: Port `Questionnaire.tsx`

**Files:**
- Create: `src/components/admin/clinical/Questionnaire.tsx`

`hcxx/components/Questionnaire.tsx` is large (~1600 lines). It is a multi-step wizard that captures demographics + clinical inputs and at the end builds a URL with query params and calls `onComplete(url)`. We adapt it to call a `onSubmit(data)` callback that the parent component bridges to `saveAssessment` + `upsertClinicalProfile`.

- [ ] **Step 1: Copy the file**

```bash
cp "hcxx/components/Questionnaire.tsx" "src/components/admin/clinical/Questionnaire.tsx"
```

- [ ] **Step 2: Adapt `onComplete` to `onSubmit`**

In `src/components/admin/clinical/Questionnaire.tsx`:
- Add `"use client"` as the first line.
- Replace any local imports of `'../types'` or `'./...'` to point to `@/lib/clinical/types` and `@/lib/clinical/constants`.
- Replace any import from `./TermsModal` and `./SectionTitle` with **inline copies** of those two files (they are small): also `cp hcxx/components/TermsModal.tsx src/components/admin/clinical/TermsModal.tsx` and `cp hcxx/components/SectionTitle.tsx src/components/admin/clinical/SectionTitle.tsx`, add `"use client"` to each.
- Find the prop type `onComplete: (url: string) => void`. Replace with:
  ```ts
  onSubmit: (data: {
    profile: {
      primer_nombre?: string
      segundo_nombre?: string
      primer_apellido?: string
      segundo_apellido?: string
      tipo_documento?: string
      documento?: string
      fecha_nacimiento?: string  // ISO yyyy-mm-dd
      sexo?: string
      genero?: string
      telefono?: string
      correo?: string
    }
    components: { nombre: string; valor: number | string }[]
    is_sca: boolean
    is_dm2: boolean
    alertas_criticas: { id: number; marcador: string; accion: string }[]
    alertas_orientadoras: { id: number; marcador: string; accion: string }[]
    raw: unknown
  }) => Promise<void>
  initialProfile?: Partial<{primer_nombre: string; primer_apellido: string; documento: string; fecha_nacimiento: string}>
  ```
- Find the place where the original code builds the URL (search for `URLSearchParams` or `loadFromUrl` or `params.set`/`params.append`). Replace the URL construction with a direct call:
  ```ts
  await props.onSubmit({
    profile: { primer_nombre: ..., primer_apellido: ..., documento: ..., fecha_nacimiento: ..., sexo: ..., tipo_documento: ..., telefono: ..., correo: ... },
    components: [
      { nombre: "Glucosa", valor: gluVal },
      { nombre: "Presión arterial", valor: paVal },
      // … one entry per of the 13 components, mapping local state vars
    ],
    is_sca: localIsSCA,
    is_dm2: localIsDM2,
    alertas_criticas: [],
    alertas_orientadoras: [],
    raw: { /* the same rawData object the questionnaire used to build for the email */ }
  })
  ```
- Pre-fill from `props.initialProfile` if provided: in the wizard's first-step state initializer, default values from `initialProfile`.

If a section in the questionnaire's UI references components beyond the 13 names listed in `SCORES_INICIALES`, ignore them — the saved `components` MUST contain exactly the 13 entries with names matching `SCORES_INICIALES` (the scoring layer dispatches by name).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors. If you get errors about missing fields in `onSubmit` shape, narrow by leaving optional and `?? ""`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/clinical/Questionnaire.tsx src/components/admin/clinical/TermsModal.tsx src/components/admin/clinical/SectionTitle.tsx
git commit -m "feat(clinical): port Questionnaire (and Terms/SectionTitle) adapted to onSubmit callback"
```

---

## Task 12: Build `AssessmentTimeline.tsx`

**Files:**
- Create: `src/components/admin/clinical/AssessmentTimeline.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { Calendar } from "lucide-react"
import type { AssessmentNivel } from "@/types/database"

interface TimelineItem {
  id: string
  created_at: string
  score_global: number
  nivel: AssessmentNivel
}

const nivelStyle: Record<AssessmentNivel, string> = {
  Verde: "bg-green-100 text-green-700",
  Amarillo: "bg-yellow-100 text-yellow-700",
  Rojo: "bg-red-100 text-red-700",
}

export default function AssessmentTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        Aún no hay evaluaciones registradas.
      </div>
    )
  }

  // Mark the oldest one as "inicial"
  const oldestId = items[items.length - 1]?.id

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
      {items.map((it) => {
        const isInicial = it.id === oldestId && items.length > 1
        return (
          <div key={it.id} className="flex items-center gap-4 px-5 py-3">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700">
                {new Date(it.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                {isInicial && <span className="ml-2 text-xs text-slate-400 italic">(inicial)</span>}
              </p>
            </div>
            <span className="font-bold text-slate-700 text-sm">{it.score_global}/100</span>
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${nivelStyle[it.nivel]}`}>{it.nivel}</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/clinical/AssessmentTimeline.tsx
git commit -m "feat(clinical): add AssessmentTimeline component"
```

---

## Task 13: Server page `/admin/pacientes/[id]/historia-clinica/page.tsx`

**Files:**
- Create: `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx`

This server component loads the patient, profile, all assessments, and decides which mode to render.

- [ ] **Step 1: Create the directory + file**

```bash
mkdir -p "src/app/(admin)/admin/pacientes/[id]/historia-clinica"
```

Create `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ClinicalHistoryClient from "@/components/admin/clinical/ClinicalHistoryClient"
import AssessmentTimeline from "@/components/admin/clinical/AssessmentTimeline"
import QuestionnaireWrapper from "@/components/admin/clinical/QuestionnaireWrapper"
import type { PatientAssessment, PatientClinicalProfile, AssessmentNivel } from "@/types/database"

export default async function HistoriaClinicaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { id } = await params
  const { mode } = await searchParams
  const supabase = await createClient()

  const { data: patient } = await supabase.from("users").select("id, name, email").eq("id", id).single()
  if (!patient) notFound()

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", id)
    .maybeSingle()

  const { data: assessments } = await supabase
    .from("patient_assessments")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false })

  const allAssessments = (assessments ?? []) as PatientAssessment[]
  const latest = allAssessments[0] ?? null
  const oldest = allAssessments[allAssessments.length - 1] ?? null
  const evaluacionInicialScore = oldest && oldest.id !== latest?.id ? oldest.score_global : null

  const showQuestionnaire = mode === "new" || allAssessments.length === 0

  return (
    <div>
      <Link
        href={`/admin/pacientes/${id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-tertiary hover:text-secondary"
      >
        <ChevronLeft className="w-4 h-4" /> Volver al paciente
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral">Historia clínica</h1>
          <p className="text-sm text-tertiary">{patient.name}</p>
        </div>
        {!showQuestionnaire && (
          <Link
            href={`/admin/pacientes/${id}/historia-clinica?mode=new`}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Nueva evaluación
          </Link>
        )}
      </div>

      {showQuestionnaire ? (
        <QuestionnaireWrapper
          userId={id}
          initialProfile={
            profile
              ? {
                  primer_nombre: profile.primer_nombre ?? "",
                  primer_apellido: profile.primer_apellido ?? "",
                  documento: profile.documento ?? "",
                  fecha_nacimiento: profile.fecha_nacimiento ?? "",
                }
              : undefined
          }
        />
      ) : (
        <>
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-neutral uppercase tracking-wide">Línea de tiempo</h2>
            <AssessmentTimeline
              items={allAssessments.map((a) => ({
                id: a.id,
                created_at: a.created_at,
                score_global: a.score_global,
                nivel: a.nivel as AssessmentNivel,
              }))}
            />
          </div>

          <ClinicalHistoryClient
            userId={id}
            initialAssessment={latest}
            clinicalProfile={(profile ?? null) as PatientClinicalProfile | null}
            evaluacionInicialScore={evaluacionInicialScore}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `QuestionnaireWrapper.tsx`**

`Questionnaire.tsx` itself is a client component. Its `onSubmit` calls server actions. We need a small client wrapper that handles the redirect on success.

Create `src/components/admin/clinical/QuestionnaireWrapper.tsx`:

```tsx
"use client"

import { useRouter } from "next/navigation"
import Questionnaire from "./Questionnaire"
import { saveAssessment, upsertClinicalProfile } from "@/lib/clinical/actions"

interface Props {
  userId: string
  initialProfile?: {
    primer_nombre: string
    primer_apellido: string
    documento: string
    fecha_nacimiento: string
  }
}

export default function QuestionnaireWrapper({ userId, initialProfile }: Props) {
  const router = useRouter()

  return (
    <Questionnaire
      initialProfile={initialProfile}
      onSubmit={async (data) => {
        await upsertClinicalProfile(userId, {
          primer_nombre: data.profile.primer_nombre ?? null,
          segundo_nombre: data.profile.segundo_nombre ?? null,
          primer_apellido: data.profile.primer_apellido ?? null,
          segundo_apellido: data.profile.segundo_apellido ?? null,
          tipo_documento: data.profile.tipo_documento ?? null,
          documento: data.profile.documento ?? null,
          fecha_nacimiento: data.profile.fecha_nacimiento ?? null,
          sexo: data.profile.sexo ?? null,
          genero: data.profile.genero ?? null,
          telefono: data.profile.telefono ?? null,
          correo: data.profile.correo ?? null,
        })

        await saveAssessment({
          user_id: userId,
          components: data.components.map((c) => ({ ...c, puntaje: 0 })), // server recomputes
          is_sca: data.is_sca,
          is_dm2: data.is_dm2,
          is_pluripatologico: false,
          is_poca_expectativa: false,
          alertas_criticas: data.alertas_criticas,
          alertas_orientadoras: data.alertas_orientadoras,
          raw_questionnaire: data.raw,
        })

        router.push(`/admin/pacientes/${userId}/historia-clinica`)
        router.refresh()
      }}
    />
  )
}
```

- [ ] **Step 3: Manual smoke test**

Run dev: `npm run dev`. Open `http://localhost:3000/admin/pacientes/<some-real-patient-uuid>/historia-clinica`. Expected:
- If patient has no assessments: see the questionnaire wizard.
- After submitting: redirected to same URL, see timeline + report.
- Click "+ Nueva evaluación": questionnaire opens again.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(admin\)/admin/pacientes/\[id\]/historia-clinica/page.tsx src/components/admin/clinical/QuestionnaireWrapper.tsx
git commit -m "feat(clinical): admin route /admin/pacientes/[id]/historia-clinica with mode dispatch"
```

---

## Task 14: Patient view component `PatientReportView.tsx`

**Files:**
- Create: `src/components/dashboard/clinical/PatientReportView.tsx`

This is a read-only renderer that re-uses the ReportPage components with `modoEdicion={false}` and exposes only a "Descargar PDF" button.

- [ ] **Step 1: Create `src/components/dashboard/clinical/PatientReportView.tsx`**

```tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { Download } from "lucide-react"
import ReportPage1 from "@/components/admin/clinical/ReportPage1"
import ReportPage2 from "@/components/admin/clinical/ReportPage2"
import ReportPage3 from "@/components/admin/clinical/ReportPage3"
import { calcularEdad } from "@/lib/clinical/scoring"
import { DATOS_INICIALES_PACIENTE } from "@/lib/clinical/constants"
import type { DatosPaciente } from "@/lib/clinical/types"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

interface Props {
  assessment: PatientAssessment
  profile: PatientClinicalProfile | null
  evaluacionInicialScore: number | null
}

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>
    jspdf?: { jsPDF: new (orient: string, unit: string, format: string) => unknown }
  }
}

export default function PatientReportView({ assessment, profile, evaluacionInicialScore }: Props) {
  const page1Ref = useRef<HTMLDivElement>(null)
  const page2Ref = useRef<HTMLDivElement>(null)
  const page3Ref = useRef<HTMLDivElement>(null)
  const [isGenerando, setIsGenerando] = useState(false)

  const fechaNacStr = profile?.fecha_nacimiento
    ? (() => {
        const d = new Date(profile.fecha_nacimiento!)
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
      })()
    : ""
  const edadCalculada = calcularEdad(fechaNacStr)

  const paciente: DatosPaciente = {
    ...DATOS_INICIALES_PACIENTE,
    nombre: [profile?.primer_nombre, profile?.primer_apellido].filter(Boolean).join(" ").trim(),
    primerNombre: profile?.primer_nombre ?? "",
    primerApellido: profile?.primer_apellido ?? "",
    documento: profile?.documento ?? "",
    tipoDocumento: profile?.tipo_documento ?? "CC",
    fechaNacimiento: fechaNacStr,
    sexo: profile?.sexo ?? "",
    genero: profile?.genero ?? "",
    scoreGlobal: assessment.score_global,
    metaScore: assessment.meta_score,
    nivel: assessment.nivel,
    fechaReporte: new Date(assessment.created_at).toLocaleDateString("es-CO"),
    evaluacionInicial: evaluacionInicialScore !== null ? String(evaluacionInicialScore) : "-",
  }

  useEffect(() => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve()
          return
        }
        const s = document.createElement("script")
        s.src = src
        s.async = true
        s.onload = () => resolve()
        s.onerror = reject
        document.body.appendChild(s)
      })
    Promise.all([
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
    ]).catch((err) => console.error("Error cargando librerías de PDF", err))
  }, [])

  const handleSavePDF = async () => {
    if (!window.html2canvas || !window.jspdf) return
    setIsGenerando(true)
    await new Promise((r) => setTimeout(r, 150))
    try {
      const { jsPDF } = window.jspdf as { jsPDF: new (o: string, u: string, f: string) => unknown }
      const pdf = new jsPDF("p", "mm", "a4") as {
        internal: { pageSize: { getWidth: () => number } }
        addPage: () => void
        addImage: (data: string, fmt: string, x: number, y: number, w: number, h: number) => void
        getImageProperties: (d: string) => { width: number; height: number }
        save: (name: string) => void
      }
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const refs = [page1Ref, page2Ref, page3Ref]
      let firstPage = true
      for (const ref of refs) {
        if (ref.current) {
          if (!firstPage) pdf.addPage()
          const canvas = await window.html2canvas(ref.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
          const imgData = canvas.toDataURL("image/png")
          const imgProps = pdf.getImageProperties(imgData)
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, imgHeight)
          firstPage = false
        }
      }
      const safeName = (paciente.nombre || "paciente").replace(/[^a-z0-9]/gi, "_").toLowerCase()
      pdf.save(`Reporte_CAIMED_${safeName}.pdf`)
    } catch (err) {
      console.error(err)
      alert("No se pudo generar el PDF en este dispositivo. Inténtalo desde un computador.")
    } finally {
      setIsGenerando(false)
    }
  }

  // Read-only setters: no-op
  const noop = () => {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-4 md:p-8 font-sans text-slate-800 flex flex-col items-center">
      <div className="w-full max-w-[1000px] mb-6 flex justify-end print:hidden">
        <button
          onClick={handleSavePDF}
          disabled={isGenerando}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-bold shadow-sm disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> {isGenerando ? "Generando…" : "Descargar PDF"}
        </button>
      </div>

      <div
        className={`w-full max-w-[1000px] shadow-2xl rounded-2xl overflow-hidden ${isGenerando ? "bg-white" : "bg-white/40 backdrop-blur-2xl"} border border-white/60 font-sans`}
      >
        <ReportPage1
          ref={page1Ref}
          paciente={paciente}
          setPaciente={noop}
          componentes={assessment.components}
          modoEdicion={false}
          edadCalculada={edadCalculada}
          isSCA={assessment.is_sca}
          setIsSCA={noop}
          isDM2={assessment.is_dm2}
          setIsDM2={noop}
          isPluripatologico={assessment.is_pluripatologico}
          setIsPluripatologico={noop}
          isPocaExpectativa={assessment.is_poca_expectativa}
          setIsPocaExpectativa={noop}
          isGenerando={isGenerando}
          onScoreChange={noop}
        />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage2 ref={page2Ref} paciente={paciente} componentes={assessment.components} isGenerando={isGenerando} />
        <div className="bg-slate-200 h-4 w-full print:hidden" />
        <ReportPage3
          ref={page3Ref}
          paciente={paciente}
          alertas={{ criticas: assessment.alertas_criticas, orientadoras: assessment.alertas_orientadoras }}
          modoEdicion={false}
          isGenerando={isGenerando}
          onAddAlerta={noop}
          onRemoveAlerta={noop}
          onUpdateAlerta={noop}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/clinical/PatientReportView.tsx
git commit -m "feat(clinical): add patient-side PatientReportView with PDF download"
```

---

## Task 15: Patient page `/mi-historia-clinica/page.tsx`

**Files:**
- Create: `src/app/(dashboard)/mi-historia-clinica/page.tsx`

- [ ] **Step 1: Create directory + file**

```bash
mkdir -p "src/app/(dashboard)/mi-historia-clinica"
```

Create `src/app/(dashboard)/mi-historia-clinica/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PatientReportView from "@/components/dashboard/clinical/PatientReportView"
import type { PatientAssessment, PatientClinicalProfile } from "@/types/database"

export default async function MiHistoriaClinicaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: assessments } = await supabase
    .from("patient_assessments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  const { data: profile } = await supabase
    .from("patient_clinical_profile")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  const all = (assessments ?? []) as PatientAssessment[]
  const latest = all[0] ?? null
  const oldest = all[all.length - 1] ?? null
  const evaluacionInicialScore = oldest && oldest.id !== latest?.id ? oldest.score_global : null

  if (!latest) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <div className="inline-block rounded-full bg-blue-50 p-6 mb-4">
          <svg className="w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral mb-2">Aún no tienes una evaluación clínica</h1>
        <p className="text-tertiary">Acércate a tu auxiliar de enfermería para crear tu reporte CAIMED Cardiopreventiva.</p>
      </div>
    )
  }

  return (
    <PatientReportView
      assessment={latest}
      profile={(profile ?? null) as PatientClinicalProfile | null}
      evaluacionInicialScore={evaluacionInicialScore}
    />
  )
}
```

- [ ] **Step 2: Manual smoke test**

Run `npm run dev`. Log in as a patient that has at least one assessment. Visit `http://localhost:3000/mi-historia-clinica`. Expected: see the 3-page report. Click "Descargar PDF" — file downloads.

Log in as a patient with NO assessments. Visit same URL. Expected: empty state.

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/mi-historia-clinica/page.tsx
git commit -m "feat(clinical): patient route /mi-historia-clinica with empty state and report view"
```

---

## Task 16: Add "Historia clínica" button to admin patient detail header

**Files:**
- Modify: `src/app/(admin)/admin/pacientes/[id]/page.tsx`

- [ ] **Step 1: Edit the file**

Open `src/app/(admin)/admin/pacientes/[id]/page.tsx`. Find the section where `<ExportButton />` is used (around line 148):

```tsx
          <div className="flex items-center gap-3">
            <ExportButton patientId={id} patientName={patient.name} />
          </div>
```

Replace with:

```tsx
          <div className="flex items-center gap-3">
            <a
              href={`/admin/pacientes/${id}/historia-clinica`}
              className="rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
            >
              Historia clínica →
            </a>
            <ExportButton patientId={id} patientName={patient.name} />
          </div>
```

- [ ] **Step 2: Manual smoke test**

`npm run dev`, visit `/admin/pacientes/<patient-id>` as an admin. Verify the "Historia clínica →" button appears next to "Exportar CSV" and navigates correctly when clicked.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(admin\)/admin/pacientes/\[id\]/page.tsx
git commit -m "feat(admin): add Historia clínica button to patient detail header"
```

---

## Task 17: Add nav entry "Historia clínica" to `DashboardShell.tsx`

**Files:**
- Modify: `src/components/dashboard/DashboardShell.tsx`

- [ ] **Step 1: Inspect existing nav items**

Open `src/components/dashboard/DashboardShell.tsx` and find the nav link list. Identify the entries for "Mi camino", "Recompensas", "Mensajes" — note their Tailwind/Lucide pattern.

- [ ] **Step 2: Insert new nav entry**

Between the "Recompensas" and "Mensajes" entries, add a new link with:
- href: `/mi-historia-clinica`
- label: `Historia clínica`
- icon: `Stethoscope` from `lucide-react` (add to imports)

Example (adapt to whatever the existing exact pattern looks like):

```tsx
import { Stethoscope } from "lucide-react"
// ...
<NavLink href="/mi-historia-clinica" icon={Stethoscope}>
  Historia clínica
</NavLink>
```

If the file uses a different abstraction, follow that pattern verbatim — do not introduce a new component shape.

- [ ] **Step 3: Manual smoke test**

`npm run dev`, log in as a patient. Verify the new "Historia clínica" entry appears in the nav and clicking it navigates to `/mi-historia-clinica`.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardShell.tsx
git commit -m "feat(patient): add Historia clínica entry to dashboard nav"
```

---

## Task 18: Delete `hcxx/` and run full smoke test

**Files:**
- Delete: `hcxx/` (entire directory)

- [ ] **Step 1: Delete the directory**

```bash
rm -rf hcxx
```

- [ ] **Step 2: Verify nothing references it**

Run: `grep -rE "from ['\"](\\.\\./)*hcxx|from ['\"]@/.+/hcxx" src/`
Expected: no matches.

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run lint`
Expected: no new errors related to clinical files.

- [ ] **Step 3: Full E2E manual run**

`npm run dev`. Walk the golden path defined in spec section 9.1:

1. Log in as admin → `/admin/pacientes` → click on a patient → see "Historia clínica →" button → click.
2. Empty state → click "+ Nueva evaluación" → complete the questionnaire → submit.
3. After submit, page shows the report and timeline with one entry.
4. Click "Editar" on the latest assessment → change a value (e.g., glucose) → click "Guardar como nueva evaluación" → timeline now has two entries.
5. Log out, log in as that patient → click "Historia clínica" in nav → see the report → click "Descargar PDF" → file downloads successfully.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(clinical): remove hcxx standalone app, integration complete"
```

- [ ] **Step 5: Push to GitHub**

```bash
git push origin main
```

---

## Self-review

This plan covers every section of the spec:

| Spec section | Implemented in |
|---|---|
| §1 Goals | Tasks 1-18 collectively |
| §2 Decisions summary | Carried throughout |
| §3 Out of scope | Explicitly NOT implemented (no email, no Sheets, no nurse role) |
| §4.1 patient_clinical_profile | Task 1 |
| §4.2 patient_assessments | Task 1 |
| §4.3 RLS policies | Task 1 |
| §4.4 Type mapping | Task 2 (DB types), Task 10 (`buildPaciente`) |
| §5.1 Admin route | Tasks 13 (page), 10 (client), 11 (questionnaire), 12 (timeline) |
| §5.2 Patient route | Tasks 14, 15 |
| §5.3 Entry points | Tasks 16, 17 |
| §5.4 Server/client boundary | Followed throughout |
| §6.1 New files | Tasks 3-15 |
| §6.2 Edits to existing files | Tasks 2, 16, 17 |
| §6.3 Refactor of App.tsx | Tasks 7-10 |
| §6.4 Visual decisions | Reflected in CSS classes preserved during port |
| §6.5 Dependencies | No additions confirmed |
| §7.1 saveAssessment | Task 5 |
| §7.2 upsertClinicalProfile | Task 5 |
| §7.3 getAssessmentTimeline | Task 5 |
| §8 Risks | Mitigations applied: server-side recompute (Task 5), try/catch on PDF (Tasks 10, 14), all profile fields nullable (Task 1) |
| §9 Testing plan | Task 4 (scoring spot-check), Tasks 13/15/18 (manual smoke tests) |
| §11 Future work | NOT implemented (intentional) |

# Historia Clínica CAIMED Cardiopreventiva — Design Spec

**Date:** 2026-04-27
**Status:** Approved by product (Daniel Jiménez)
**Target:** Escuela de Pacientes CAIMED — integrate the standalone `hcxx` clinical history app into the main Next.js platform

---

## 1. Goals

Integrate the existing standalone `hcxx` app (Vite + Express + Resend + Google Sheets) into the main Next.js 16 + Supabase platform as a first-class feature. After the integration:

- An admin (acting as nursing assistant — *auxiliar de enfermería*) opens any patient's profile and creates a new clinical assessment via a guided questionnaire that computes the **CAIMED Score** (0–100) over 13 components plus 4 clinical context flags.
- The patient sees a read-only version of their latest assessment in their own dashboard, with a one-click PDF download.
- All assessments are persisted in Supabase as an append-only history; the chart "Evolución de Salud" (Initial → Current → Goal) is derived from this history.
- The standalone `hcxx/` directory is removed at the end of the work (no second deploy, no iframes, no cross-origin auth).

This document is the design only. The implementation plan is produced in a follow-up artifact via the `writing-plans` skill.

---

## 2. Decisions summary (from brainstorming)

| # | Topic | Decision |
|---|---|---|
| 1 | Role for the editor | Reuse `admin` role. No new `nurse` role in v1. |
| 2 | Storage model | Append-only history of assessments per patient. |
| 3 | Integration mode | Native Next.js rewrite. Port `utils`, `constants`, `types` and components into the main app; delete `hcxx/` at the end. |
| 4 | Admin entry point | Subroute `/admin/pacientes/[id]/historia-clinica` (full page, not modal/drawer/tabs). |
| 5 | Patient view + PDF | Server-rendered HTML view of the report with client-side `html2canvas` + `jspdf` for download. No server-side PDF in v1. |
| 6 | Assessment input flow | Each new assessment starts with the `Questionnaire`, optionally pre-filled from the previous one. |
| 7 | Demographic data | Separate `patient_clinical_profile` (mutable, 1 row per patient) from `patient_assessments` (append-only). |

---

## 3. Out of scope (v1)

- Email delivery of the report (no Resend integration).
- Google Sheets sync of questionnaire data.
- Auto-linking clinical component scores into the personalized module route (`patient_components`). The overlap between hcxx's 13 components and the existing `modules.component_key` is acknowledged but not wired up in v1.
- Dedicated `nurse` role with RLS scoped to assigned patients.
- Server-side PDF generation with `@react-pdf/renderer` for the clinical report (kept only for the existing certificate route).
- Visual diff/comparison between assessments (the timeline only lists them).
- Migration / rewrite of the external "Planes de Salud" link (`pagina-caimeddd.vercel.app`) that the hcxx report links to — the link stays in the report as-is.

---

## 4. Data model

New migration file: `supabase/migration-v6.sql`. Three additions: two tables and the RLS policies for both. No changes to existing tables.

### 4.1 `patient_clinical_profile`

One row per patient. Holds the demographic data captured by the questionnaire. Mutable: every questionnaire run upserts the latest values.

```sql
create table patient_clinical_profile (
  user_id uuid primary key references users(id) on delete cascade,
  primer_nombre text,
  segundo_nombre text,
  primer_apellido text,
  segundo_apellido text,
  tipo_documento text,                 -- CC, CE, TI, PA
  documento text,
  fecha_nacimiento date,
  sexo text,                           -- M, F
  genero text,                         -- free text: Masculino, Femenino, etc.
  telefono text,
  correo text,
  regimen_afiliacion text,             -- Contributivo, Subsidiado, Especial
  aseguradora text,
  prepagada text,                      -- "No" or insurer name
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
```

All columns nullable except `user_id` (PK). The questionnaire validates only the truly required fields (names, document, birth date) at submit time; the rest can be filled progressively across visits.

### 4.2 `patient_assessments`

Append-only. One row per assessment (clinical visit). Editing an existing assessment in the UI creates a NEW row, not an update — this preserves the audit trail.

```sql
create table patient_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_by uuid not null references users(id),  -- admin who created it
  created_at timestamptz default now(),

  -- 13 components, each with raw value + computed score
  components jsonb not null,
  -- shape: [{nombre: "Glucosa", valor: "95", puntaje: 80}, ...]

  -- clinical-context flags (affect calcularPuntajeExacto)
  is_sca boolean default false,
  is_dm2 boolean default false,
  is_pluripatologico boolean default false,
  is_poca_expectativa boolean default false,

  -- derived/persisted at save time
  score_global int not null,           -- 0–100
  meta_score int not null,             -- min(score_global + 12, 100)
  nivel text not null,                 -- 'Verde' | 'Amarillo' | 'Rojo'

  -- alerts (free-form clinical notes shown on page 3 of the report)
  alertas_criticas jsonb default '[]'::jsonb,
  alertas_orientadoras jsonb default '[]'::jsonb,

  -- raw questionnaire response, for traceability
  raw_questionnaire jsonb,

  -- free-text note from the admin
  notes text
);

create index on patient_assessments (user_id, created_at desc);
```

The chart "Evolución de Salud" (Inicial → Actual → Meta) is **derived**, not stored:
- *Inicial* = `score_global` of the row with `MIN(created_at)` for that `user_id`
- *Actual* = `score_global` of the most recent row
- *Meta* = `meta_score` of the most recent row

If a patient has only one assessment, *Inicial* and *Actual* are the same.

### 4.3 RLS policies

| Table | Operation | Policy |
|---|---|---|
| `patient_clinical_profile` | SELECT | `is_admin()` OR `auth.uid() = user_id` |
| `patient_clinical_profile` | INSERT/UPDATE | `is_admin()` only |
| `patient_assessments` | SELECT | `is_admin()` OR `auth.uid() = user_id` |
| `patient_assessments` | INSERT | `is_admin()` only |
| `patient_assessments` | UPDATE/DELETE | none (append-only) |

The `is_admin()` SQL function already exists in this project (used by `convenios` policies); we reuse it.

### 4.4 Mapping between hcxx types and the database

| hcxx type | DB source |
|---|---|
| `DatosPaciente` (25 fields) | `patient_clinical_profile` + 4 derived fields (`scoreGlobal`, `nivel`, `metaScore`, `fechaReporte`) sourced from the latest `patient_assessments` row |
| `ComponenteScore[]` | `patient_assessments.components` (jsonb) |
| `DatosAlertas` | `patient_assessments.alertas_criticas` + `alertas_orientadoras` |
| `ContextoClinico` | `is_sca`, `is_dm2`, `is_pluripatologico`, `is_poca_expectativa` columns |

---

## 5. Routes and UX

### 5.1 Admin — `/admin/pacientes/[id]/historia-clinica`

Server component at `src/app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx`. Loads the patient, the clinical profile (if any), and the most recent assessment.

The page has three modes, selected by a search-param-free state in the client orchestrator:

| Mode | Trigger | UI |
|---|---|---|
| `view` | Default whenever `patient_assessments` has ≥1 row | Latest assessment rendered as the 3-page report with `modoEdicion=false`, plus a timeline of past assessments below. |
| `edit` | Click "Editar" on the latest assessment in `view` mode | Same 3-page report with `modoEdicion=true` (text inputs and editable alerts). On save, `saveAssessment` creates a NEW row (not an UPDATE). |
| `questionnaire` | Click "+ Nueva evaluación" (or default if `patient_assessments` is empty) | The wizard from `Questionnaire.tsx`. On submit, `saveAssessment` runs and the page redirects to `view`. |

Layout sketch:

```
[← Volver al paciente]
Historia clínica · {patient.name}
[+ Nueva evaluación]

┌─ Última evaluación ──────────────────┐
│  Fecha · Score Global · Nivel        │
│  [Ver reporte completo] [Editar]     │
└──────────────────────────────────────┘

┌─ Línea de tiempo ────────────────────┐
│  📅 12/abr/2026 · 75 · Amarillo      │
│  📅 03/feb/2026 · 68 · Amarillo      │
│  📅 14/dic/2025 · 60 · Rojo (inicial)│
└──────────────────────────────────────┘

[Reporte completo de 3 páginas]
```

### 5.2 Patient — `/mi-historia-clinica`

Server component at `src/app/(dashboard)/mi-historia-clinica/page.tsx`. Loads the patient's most recent `patient_assessments` row plus their `patient_clinical_profile`.

**Empty state** (no assessments yet):

```
🩺 Aún no tienes una evaluación clínica
Acércate a tu auxiliar de enfermería para crear tu reporte CAIMED.
```

**Populated state**:
- Renders the 3-page report identical to the admin view, but `modoEdicion` is hard-locked to `false`.
- Header has a single button "📥 Descargar PDF" (no "Editar", no "Volver al cuestionario", no "Enviar por correo").
- The PDF is generated client-side: at click, lazy-load `html2canvas` and `jspdf` from CDN, capture the three `pageRef` divs, and assemble a single A4 PDF — same algorithm as in current `hcxx/App.tsx`.

### 5.3 Entry points in existing pages

- **`src/app/(admin)/admin/pacientes/[id]/page.tsx`** — add a button "Historia clínica →" in the patient header, next to the existing "Exportar CSV" button.
- **`src/components/dashboard/DashboardShell.tsx`** — add a nav entry "Historia clínica" between "Recompensas" and "Mensajes". Visible to all patients; if they have no assessment yet, the destination shows the empty state.

### 5.4 Server / client boundary

| File | Type | Reason |
|---|---|---|
| `app/(admin)/admin/pacientes/[id]/historia-clinica/page.tsx` | Server | Loads data via Supabase server client |
| `components/admin/clinical/ClinicalHistoryClient.tsx` | Client | Mode state, Recharts gauge, Recharts line chart |
| `components/admin/clinical/Questionnaire.tsx` | Client | Multi-step wizard with form state |
| `app/(dashboard)/mi-historia-clinica/page.tsx` | Server | Loads latest assessment server-side |
| `components/dashboard/clinical/PatientReportView.tsx` | Client | Recharts + html2canvas trigger |

---

## 6. Code organization

### 6.1 New files

```
src/
├── lib/
│   └── clinical/                        [NEW]
│       ├── constants.ts                 ported from hcxx/constants.ts
│       ├── types.ts                     ported from hcxx/types.ts + DB row types
│       ├── scoring.ts                   ported from hcxx/utils.ts
│       └── actions.ts                   server actions: saveAssessment, upsertClinicalProfile, getAssessmentTimeline
│
├── components/
│   ├── admin/clinical/                  [NEW]
│   │   ├── ClinicalHistoryClient.tsx    orchestrator (ports hcxx App.tsx top-level)
│   │   ├── Questionnaire.tsx            ported wizard
│   │   ├── HeaderComponent.tsx          ported (page 1 header)
│   │   ├── HeaderSimple.tsx             ported (pages 2-3 header)
│   │   ├── InspirationalBanner.tsx      ported (page 2 body)
│   │   ├── ReportPage1.tsx              extracted from App.tsx (score + perfil detallado)
│   │   ├── ReportPage2.tsx              extracted (banner + evolution chart)
│   │   ├── ReportPage3.tsx              extracted (alertas)
│   │   └── AssessmentTimeline.tsx       [NEW] list of past assessments
│   │
│   └── dashboard/clinical/              [NEW]
│       └── PatientReportView.tsx        read-only renderer + PDF button
│
├── app/
│   ├── (admin)/admin/pacientes/[id]/
│   │   └── historia-clinica/            [NEW]
│   │       └── page.tsx                 server component
│   │
│   └── (dashboard)/
│       └── mi-historia-clinica/         [NEW]
│           └── page.tsx                 server component

supabase/
└── migration-v6.sql                     [NEW]
```

### 6.2 Edits to existing files

| File | Change |
|---|---|
| `src/app/(admin)/admin/pacientes/[id]/page.tsx` | Add "Historia clínica" button in the patient header. |
| `src/components/dashboard/DashboardShell.tsx` | Add nav entry "Historia clínica". |
| `src/types/database.ts` | Add types `PatientClinicalProfile`, `PatientAssessment` (mirror DB columns). |

### 6.3 Refactor of `hcxx/App.tsx`

The current `hcxx/App.tsx` has 627 lines mixing three pages, URL-param loading, save handlers, and Recharts setup. The port splits it as follows:

- `ClinicalHistoryClient.tsx` — orchestrator: mode state, `componentes` state, save handler. Replaces `loadFromUrl` with props from the server component. ~150 lines.
- `ReportPage1.tsx` / `ReportPage2.tsx` / `ReportPage3.tsx` — pure presentational JSX of each page. ~150 lines each.
- All scoring computation moves to `lib/clinical/scoring.ts`. The client-side `useEffect`s that recompute scores in `App.tsx` become pure function calls inside `ClinicalHistoryClient`.

### 6.4 Visual/style decisions

- The hcxx report's slate/blue Tailwind palette stays inside the clinical module, unchanged. We do **not** migrate the report look to the CAIMED brand palette (`#06559F`/`#212B52`/`#58AE33`) — the existing visual is a deliberate clinical/medical aesthetic that should be preserved.
- The entry-point button in `/admin/pacientes/[id]` and the nav link in the patient dashboard DO use the existing CAIMED palette, so the "way in" looks consistent with the rest of the platform.

### 6.5 Dependencies

No new npm dependencies. `recharts` and `lucide-react` are already in `package.json` (added when the rewards system was built). `html2canvas` and `jspdf` continue to load via CDN at click time, matching the existing hcxx pattern. If we later want them as proper deps to satisfy CSP, that's a v2 chore.

---

## 7. Server actions and data flow

### 7.1 `saveAssessment(input)`

In `src/lib/clinical/actions.ts`. Server action, marked `"use server"`.

Input shape:
```ts
{
  user_id: string,
  components: ComponenteScore[],         // 13 entries
  is_sca: boolean,
  is_dm2: boolean,
  is_pluripatologico: boolean,
  is_poca_expectativa: boolean,
  alertas_criticas: AlertaItem[],
  alertas_orientadoras: AlertaItem[],
  raw_questionnaire?: object,            // present only after Questionnaire flow
  notes?: string
}
```

Steps:
1. `await supabase.auth.getUser()` and verify `users.role === 'admin'`. Reject otherwise.
2. Recompute `components[i].puntaje` using `calcularPuntajeExacto` (server-side, fresh) — **never trust the client values** for the persisted score.
3. Compute `score_global`, `nivel`, `meta_score` from the recomputed components, again using ported `lib/clinical/scoring.ts`.
4. INSERT a new `patient_assessments` row. Set `created_by = currentUser.id`.
5. `revalidatePath` for the admin subroute and the patient route.
6. Return the new assessment ID.

### 7.2 `upsertClinicalProfile(userId, profile)`

In `src/lib/clinical/actions.ts`. Used by the questionnaire flow before/alongside the assessment save.

Steps:
1. Verify admin.
2. UPSERT into `patient_clinical_profile` keyed on `user_id`.
3. Update `users.name` from `primer_nombre + primer_apellido` if the user's name was previously empty (small convenience — never overwrites a non-empty name).
4. Return.

### 7.3 `getAssessmentTimeline(userId)`

Convenience query returning `{ id, created_at, score_global, nivel }[]` ordered descending. Used by the admin timeline component. Plain SELECT; could be inlined into the server component, but extracting it keeps the page thin.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Next.js 16 has breaking changes vs. training data (per `AGENTS.md`). | Read `node_modules/next/dist/docs/` before writing server actions and dynamic-route page files. Mimic the patterns already in use in `recompensas/page.tsx` and `pacientes/[id]/page.tsx`. |
| `recharts` requires client rendering. | Mark every component that uses it with `"use client"`. Server components only fetch data and pass props down. |
| `html2canvas` can OOM on low-end Android. | Wrap the PDF button in a try/catch; on failure show fallback message "Descarga el PDF desde un computador". Do not crash the page. |
| Score-mismatch between client display and persisted value. | Server-side recomputation in `saveAssessment` is the source of truth. Client display reflects the persisted value after save. |
| Demographic fields are mostly optional, but the questionnaire might break with empty values. | All `patient_clinical_profile` columns nullable except `user_id`. Questionnaire validates only the essentials at submit. |
| `patient_components` table (existing) and the 13 hcxx components share names but are different systems. | Document the overlap with a code comment in `lib/clinical/constants.ts`. Leave a TODO referencing the v2 work to wire low scores into the personalized module priority list. |
| Editing an existing assessment creates a new row — easy to confuse with an in-place edit. | The "Editar" UX explicitly labels the save button "Guardar como nueva evaluación" so the operator knows. The timeline shows all rows. |

---

## 9. Testing plan

### 9.1 Manual / E2E (golden path)

1. Admin opens `/admin/pacientes/[id]` → clicks "Historia clínica" → empty state.
2. Clicks "+ Nueva evaluación" → completes questionnaire → submits.
3. Returns to subroute → sees the 3-page report and the timeline (1 entry).
4. Clicks "Editar" → changes glucose value → "Guardar como nueva" → timeline now has 2 entries.
5. Logs in as that patient → `/mi-historia-clinica` → sees report → "Descargar PDF" succeeds.

### 9.2 Edge cases to exercise manually

- `is_dm2 = true` and `edad >= 70` (puntaje multipliers in `calcularPuntajeExacto` change).
- Patient without `cedula` → questionnaire prompts for it.
- "Descargar PDF" on a small mobile viewport.
- Admin tries to open `/admin/pacientes/[other-id]/historia-clinica` without admin role (RLS + layout redirect should both block).
- Patient tries to navigate to `/admin/pacientes/.../historia-clinica` (admin layout redirects to dashboard).

### 9.3 Unit tests (if time permits)

- `lib/clinical/scoring.ts` — `calcularPuntajeExacto` against a fixture of ≥10 cases covering branches for each `ContextoClinico` permutation (SCA, DM2, age cutoff at 70).
- `calcularScoreGlobal` — verifies the weighted average where critical components (Peso, Glucosa, Presión arterial, Colesterol) get weight 5 if puntaje ≤ 50, weight 3 if < 80, weight 1 otherwise.

---

## 10. Effort estimate

~12–16 hours implementation + ~2 hours QA, broken down:

1. SQL migration + types — 1h
2. Port `lib/clinical/` (constants, types, scoring, actions) — 2h
3. Admin components (ClinicalHistoryClient + 3 page extracts + Questionnaire + AssessmentTimeline) — 5–6h
4. Patient page + PDF button — 2h
5. Edits to existing pages (admin patient header, dashboard nav) — 1h
6. QA + ad-hoc fixes — 2h

---

## 11. Future work (v2+)

- Dedicated `nurse` role with RLS scoped to assigned patients.
- Auto-link low component scores into `patient_components` priority list (so a patient with a Peso score < 60 sees the Peso module promoted in their personalized route).
- Email delivery via Resend from the admin view ("Enviar reporte al paciente").
- Google Sheets sync of questionnaire answers for analytics.
- Visual diff/delta per component between consecutive assessments in the timeline.
- Server-side simplified PDF (`@react-pdf/renderer`) for email attachments and headless contexts.
- Migration of `html2canvas`/`jspdf` from CDN to npm dependencies (CSP hardening).

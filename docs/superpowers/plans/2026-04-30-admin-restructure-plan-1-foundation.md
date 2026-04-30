# Plan 1 — Fundación del admin restructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar el panel admin en 3 grupos visuales, introducir el rol `clinico` con permisos restringidos, gestión de personal desde el admin, y columnas de auditoría en evaluaciones de salud — sin romper nada existente.

**Architecture:** Extiende la tabla `public.users` con columnas profesionales (nullable, solo se usan cuando `role` ∈ `admin`/`clinico`). Agrega `clinico` al check del role. Crea helper RPC `is_clinical_staff()` (admin OR clinico) y actualiza solo las RLS de tablas clínicas. AdminShell se refactoriza para mostrar grupos según rol. El layout `/admin` lee el rol del perfil y redirige a clínicos fuera de las rutas no permitidas.

**Tech Stack:** Next.js 16 (App Router), Supabase (Auth + Postgres + RLS), TypeScript, Tailwind CSS v4. NO hay framework de tests instalado — la verificación es manual vía SQL Editor + navegador.

**⚠ Próximo agente, lee antes de escribir código:**
- `node_modules/next/dist/docs/` — esta versión de Next.js tiene cambios incompatibles con los que conocías
- El proyecto raíz está en `escuela-pacientes/`
- Spec asociado: `docs/superpowers/specs/2026-04-30-admin-restructure-design.md`
- **Terminología obligatoria:** en copia visible al usuario di "evaluación de salud", nunca "historia clínica" ni "HC"

**Repo state pre-requisito:** estar en `main` con working tree limpio.

---

## File map

### Crear
- `supabase/migration-v7.sql` — migración SQL (rol clínico, columnas profesionales, auditoría, helper RPC)
- `supabase/migration-v7-rls.sql` — actualización de políticas RLS de tablas clínicas
- `src/lib/auth/profile.ts` — helper para leer perfil + rol del usuario en server components
- `src/app/(admin)/admin/personal/page.tsx` — página de gestión de personal (solo admin)
- `src/app/(admin)/admin/personal/actions.ts` — server actions: invitar clínico, toggle activo
- `src/components/admin/StaffList.tsx` — tabla de clínicos con toggle activo/inactivo
- `src/components/admin/InviteStaffForm.tsx` — formulario de invitación
- `src/app/(admin)/admin/clinico/dashboard/page.tsx` — placeholder del dashboard clínico (solo título; el contenido lo llena Plan 6)

### Modificar
- `src/app/(admin)/layout.tsx` — admite rol `clinico` y redirige a clínicos fuera de rutas permitidas
- `src/components/admin/AdminShell.tsx` — sidebar agrupado en 3 secciones, role-aware
- `src/lib/clinical/actions.ts` — al insertar/actualizar `patient_assessments`, set `created_by`/`last_modified_by`/`last_modified_at`

---

## Task 1: Migración SQL — extender users + auditoría en assessments

**Files:**
- Create: `supabase/migration-v7.sql`

- [ ] **Step 1: Escribir la migración SQL**

Crea `supabase/migration-v7.sql` con:

```sql
-- ============================================
-- MIGRATION V7 — Rol clínico, columnas profesionales, auditoría
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Ampliar el check de role para aceptar 'clinico'
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check
  check (role in ('patient', 'admin', 'clinico'));

-- 2. Columnas profesionales en users (nullable; solo se usan para staff)
alter table public.users add column if not exists profession text
  check (profession is null or profession in ('medico', 'enfermero', 'otro'));
alter table public.users add column if not exists specialty text;
alter table public.users add column if not exists medical_registration text;
alter table public.users add column if not exists professional_id_card text;
alter table public.users add column if not exists is_active boolean not null default true;

-- 3. Helper: usuario es staff clínico (admin o clinico)
create or replace function public.is_clinical_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'clinico')
      and is_active = true
  );
$$;

-- 4. Auditoría en patient_assessments
-- Hacer created_by nullable para soportar auto-diligenciado futuro
alter table public.patient_assessments alter column created_by drop not null;

-- Agregar last_modified_by + last_modified_at
alter table public.patient_assessments add column if not exists last_modified_by uuid
  references public.users(id);
alter table public.patient_assessments add column if not exists last_modified_at timestamptz;
```

- [ ] **Step 2: Ejecutar la migración en Supabase**

Abre el SQL Editor de Supabase del proyecto y ejecuta el contenido completo de `supabase/migration-v7.sql`. Espera respuesta `Success. No rows returned` o equivalente.

- [ ] **Step 3: Verificar el cambio del role check**

Ejecuta en SQL Editor:

```sql
-- Debe poder insertar (solo prueba — borra el row después)
insert into public.users (id, name, email, role)
values (gen_random_uuid(), 'test clinico', 'test-clinico@delete.me', 'clinico')
returning id, role;

-- Borra el row de prueba
delete from public.users where email = 'test-clinico@delete.me';
```

Expected: el INSERT inserta una fila; luego DELETE borra esa fila.

- [ ] **Step 4: Verificar columnas nuevas**

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'users'
  and column_name in ('profession','specialty','medical_registration','professional_id_card','is_active')
order by column_name;
```

Expected: 5 filas, todas nullable excepto `is_active` (NOT NULL con default true).

- [ ] **Step 5: Verificar el helper `is_clinical_staff()`**

```sql
select public.is_clinical_staff();
```

Expected: devuelve `false` o `true` (no error). Si lo ejecutas como service-role/SQL editor sin auth user, devuelve `false`.

- [ ] **Step 6: Verificar columnas nuevas en patient_assessments**

```sql
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'patient_assessments'
  and column_name in ('created_by','last_modified_by','last_modified_at');
```

Expected: 3 filas. `created_by` es `YES` (nullable), `last_modified_by` y `last_modified_at` también `YES`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migration-v7.sql
git commit -m "feat(db): add clinico role, professional columns, and assessment audit fields"
```

---

## Task 2: Actualizar RLS de tablas clínicas para incluir rol clinico

**Files:**
- Create: `supabase/migration-v7-rls.sql`

- [ ] **Step 1: Escribir el SQL de RLS**

Crea `supabase/migration-v7-rls.sql`:

```sql
-- ============================================
-- MIGRATION V7-RLS — Permitir clinico en tablas clínicas
-- Ejecutar en SQL Editor de Supabase DESPUÉS de migration-v7.sql
-- ============================================

-- patient_clinical_profile: agregar políticas para clinico
drop policy if exists "Profile readable by owner or admin" on public.patient_clinical_profile;
drop policy if exists "Profile writable by admin only" on public.patient_clinical_profile;
drop policy if exists "Profile updatable by admin only" on public.patient_clinical_profile;

create policy "Profile readable by owner or staff"
  on public.patient_clinical_profile for select
  using (auth.uid() = user_id or public.is_clinical_staff());

create policy "Profile writable by staff"
  on public.patient_clinical_profile for insert
  with check (public.is_clinical_staff());

create policy "Profile updatable by staff"
  on public.patient_clinical_profile for update
  using (public.is_clinical_staff());

-- patient_assessments: agregar políticas para clinico
drop policy if exists "Assessments readable by owner or admin" on public.patient_assessments;
drop policy if exists "Assessments writable by admin only" on public.patient_assessments;

create policy "Assessments readable by owner or staff"
  on public.patient_assessments for select
  using (auth.uid() = user_id or public.is_clinical_staff());

create policy "Assessments writable by staff"
  on public.patient_assessments for insert
  with check (public.is_clinical_staff());

-- Permitir UPDATE en assessments (para last_modified_by/at)
create policy "Assessments updatable by staff"
  on public.patient_assessments for update
  using (public.is_clinical_staff());

-- users: permitir a admin gestionar staff (insert/update con role staff)
-- (las políticas actuales ya están en fix-rls.sql; solo necesitamos verificar
--  que admin pueda insertar con role='clinico' — lo que ya cubre la política
--  "Admins can update all users" si existe; si no, agregar:)
drop policy if exists "Admins can update all users" on public.users;

create policy "Admins can update all users"
  on public.users for update
  using (public.is_admin());

-- Política ya existente que permite insert de cualquier user; suficiente
-- para invitaciones porque la invitación crea el row vía service-role.
```

- [ ] **Step 2: Ejecutar en SQL Editor**

Abre Supabase SQL Editor y ejecuta el contenido de `supabase/migration-v7-rls.sql`. Verifica que termina sin error.

- [ ] **Step 3: Verificar que las políticas existen**

```sql
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('patient_clinical_profile','patient_assessments')
order by tablename, policyname;
```

Expected: ver las nuevas políticas con sufijo "by owner or staff" / "by staff".

- [ ] **Step 4: Commit**

```bash
git add supabase/migration-v7-rls.sql
git commit -m "feat(db): grant clinico role access to patient tables via RLS"
```

---

## Task 3: Helper de perfil con rol

**Files:**
- Create: `src/lib/auth/profile.ts`

- [ ] **Step 1: Crear el helper**

Crea `src/lib/auth/profile.ts`:

```typescript
import { createClient } from "@/lib/supabase/server"

export type UserRole = "patient" | "admin" | "clinico"
export type Profession = "medico" | "enfermero" | "otro" | null

export interface StaffProfile {
  id: string
  name: string
  email: string
  role: UserRole
  profession: Profession
  specialty: string | null
  medical_registration: string | null
  professional_id_card: string | null
  is_active: boolean
}

/**
 * Lee el perfil del usuario logueado desde public.users.
 * Devuelve null si no hay sesión o el perfil no existe.
 */
export async function getCurrentProfile(): Promise<StaffProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, profession, specialty, medical_registration, professional_id_card, is_active")
    .eq("id", user.id)
    .single()

  return (profile as StaffProfile) ?? null
}

export function isStaff(profile: Pick<StaffProfile, "role" | "is_active"> | null): boolean {
  return !!profile && profile.is_active && (profile.role === "admin" || profile.role === "clinico")
}

export function isAdmin(profile: Pick<StaffProfile, "role" | "is_active"> | null): boolean {
  return !!profile && profile.is_active && profile.role === "admin"
}

export function isClinico(profile: Pick<StaffProfile, "role" | "is_active"> | null): boolean {
  return !!profile && profile.is_active && profile.role === "clinico"
}
```

- [ ] **Step 2: Verificar que tipa**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit
```

Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/profile.ts
git commit -m "feat(auth): add profile helper with role and staff checks"
```

---

## Task 4: Layout admin admite rol clinico y redirige

**Files:**
- Modify: `src/app/(admin)/layout.tsx`

- [ ] **Step 1: Reemplazar el contenido del layout**

Sobrescribe `src/app/(admin)/layout.tsx`:

```typescript
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getCurrentProfile, isStaff, isClinico } from "@/lib/auth/profile"
import AdminShell from "@/components/admin/AdminShell"

export const dynamic = "force-dynamic"

// Rutas permitidas para clínicos
const CLINICO_ALLOWED_PREFIXES = ["/admin/pacientes", "/admin/clinico"]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect("/login")
  }

  if (!isStaff(profile)) {
    redirect("/mi-camino")
  }

  // Enforcement de rutas para clinico
  if (isClinico(profile)) {
    const headersList = await headers()
    const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? ""
    const allowed = CLINICO_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
    if (!allowed && pathname !== "") {
      redirect("/admin/clinico/dashboard")
    }
  }

  return (
    <AdminShell profile={profile}>{children}</AdminShell>
  )
}
```

- [ ] **Step 2: Crear middleware para inyectar `x-pathname`**

Como el layout no tiene acceso directo a `pathname` en server components, hay que crear un middleware que lo añada como header. Crea o modifica `src/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set("x-pathname", request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: ["/admin/:path*"],
}
```

Si ya existe `src/middleware.ts`, solo agrega `response.headers.set("x-pathname", request.nextUrl.pathname)` antes del `return`.

- [ ] **Step 3: Verificar build**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Verificar manualmente con un usuario admin existente**

```bash
npm run dev
```

Abre `http://localhost:3000/admin` con un admin logueado. Expected: la página carga normalmente. Verifica también `/admin/pacientes` y `/admin/convenios` (admin debe ver todo).

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/layout.tsx src/middleware.ts
git commit -m "feat(admin): admit clinico role and enforce route restrictions"
```

---

## Task 5: AdminShell con sidebar agrupado y role-aware

**Files:**
- Modify: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Reemplazar el contenido**

Sobrescribe `src/components/admin/AdminShell.tsx`:

```typescript
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { StaffProfile } from "@/lib/auth/profile"

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  exact?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
  visibleTo: ReadonlyArray<"admin" | "clinico">
}

const dashboardIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)
const contentIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
)
const blogIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
  </svg>
)
const conveniosIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)
const codesIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)
const personalIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)
const patientsIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)
const stethoscopeIcon = (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const navGroups: NavGroup[] = [
  {
    label: "Escuela de pacientes",
    visibleTo: ["admin"],
    items: [
      { href: "/admin", label: "Dashboard", icon: dashboardIcon, exact: true },
      { href: "/admin/contenido", label: "Contenido", icon: contentIcon },
      { href: "/admin/blog", label: "Blog", icon: blogIcon },
    ],
  },
  {
    label: "Gestión administrativa",
    visibleTo: ["admin"],
    items: [
      { href: "/admin/convenios", label: "Convenios", icon: conveniosIcon },
      { href: "/admin/codigos", label: "Códigos de acceso", icon: codesIcon },
      { href: "/admin/personal", label: "Personal", icon: personalIcon },
    ],
  },
  {
    label: "Clínico",
    visibleTo: ["admin", "clinico"],
    items: [
      { href: "/admin/clinico/dashboard", label: "Dashboard clínico", icon: stethoscopeIcon },
      { href: "/admin/pacientes", label: "Pacientes", icon: patientsIcon },
    ],
  },
]

export default function AdminShell({
  profile,
  children,
}: {
  profile: { name: string; role: "admin" | "clinico" }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const visibleGroups = navGroups.filter((g) => g.visibleTo.includes(profile.role))

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const renderNavItem = (item: NavItem, isMobile: boolean) => {
    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
    if (isMobile) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
            isActive ? "bg-primary/10 text-primary" : "text-tertiary hover:bg-background"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      )
    }
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isActive ? "bg-primary/10 text-primary" : "text-tertiary hover:bg-background hover:text-neutral"
          }`}
        >
          {item.icon}
          {item.label}
        </Link>
      </li>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-tertiary/10 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-tertiary/10 px-6 gap-3">
          <img
            src="/logo-medicina-preventiva.png"
            alt="Logo Medicina Preventiva CAIMED"
            className="h-14 w-auto object-contain"
          />
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {profile.role === "admin" ? "Admin" : "Clínico"}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {visibleGroups.length > 1 && (
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-tertiary/60">
                  {group.label}
                </div>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => renderNavItem(item, false))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-tertiary/10 p-4">
          <div className="mb-2 text-sm text-tertiary">{profile.name}</div>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-tertiary transition-colors hover:bg-background hover:text-error"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Header + nav mobile */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-tertiary/10 bg-white px-4 lg:hidden">
          <img
            src="/logo-medicina-preventiva.png"
            alt="Logo Medicina Preventiva CAIMED"
            className="h-14 w-auto object-contain"
          />
          <button onClick={handleLogout} className="text-sm text-tertiary hover:text-error">
            Salir
          </button>
        </header>

        <nav className="flex items-center gap-1 overflow-x-auto border-b border-tertiary/10 bg-white px-4 py-2 lg:hidden">
          {visibleGroups.flatMap((g) => g.items).map((item) => renderNavItem(item, true))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 3: Verificar visualmente**

```bash
npm run dev
```

Login como admin. Expected en sidebar desktop:
- Encabezado "Escuela de pacientes" con Dashboard, Contenido, Blog
- Encabezado "Gestión administrativa" con Convenios, Códigos de acceso, Personal
- Encabezado "Clínico" con Dashboard clínico, Pacientes
- Badge "Admin" arriba

Móvil: pestañas horizontales con todos los items, sin encabezados.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminShell.tsx
git commit -m "feat(admin): group sidebar into 3 sections with role-aware visibility"
```

---

## Task 6: Placeholder del dashboard clínico

**Files:**
- Create: `src/app/(admin)/admin/clinico/dashboard/page.tsx`

- [ ] **Step 1: Crear placeholder**

```typescript
export const dynamic = "force-dynamic"

export default function ClinicoDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral mb-2">Dashboard clínico</h1>
      <p className="text-tertiary">
        Próximamente: KPIs, métricas de los 14 componentes, tendencias y alertas.
      </p>
    </div>
  )
}
```

Esto evita 404 cuando un clínico hace login (el layout lo redirige aquí). El contenido real lo llena el Plan 6.

- [ ] **Step 2: Verificar**

```bash
npm run dev
```

Navega a `http://localhost:3000/admin/clinico/dashboard` (como admin). Expected: ves el título "Dashboard clínico" y el texto placeholder.

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/clinico/dashboard/page.tsx
git commit -m "feat(admin): add clinical dashboard placeholder"
```

---

## Task 7: Página /admin/personal — listar staff

**Files:**
- Create: `src/app/(admin)/admin/personal/page.tsx`
- Create: `src/components/admin/StaffList.tsx`

- [ ] **Step 1: Crear la página server component**

`src/app/(admin)/admin/personal/page.tsx`:

```typescript
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import StaffList from "@/components/admin/StaffList"
import InviteStaffForm from "@/components/admin/InviteStaffForm"

export const dynamic = "force-dynamic"

export default async function PersonalPage() {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) {
    redirect("/admin")
  }

  const supabase = await createClient()
  const { data: staff } = await supabase
    .from("users")
    .select("id, name, email, role, profession, specialty, medical_registration, professional_id_card, is_active, registered_at")
    .in("role", ["admin", "clinico"])
    .order("registered_at", { ascending: false })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral mb-6">Personal</h1>
      <div className="mb-8">
        <InviteStaffForm />
      </div>
      <StaffList staff={staff ?? []} />
    </div>
  )
}
```

- [ ] **Step 2: Crear el componente StaffList**

`src/components/admin/StaffList.tsx`:

```typescript
"use client"

import { useTransition } from "react"
import { toggleStaffActive } from "@/app/(admin)/admin/personal/actions"

type StaffMember = {
  id: string
  name: string
  email: string
  role: "admin" | "clinico"
  profession: "medico" | "enfermero" | "otro" | null
  specialty: string | null
  medical_registration: string | null
  is_active: boolean
}

export default function StaffList({ staff }: { staff: StaffMember[] }) {
  const [pending, startTransition] = useTransition()

  function handleToggle(id: string, nextValue: boolean) {
    startTransition(async () => {
      await toggleStaffActive(id, nextValue)
    })
  }

  if (staff.length === 0) {
    return <p className="text-tertiary">No hay personal registrado todavía.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-tertiary/10 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-background text-left text-xs uppercase tracking-wide text-tertiary">
          <tr>
            <th className="px-4 py-3">Nombre</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3">Profesión</th>
            <th className="px-4 py-3">Registro</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-tertiary/10">
          {staff.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3">{s.name}</td>
              <td className="px-4 py-3 capitalize">{s.role}</td>
              <td className="px-4 py-3 capitalize">
                {s.profession ?? "—"}
                {s.specialty ? ` · ${s.specialty}` : ""}
              </td>
              <td className="px-4 py-3">{s.medical_registration ?? "—"}</td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3">
                <button
                  onClick={() => handleToggle(s.id, !s.is_active)}
                  disabled={pending}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    s.is_active
                      ? "bg-success/10 text-success hover:bg-success/20"
                      : "bg-tertiary/10 text-tertiary hover:bg-tertiary/20"
                  }`}
                >
                  {s.is_active ? "Activo" : "Inactivo"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos (la importación de actions todavía no existe — TypeScript fallará)**

Pasamos al siguiente task antes de validar.

---

## Task 8: Server actions de personal — invitar y toggle activo

**Files:**
- Create: `src/app/(admin)/admin/personal/actions.ts`
- Create: `src/components/admin/InviteStaffForm.tsx`

- [ ] **Step 1: Crear las server actions**

`src/app/(admin)/admin/personal/actions.ts`:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"

export type InviteStaffInput = {
  fullName: string
  email: string
  profession: "medico" | "enfermero" | "otro"
  specialty?: string
  medicalRegistration?: string
  professionalIdCard?: string
}

export async function inviteStaff(input: InviteStaffInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.fullName.trim() || !input.email.trim()) {
    return { ok: false, error: "Nombre y correo son obligatorios" }
  }

  const supabase = createAdminClient()

  // 1. Invitar al usuario por email (Supabase Auth)
  const { data: authUser, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(input.email.trim())

  if (inviteError || !authUser?.user) {
    return { ok: false, error: inviteError?.message ?? "No se pudo invitar al usuario" }
  }

  // 2. Insertar / upsert el row de public.users con datos profesionales y rol 'clinico'
  const { error: insertError } = await supabase.from("users").upsert({
    id: authUser.user.id,
    name: input.fullName.trim(),
    email: input.email.trim(),
    role: "clinico",
    profession: input.profession,
    specialty: input.specialty?.trim() || null,
    medical_registration: input.medicalRegistration?.trim() || null,
    professional_id_card: input.professionalIdCard?.trim() || null,
    is_active: true,
  })

  if (insertError) {
    return { ok: false, error: insertError.message }
  }

  revalidatePath("/admin/personal")
  return { ok: true }
}

export async function toggleStaffActive(userId: string, nextValue: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("users")
    .update({ is_active: nextValue })
    .eq("id", userId)
    .in("role", ["admin", "clinico"])

  if (error) return { ok: false, error: error.message }

  revalidatePath("/admin/personal")
  return { ok: true }
}
```

- [ ] **Step 2: Crear el formulario de invitación**

`src/components/admin/InviteStaffForm.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { inviteStaff, type InviteStaffInput } from "@/app/(admin)/admin/personal/actions"

export default function InviteStaffForm() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const [form, setForm] = useState<InviteStaffInput>({
    fullName: "",
    email: "",
    profession: "medico",
    specialty: "",
    medicalRegistration: "",
    professionalIdCard: "",
  })

  function update<K extends keyof InviteStaffInput>(key: K, value: InviteStaffInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await inviteStaff(form)
      if (!result.ok) {
        setError(result.error)
      } else {
        setSuccess("Invitación enviada")
        setForm({ fullName: "", email: "", profession: "medico", specialty: "", medicalRegistration: "", professionalIdCard: "" })
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        Invitar clínico
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-tertiary/10 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral">Nombre completo *</span>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Correo *</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Profesión *</span>
          <select
            value={form.profession}
            onChange={(e) => update("profession", e.target.value as InviteStaffInput["profession"])}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="medico">Médico/a</option>
            <option value="enfermero">Enfermero/a</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Especialidad (opcional)</span>
          <input
            type="text"
            value={form.specialty ?? ""}
            onChange={(e) => update("specialty", e.target.value)}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Registro médico (opcional)</span>
          <input
            type="text"
            value={form.medicalRegistration ?? ""}
            onChange={(e) => update("medicalRegistration", e.target.value)}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral">Tarjeta profesional (opcional)</span>
          <input
            type="text"
            value={form.professionalIdCard ?? ""}
            onChange={(e) => update("professionalIdCard", e.target.value)}
            className="mt-1 w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
      {success && <p className="text-sm text-success">{success}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar invitación"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-tertiary/20 px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Verificación manual end-to-end**

```bash
npm run dev
```

Login como admin. Navega a `/admin/personal`. Expected:
- Botón "Invitar clínico" visible
- Tabla vacía (o con admins existentes)

Click "Invitar clínico", llena el form con un email de prueba real (al que tengas acceso), envía. Expected:
- Mensaje "Invitación enviada"
- El nuevo staff aparece en la tabla con estado "Activo"
- Recibes email de Supabase con magic link

Toggle "Activo" → debe pasar a "Inactivo" sin recargar.

- [ ] **Step 5: Verificación negativa — clínico no puede acceder**

Login con la cuenta de prueba (vía magic link). Expected:
- Sidebar muestra solo el grupo "Clínico" sin encabezados (porque solo hay un grupo)
- Si manualmente navegas a `/admin/personal`, te redirige a `/admin/clinico/dashboard`
- Si navegas a `/admin/convenios`, te redirige a `/admin/clinico/dashboard`
- Puedes ver `/admin/pacientes`

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/admin/personal/page.tsx src/components/admin/StaffList.tsx src/components/admin/InviteStaffForm.tsx src/app/(admin)/admin/personal/actions.ts
git commit -m "feat(admin): add staff management page with invite and toggle-active flows"
```

---

## Task 9: Permitir clínicos en clinical actions + auditoría

**Files:**
- Modify: `src/lib/clinical/actions.ts`

**Contexto:** el archivo tiene un guard `assertAdmin()` que exige `role === "admin"`. Bloquea a los clínicos. Hay que reemplazarlo por un guard que admita admin **o** clínico activo. `saveAssessment()` ya setea `created_by: adminUser.id` — eso se conserva (la variable se renombra). La tabla `patient_assessments` es append-only (no hay función de update), así que `last_modified_by`/`at` quedan disponibles pero sin uso ahora — los usará el Plan 4/6 si llegamos a editar evaluaciones.

- [ ] **Step 1: Reemplazar `assertAdmin` por `assertStaff` y reusarlo**

En `src/lib/clinical/actions.ts`, reemplaza el bloque actual de la función guard (líneas 23–30 hoy) por:

```typescript
async function assertStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthorized")
  const { data: profile } = await supabase
    .from("users")
    .select("role, is_active")
    .eq("id", user.id)
    .single()
  if (!profile || !profile.is_active) throw new Error("forbidden")
  if (profile.role !== "admin" && profile.role !== "clinico") throw new Error("forbidden")
  return user
}
```

Luego, **renombra todas las llamadas internas** de `assertAdmin()` a `assertStaff()` en el mismo archivo. Actualmente hay dos:
- En `saveAssessment` (`const adminUser = await assertAdmin()` → `const staffUser = await assertStaff()`)
- En `upsertClinicalProfile` (`await assertAdmin()` → `await assertStaff()`)

Y dentro de `saveAssessment`, donde dice `created_by: adminUser.id`, cámbialo a `created_by: staffUser.id`.

- [ ] **Step 2: Verificar que saveAssessment guarda el created_by correcto**

El insert ya tiene `created_by: staffUser.id`. No hay update de assessments — la tabla es append-only — así que `last_modified_by`/`last_modified_at` quedan vacíos. Esto está bien.

Agrega un comentario corto justo antes del insert:

```typescript
// patient_assessments es append-only: solo se setea created_by.
// last_modified_by/at existen para futuros casos de edición.
const { data: inserted, error } = await supabase
  .from("patient_assessments")
  .insert({
    ...
```

- [ ] **Step 3: Verificar tipos**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npx tsc --noEmit
```

Expected: sin errores.

- [ ] **Step 4: Verificación manual con un clínico**

```bash
npm run dev
```

Login con la cuenta clínica creada en Task 8. Navega a `/admin/pacientes`, abre un paciente y guarda una evaluación de salud nueva. Expected: la evaluación se guarda sin error.

Verifica en Supabase SQL Editor:

```sql
select id, created_by, last_modified_by, created_at, last_modified_at
from public.patient_assessments
order by created_at desc limit 3;
```

Expected: la última fila tiene `created_by` = id del clínico, `last_modified_by` y `last_modified_at` NULL.

- [ ] **Step 5: Verificación de regresión — admin sigue funcionando**

Login como admin, guarda otra evaluación. Verifica que `created_by` ahora sea el id del admin.

- [ ] **Step 6: Commit**

```bash
git add src/lib/clinical/actions.ts
git commit -m "feat(clinical): allow clinico role to save assessments and update profile"
```

---

## Task 10: Verificación end-to-end

- [ ] **Step 1: Build limpio**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run build
```

Expected: build exitoso sin errores ni warnings críticos.

- [ ] **Step 2: Smoke test admin**

`npm run dev`, login como admin. Verifica:
- Sidebar muestra los 3 grupos con sus items
- Cada link funciona (Dashboard, Contenido, Blog, Convenios, Códigos, Personal, Dashboard clínico, Pacientes)
- `/admin/personal` carga, lista staff existente, permite invitar y toggle activo
- `/admin/clinico/dashboard` muestra el placeholder

- [ ] **Step 3: Smoke test clínico**

Login con cuenta clínica creada en Task 8. Verifica:
- Sidebar muestra solo "Dashboard clínico" y "Pacientes" (sin encabezado porque es el único grupo)
- Badge dice "Clínico"
- `/admin` redirige a `/admin/clinico/dashboard`
- `/admin/personal`, `/admin/convenios`, `/admin/codigos`, `/admin/contenido`, `/admin/blog` redirigen a `/admin/clinico/dashboard`
- `/admin/pacientes` carga normalmente
- Crear una evaluación funciona y queda con `created_by` = id del clínico

- [ ] **Step 4: Smoke test paciente regular (régression check)**

Login como un usuario `patient` existente. Verifica:
- Va a `/mi-camino` (su flujo normal)
- Si manualmente navega a `/admin`, redirige a `/mi-camino`

- [ ] **Step 5: Commit final del plan**

```bash
git add -A
git commit --allow-empty -m "chore: complete admin restructure foundation (plan 1)"
```

---

## Notas para próximos planes

- **Plan 3 (firma PDF)**: usar `created_by` (no `last_modified_by`) y `staff_profiles` (alias mental para `users` con rol staff). Los datos para la firma están en las columnas `name`, `profession`, `specialty`, `medical_registration`, `professional_id_card`.
- **Plan 4 (Excel)**: la columna 2 "Profesional responsable" hace JOIN de `patient_assessments.created_by` con `users.name`. Cuando es NULL → string `"Auto-diligenciado"`.
- **Plan 6 (dashboard clínico)**: los filtros "médico responsable" hacen JOIN con `users` filtrando `role in ('admin','clinico')`.
- **Decisión arquitectural anotada:** en lugar de tabla `staff_profiles` separada, extendimos `public.users` con columnas profesionales nullable. Si en el futuro la tabla crece o queremos auth de personal independiente del de pacientes, vale la pena reconsiderar.

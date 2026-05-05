# Agendamiento — Plan 5: Casos límite y auditoría

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los casos límite del sistema: re-asignación automática de citas cuando un clínico se desactiva (con fallback a "huérfana" si no hay reemplazo), modal para que el admin reasigne manualmente a otro clínico cualquier cita, banners de alerta en el dashboard admin, y vista de auditoría para revisar acciones críticas.

**Architecture:** Un trigger SQL en `users` (en cambios `is_active true→false` para clínicos) itera las citas futuras del clínico y las intenta mover automáticamente con `pick_least_loaded_clinician()`. Las que no encuentran reemplazo quedan "huérfanas" (status sigue `scheduled`, `clinician_id` apunta al inactivo) y el admin las ve en un banner. El admin tiene un nuevo modal "Reasignar clínico" + botón "Desactivar clínico" en `/admin/personal`. El audit log se visualiza en `/admin/auditoria`.

**Tech Stack:** Next.js 16 + Supabase + Tailwind 4 + date-fns + Vitest. **Sin nuevas deps.**

**Spec:** [`docs/superpowers/specs/2026-05-04-agendamiento-evaluaciones-design.md`](../specs/2026-05-04-agendamiento-evaluaciones-design.md)
**Plan anterior:** [Plan 4 — Notificaciones](./2026-05-05-agendamiento-plan-4-notificaciones.md)

**Estado al iniciar Plan 5:**
- Plans 1-4 mergeados a main ✓
- Trigger genérico `handle_updated_at` existe (lo reutilizamos como referencia, no tocamos)
- Función SQL `pick_least_loaded_clinician(slot)` existe ✓
- Tabla `audit_log` existe con `actor_id, action, target_type, target_id, metadata` ✓
- Triggers de notificación de Plan 4 (`notifyBookingCreated`, etc.) disponibles ✓
- 23 unit tests pasando ✓

**Convenciones:**
- En user-facing copy: "evaluación de salud", nunca "historia clínica".
- Server actions: `"use server"` + `getCurrentProfile()` + `isAdmin()`, retornan `{ ok: true } | { ok: false; error }`.
- Audit log siempre escrito desde acciones críticas; el actor es el admin que disparó la operación, EXCEPTO los inserts del trigger SQL que usan `actor_id = NULL` (por convención: "sistema").

**Cambio importante para audit_log:** la columna `actor_id` actualmente es `NOT NULL`. Plan 5 la relaja para permitir entries del sistema. Lo hacemos en la migración v11.

---

## File Structure

**Crear:**

SQL:
- `supabase/migration-v11-clinician-deactivation.sql` — trigger + función auto-reassignment, relax `audit_log.actor_id` a NULL.

Backend:
- `src/lib/scheduling/post-deactivation-notify.ts` — helper que lee audit_log de eventos recién creados por el trigger y dispara notificaciones via triggers.ts existente.
- `src/lib/scheduling/admin-alerts.ts` — query para banners del dashboard (citas huérfanas, créditos sin disponibilidad).

Server actions:
- `src/app/(admin)/admin/personal/actions.ts` (modify) — agregar `deactivateClinicianAction(id)`.
- `src/app/(admin)/admin/citas/calendario/actions.ts` (modify) — agregar `reassignClinicianAction({ appointmentId, newClinicianId })`.

UI:
- `src/components/admin/DeactivateClinicianButton.tsx` — botón con confirm en `/admin/personal`.
- `src/components/admin/ReassignClinicianModal.tsx` — modal con dropdown de clínicos activos.
- `src/components/admin/DashboardAlerts.tsx` — server component embebible en `/admin` que muestra los banners.
- `src/app/(admin)/admin/auditoria/page.tsx` — server component, tabla read-only del audit_log.
- `src/components/admin/AuditLogTable.tsx` — client component con filtros (acción, target_type, fecha).

Modify:
- `src/app/(admin)/admin/page.tsx` — embebir `<DashboardAlerts />` cerca del top.
- `src/components/admin/CitaDrawerAdmin.tsx` — agregar botón "Reasignar a otro clínico" + wire al nuevo modal.
- `src/components/admin/StaffList.tsx` (si existe) o donde sea que listamos clínicos en /admin/personal — agregar el `DeactivateClinicianButton`.
- `src/components/admin/AdminShell.tsx` — agregar "Auditoría" en grupo "Sistema".

---

## Task 1 — Migración v11 (trigger + audit_log relax)

**Files:**
- Create: `supabase/migration-v11-clinician-deactivation.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- ============================================
-- v11 — CLINICIAN DEACTIVATION TRIGGER + AUDIT
-- ============================================

-- 1. Relax audit_log.actor_id para permitir entries del sistema (trigger SQL).
alter table public.audit_log alter column actor_id drop not null;

-- 2. Función que se ejecuta cuando un clínico se desactiva (is_active true→false).
--    Itera sus citas futuras 'scheduled' e intenta reasignarlas via
--    pick_least_loaded_clinician(slot). Las que no encuentran reemplazo
--    quedan con clinician_id apuntando al inactivo (huérfanas).
--    Cada caso registra audit_log para que el admin las pueda ver/notificar.

create or replace function public.handle_clinician_deactivation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cita record;
  new_clinician uuid;
begin
  -- Solo nos interesa la transición true → false en clínicos
  if not (old.is_active = true and new.is_active = false and new.role = 'clinico') then
    return new;
  end if;

  for cita in
    select id, starts_at
    from public.appointments
    where clinician_id = new.id
      and status = 'scheduled'
      and starts_at >= now()
  loop
    -- Intentar encontrar reemplazo
    new_clinician := public.pick_least_loaded_clinician(cita.starts_at);

    if new_clinician is not null and new_clinician <> new.id then
      -- Reasignar
      update public.appointments
      set clinician_id = new_clinician,
          reminder_24h_sent_at = null,
          reminder_1h_sent_at = null
      where id = cita.id;

      insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
      values (
        null,                                            -- 'sistema'
        'clinician_auto_reassigned',
        'appointment',
        cita.id,
        jsonb_build_object(
          'old_clinician_id', new.id,
          'new_clinician_id', new_clinician,
          'starts_at', cita.starts_at
        )
      );
    else
      -- No hay reemplazo: marcar como huérfana en audit (la cita queda como está)
      insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
      values (
        null,
        'clinician_orphaned_appointment',
        'appointment',
        cita.id,
        jsonb_build_object(
          'old_clinician_id', new.id,
          'starts_at', cita.starts_at
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

-- 3. Trigger after update on users — solo dispara cuando is_active cambia
drop trigger if exists on_clinician_deactivated on public.users;
create trigger on_clinician_deactivated
  after update of is_active on public.users
  for each row
  when (old.is_active is distinct from new.is_active)
  execute function public.handle_clinician_deactivation();
```

- [ ] **Step 2: Aplicar manualmente en Supabase SQL Editor.**

Pegar el contenido completo y ejecutar. Verificación:
```sql
select tgname from pg_trigger where tgname = 'on_clinician_deactivated';
-- expected: 1 fila

select column_name, is_nullable from information_schema.columns
where table_name = 'audit_log' and column_name = 'actor_id';
-- expected: is_nullable = 'YES'
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migration-v11-clinician-deactivation.sql
git commit -m "feat(scheduling): v11 migration — clinician deactivation trigger with auto-reassignment"
```

---

## Task 2 — Helper de notificaciones post-desactivación

**Files:**
- Create: `src/lib/scheduling/post-deactivation-notify.ts`

Cuando el admin desactiva un clínico, el trigger SQL hace la reasignación pero no puede mandar emails. Este helper se llama después de la desactivación, lee los audit_log entries que el trigger generó, y dispara notificaciones via Plan 4.

- [ ] **Step 1: Crear el módulo**

```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyBookingCreated } from "@/lib/notifications/triggers"

interface ReassignmentEvent {
  appointment_id: string
  new_clinician_id: string
  patient_id: string
  starts_at: string
}

interface OrphanEvent {
  appointment_id: string
  starts_at: string
}

export interface DeactivationOutcome {
  reassignedCount: number
  orphanedCount: number
}

/**
 * Lee los audit_log entries generados por el trigger handle_clinician_deactivation
 * para un clínico desactivado en los últimos 60 segundos, y dispara notificaciones
 * a los clínicos nuevos asignados.
 *
 * No lanza errores: si una notificación falla, loggea y continúa.
 */
export async function notifyAfterDeactivation(deactivatedClinicianId: string): Promise<DeactivationOutcome> {
  const admin = createAdminClient()

  // Buscar audit entries muy recientes (últimos 60s) generados por el trigger para este clínico
  const cutoff = new Date(Date.now() - 60 * 1000).toISOString()

  const { data: entries } = await admin
    .from("audit_log")
    .select("action, target_id, metadata, created_at")
    .in("action", ["clinician_auto_reassigned", "clinician_orphaned_appointment"])
    .eq("target_type", "appointment")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })

  const reassigned: ReassignmentEvent[] = []
  const orphaned: OrphanEvent[] = []

  for (const e of entries ?? []) {
    const meta = e.metadata as any
    if (meta?.old_clinician_id !== deactivatedClinicianId) continue

    if (e.action === "clinician_auto_reassigned" && meta?.new_clinician_id) {
      // Necesitamos el patient_id; lo leemos de appointments
      const { data: apt } = await admin
        .from("appointments")
        .select("patient_id")
        .eq("id", e.target_id)
        .maybeSingle()
      if (apt) {
        reassigned.push({
          appointment_id: e.target_id,
          new_clinician_id: meta.new_clinician_id,
          patient_id: apt.patient_id,
          starts_at: meta.starts_at,
        })
      }
    } else if (e.action === "clinician_orphaned_appointment") {
      orphaned.push({
        appointment_id: e.target_id,
        starts_at: meta.starts_at,
      })
    }
  }

  // Notificar al nuevo clínico (mensaje + email) por cada reasignación.
  // Reutilizamos notifyBookingCreated — desde el punto de vista del nuevo clínico,
  // es esencialmente "te asignaron una cita nueva".
  for (const r of reassigned) {
    try {
      await notifyBookingCreated({
        patientId: r.patient_id,
        clinicianId: r.new_clinician_id,
        startsAtIso: r.starts_at,
      })
    } catch (e) {
      console.error("[post-deactivation] notify failed:", e, { appointment: r.appointment_id })
    }
  }

  return {
    reassignedCount: reassigned.length,
    orphanedCount: orphaned.length,
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/scheduling/post-deactivation-notify.ts
git commit -m "feat(scheduling): add post-deactivation notification helper"
```

---

## Task 3 — Server action: desactivar clínico

**Files:**
- Modify: `src/app/(admin)/admin/personal/actions.ts`

- [ ] **Step 1: Agregar `deactivateClinicianAction` al final del archivo**

```typescript
import { notifyAfterDeactivation, type DeactivationOutcome } from "@/lib/scheduling/post-deactivation-notify"

export async function deactivateClinicianAction(
  clinicianId: string,
): Promise<{ ok: true; outcome: DeactivationOutcome } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  const supabase = createAdminClient()

  // Verificar que es un clínico activo
  const { data: target, error: readErr } = await supabase
    .from("users")
    .select("id, role, is_active, name")
    .eq("id", clinicianId)
    .single()
  if (readErr || !target) return { ok: false, error: "Usuario no encontrado" }
  if (target.role !== "clinico") return { ok: false, error: "El usuario no es un clínico" }
  if (!target.is_active) return { ok: false, error: "El clínico ya está inactivo" }

  // Flip is_active=false. El trigger SQL hace la reasignación + audit log.
  const { error: updErr } = await supabase
    .from("users")
    .update({ is_active: false })
    .eq("id", clinicianId)
  if (updErr) return { ok: false, error: `Error desactivando: ${updErr.message}` }

  // Audit del admin (separado de los entries del trigger, que tienen actor_id=null)
  await supabase.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_deactivate_clinician",
    target_type: "user",
    target_id: clinicianId,
    metadata: { name: target.name },
  })

  // Disparar notificaciones para los clínicos a los que se les asignaron citas
  let outcome: DeactivationOutcome
  try {
    outcome = await notifyAfterDeactivation(clinicianId)
  } catch (e) {
    console.error("[deactivate clinician] post-notify failed:", e)
    outcome = { reassignedCount: 0, orphanedCount: 0 }
  }

  revalidatePath("/admin/personal")
  revalidatePath("/admin/citas")
  revalidatePath("/admin")
  return { ok: true, outcome }
}
```

- [ ] **Step 2: Verificar que `createAdminClient` y otros imports ya están**

El archivo ya tiene los imports necesarios (`createAdminClient`, `getCurrentProfile`, `isAdmin`, `revalidatePath`). Solo agrega el import nuevo de `notifyAfterDeactivation`.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/personal/actions.ts"
git commit -m "feat(scheduling): add deactivateClinicianAction with post-trigger notify"
```

---

## Task 4 — Botón "Desactivar" en /admin/personal

**Files:**
- Create: `src/components/admin/DeactivateClinicianButton.tsx`
- Modify: `src/components/admin/StaffList.tsx` (or wherever the existing /admin/personal table lives)

- [ ] **Step 1: Crear `DeactivateClinicianButton.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deactivateClinicianAction } from "@/app/(admin)/admin/personal/actions"

interface Props {
  clinicianId: string
  clinicianName: string
}

export default function DeactivateClinicianButton({ clinicianId, clinicianName }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const res = await deactivateClinicianAction(clinicianId)
      if (res.ok) {
        const { reassignedCount, orphanedCount } = res.outcome
        let summary = `Clínico desactivado.`
        if (reassignedCount > 0) summary += ` ${reassignedCount} cita(s) reasignada(s) automáticamente.`
        if (orphanedCount > 0) summary += ` ${orphanedCount} cita(s) huérfana(s) requieren resolución manual (revisa el dashboard).`
        alert(summary)
        setConfirmOpen(false)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
      >
        Desactivar
      </button>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-neutral mb-2">Desactivar clínico</h2>
            <p className="text-sm text-tertiary mb-4">
              Vas a desactivar a <strong className="text-neutral">{clinicianName}</strong>. El sistema intentará reasignar automáticamente sus citas futuras a otros clínicos disponibles. Las que no encuentren reemplazo quedarán como "huérfanas" y aparecerán en el dashboard para que las resuelvas manualmente.
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={pending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Desactivando..." : "Confirmar desactivación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Localizar dónde se lista cada clínico en /admin/personal y agregar el botón**

Read `src/components/admin/StaffList.tsx`. Buscar la fila de cada `staff` con `staff.role === "clinico"`. En la columna de acciones (donde está el toggle existente, probablemente `UserAccessToggle`), agregar **al lado** el botón:

```tsx
{staff.role === "clinico" && staff.is_active && (
  <DeactivateClinicianButton clinicianId={staff.id} clinicianName={staff.name} />
)}
```

(Si la estructura del archivo es muy distinta, adapta — el principio es: solo aparecer si el staff es clínico activo.)

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/admin/DeactivateClinicianButton.tsx src/components/admin/StaffList.tsx
git commit -m "feat(scheduling): add Desactivar clinico button in /admin/personal"
```

---

## Task 5 — Server action + modal: reasignar clínico de una cita

**Files:**
- Modify: `src/app/(admin)/admin/citas/calendario/actions.ts`
- Create: `src/components/admin/ReassignClinicianModal.tsx`
- Modify: `src/components/admin/CitaDrawerAdmin.tsx` (añade botón + wire del modal)

- [ ] **Step 1: Agregar `reassignClinicianAction` al final de `calendario/actions.ts`**

```typescript
export async function reassignClinicianAction(input: {
  appointmentId: string
  newClinicianId: string
  reason: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) return { ok: false, error: "No autorizado" }

  if (!input.reason.trim()) return { ok: false, error: "Razón obligatoria" }

  const admin = createAdminClient()

  // 1. Validar cita activa
  const { data: existing, error: readErr } = await admin
    .from("appointments")
    .select("id, status, starts_at, patient_id, clinician_id")
    .eq("id", input.appointmentId)
    .single()
  if (readErr || !existing) return { ok: false, error: "Cita no encontrada" }
  if (existing.status !== "scheduled") return { ok: false, error: `Estado inválido: '${existing.status}'` }

  // 2. Validar nuevo clínico activo
  const { data: newClinico, error: cErr } = await admin
    .from("users").select("id, role, is_active").eq("id", input.newClinicianId).single()
  if (cErr || !newClinico) return { ok: false, error: "Clínico no encontrado" }
  if (newClinico.role !== "clinico" || !newClinico.is_active) {
    return { ok: false, error: "El usuario seleccionado no es un clínico activo" }
  }
  if (newClinico.id === existing.clinician_id) {
    return { ok: false, error: "Ese ya es el clínico de la cita" }
  }

  // 3. Update — UNIQUE constraint protege double-booking en el destino
  const { error: updErr } = await admin
    .from("appointments")
    .update({
      clinician_id: input.newClinicianId,
      reminder_24h_sent_at: null,
      reminder_1h_sent_at: null,
    })
    .eq("id", input.appointmentId)

  if (updErr) {
    return {
      ok: false,
      error: "Ese clínico ya tiene otra cita en ese horario. Elige otro o reagenda primero.",
    }
  }

  // 4. Audit
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_reassign_clinician",
    target_type: "appointment",
    target_id: input.appointmentId,
    metadata: {
      old_clinician_id: existing.clinician_id,
      new_clinician_id: input.newClinicianId,
      reason: input.reason.trim(),
    },
  })

  // 5. Notificar al nuevo clínico (best-effort)
  try {
    const { notifyBookingCreated } = await import("@/lib/notifications/triggers")
    await notifyBookingCreated({
      patientId: existing.patient_id,
      clinicianId: input.newClinicianId,
      startsAtIso: existing.starts_at,
    })
  } catch (e) {
    console.error("[reassign_clinician] notification failed:", e)
  }

  revalidatePath("/admin/citas")
  revalidatePath("/admin")
  return { ok: true }
}
```

- [ ] **Step 2: Crear `ReassignClinicianModal.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { reassignClinicianAction } from "@/app/(admin)/admin/citas/calendario/actions"

interface ClinicianOption {
  id: string
  name: string
}

interface Props {
  open: boolean
  onClose: () => void
  appointmentId: string
  currentClinicianId: string
  clinicians: ClinicianOption[]
  onSuccess: () => void
}

export default function ReassignClinicianModal({ open, onClose, appointmentId, currentClinicianId, clinicians, onSuccess }: Props) {
  const [newClinicianId, setNewClinicianId] = useState<string>("")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!newClinicianId) return setError("Selecciona un clínico")
    if (newClinicianId === currentClinicianId) return setError("Ese ya es el clínico actual")
    if (!reason.trim()) return setError("Razón obligatoria")

    startTransition(async () => {
      const res = await reassignClinicianAction({
        appointmentId,
        newClinicianId,
        reason: reason.trim(),
      })
      if (res.ok) {
        setNewClinicianId("")
        setReason("")
        onSuccess()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  // Excluir el clínico actual del dropdown
  const options = clinicians.filter((c) => c.id !== currentClinicianId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-neutral mb-1">Reasignar clínico</h2>
        <p className="mb-4 text-sm text-tertiary">
          La cita se moverá al nuevo clínico (misma fecha/hora). Los recordatorios se reenvían y al nuevo clínico le llega notificación.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-neutral">Nuevo clínico</label>
            <select
              value={newClinicianId}
              onChange={(e) => setNewClinicianId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Selecciona…</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-neutral">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="Ej: clínico se retiró, conflicto de horario detectado"
              className="mt-1 block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-tertiary hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {pending ? "Reasignando..." : "Confirmar reasignación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Modificar `CitaDrawerAdmin.tsx` para incluir el botón "Reasignar a otro clínico"**

El drawer actual tiene 4 botones (completar, reagendar, no-show, cancelar). Agregamos un 5to botón "Reasignar a otro clínico" justo después de "Reagendar". El drawer NO tiene la lista de clínicos disponibles — los pasamos como prop nueva.

**Cambio 1**: Actualizar la interfaz `Props` del componente para recibir `clinicians`:

Buscar:
```tsx
interface Props {
  appointment: AppointmentWithJoin | null
  onClose: () => void
  onChanged: () => void
}
```

Reemplazar por:
```tsx
interface ClinicianOption { id: string; name: string }

interface Props {
  appointment: AppointmentWithJoin | null
  clinicians: ClinicianOption[]
  onClose: () => void
  onChanged: () => void
}
```

Y la firma del componente:
```tsx
export default function CitaDrawerAdmin({ appointment, clinicians, onClose, onChanged }: Props) {
```

**Cambio 2**: Agregar import y state nuevo:

```tsx
import ReassignClinicianModal from "./ReassignClinicianModal"

// dentro del componente, junto a los otros useState:
const [showReassign, setShowReassign] = useState(false)
```

**Cambio 3**: Agregar el botón después de "Reagendar":

Buscar:
```tsx
<button
  type="button"
  onClick={() => setShowReschedule(true)}
  className="block w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
>
  Reagendar
</button>
```

Insertar **inmediatamente después**:
```tsx
<button
  type="button"
  onClick={() => setShowReassign(true)}
  className="block w-full rounded-lg border border-primary/30 bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
>
  Reasignar a otro clínico
</button>
```

**Cambio 4**: Agregar el modal al final del JSX (después de los otros modales):

```tsx
<ReassignClinicianModal
  open={showReassign}
  onClose={() => setShowReassign(false)}
  appointmentId={appointment.id}
  currentClinicianId={appointment.clinician_id}
  clinicians={clinicians}
  onSuccess={onChanged}
/>
```

- [ ] **Step 4: Modificar consumidores del drawer para pasar `clinicians`**

Los archivos `CitasCalendarPageClient.tsx` y `CitasTable.tsx` actualmente usan `<CitaDrawerAdmin appointment={...} onClose={...} onChanged={...} />`. Hay que pasar `clinicians`.

`CitasCalendarPageClient.tsx`: ya recibe `clinicians` como prop (Plan 4 lo agregó para el modal de crear cita manual). Solo pásalo al drawer:
```tsx
<CitaDrawerAdmin
  appointment={selected}
  clinicians={clinicians}
  onClose={() => setSelected(null)}
  onChanged={handleChanged}
/>
```

`CitasTable.tsx`: este componente no recibía `clinicians`. Hay 2 opciones:
- Pasar también como prop (requiere cambiar la firma de `CitasTable` y de su page parent)
- Hacer un fetch local del listado de clínicos

Más limpio: pasar como prop. Modifica:

```tsx
// firma de CitasTable
export default function CitasTable({ rows, clinicians }: { rows: AppointmentWithJoin[]; clinicians: { id: string; name: string }[] }) {
```

```tsx
// donde renderiza el drawer
<CitaDrawerAdmin
  appointment={selected}
  clinicians={clinicians}
  onClose={() => setSelected(null)}
  onChanged={() => { setSelected(null); router.refresh() }}
/>
```

Y en `src/app/(admin)/admin/citas/tabla/page.tsx` ya cargamos `clinicians` (lo hicimos en Plan 3). Pasa al render:

```tsx
<CitasTable rows={rows} clinicians={clinicians} />
```

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/citas/calendario/actions.ts" \
        src/components/admin/ReassignClinicianModal.tsx \
        src/components/admin/CitaDrawerAdmin.tsx \
        src/components/admin/CitasCalendarPageClient.tsx \
        src/components/admin/CitasTable.tsx \
        "src/app/(admin)/admin/citas/tabla/page.tsx"
git commit -m "feat(scheduling): admin can reassign clinician for any active appointment"
```

---

## Task 6 — Helper de alertas + componente de banners en /admin

**Files:**
- Create: `src/lib/scheduling/admin-alerts.ts`
- Create: `src/components/admin/DashboardAlerts.tsx`
- Modify: `src/app/(admin)/admin/page.tsx`

- [ ] **Step 1: Crear `admin-alerts.ts`**

```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import { addDays } from "date-fns"
import { computeAvailableSlots } from "./slots"

export interface AdminAlerts {
  orphanedCount: number
  patientsWithCreditsAndNoSlots: number
}

/**
 * Genera el resumen de alertas para el dashboard admin.
 * - Citas huérfanas: status='scheduled' y clinician inactive.
 * - Pacientes con créditos pero sin slots: paciente con remaining>0,
 *   sin appointment activo, Y el sistema no tiene slots disponibles
 *   en los próximos 30 días (chequeo simple — si no hay slots GLOBAL,
 *   todos los pacientes con créditos están bloqueados).
 */
export async function getAdminAlerts(): Promise<AdminAlerts> {
  const admin = createAdminClient()

  // 1. Citas huérfanas — clínico inactivo y status scheduled
  const { data: orphaned } = await admin
    .from("appointments")
    .select("id, users!clinician_id(is_active)")
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())

  const orphanedCount = (orphaned ?? []).filter((row: any) => row.users?.is_active === false).length

  // 2. Pacientes con créditos sin disponibilidad — chequeo aproximado:
  //    Si computeAvailableSlots devuelve vacío en los próximos 30d,
  //    entonces TODOS los pacientes con créditos están bloqueados.
  let patientsWithCreditsAndNoSlots = 0
  const now = new Date()
  const slotsByDay = await computeAvailableSlots(now, addDays(now, 30), now)
  const hasAnySlot = Object.keys(slotsByDay).length > 0

  if (!hasAnySlot) {
    // Contar pacientes con créditos > 0 y SIN cita activa
    const { data: creditsData } = await admin
      .from("evaluation_credits")
      .select("patient_id, remaining")
      .gt("remaining", 0)
    const patientsWithCredits = new Set((creditsData ?? []).map((r: any) => r.patient_id))

    const { data: activeApts } = await admin
      .from("appointments")
      .select("patient_id")
      .eq("status", "scheduled")
      .gte("starts_at", now.toISOString())
    const patientsWithActive = new Set((activeApts ?? []).map((r: any) => r.patient_id))

    patientsWithCreditsAndNoSlots = [...patientsWithCredits].filter((p) => !patientsWithActive.has(p)).length
  }

  return { orphanedCount, patientsWithCreditsAndNoSlots }
}
```

- [ ] **Step 2: Crear `DashboardAlerts.tsx`**

```tsx
import Link from "next/link"
import { getAdminAlerts } from "@/lib/scheduling/admin-alerts"

export default async function DashboardAlerts() {
  const alerts = await getAdminAlerts()
  const items: { kind: "danger" | "warning"; message: React.ReactNode }[] = []

  if (alerts.orphanedCount > 0) {
    items.push({
      kind: "danger",
      message: (
        <>
          <strong>{alerts.orphanedCount} cita(s) huérfana(s)</strong> requieren reasignación manual (clínico desactivado).{" "}
          <Link href="/admin/citas/tabla?estado=scheduled" className="underline font-medium">
            Ver tabla de citas
          </Link>
        </>
      ),
    })
  }

  if (alerts.patientsWithCreditsAndNoSlots > 0) {
    items.push({
      kind: "warning",
      message: (
        <>
          <strong>{alerts.patientsWithCreditsAndNoSlots} paciente(s) con créditos</strong> sin disponibilidad en los próximos 30 días. Considera abrir más horarios.
        </>
      ),
    })
  }

  if (items.length === 0) return null

  return (
    <section className="space-y-2 mb-6">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-xl border px-4 py-3 text-sm ${
            item.kind === "danger"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {item.message}
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 3: Embedar en `/admin/page.tsx`**

Read `src/app/(admin)/admin/page.tsx` para encontrar el lugar adecuado. Buscar el primer JSX (`return (...)`) y agregar `<DashboardAlerts />` cerca del top, antes del contenido principal:

```tsx
import DashboardAlerts from "@/components/admin/DashboardAlerts"

// ...dentro del return:
return (
  <div className="space-y-6 p-6">
    <DashboardAlerts />
    {/* ...resto del contenido existente... */}
  </div>
)
```

(Adapta a la estructura existente — el principio: que sea lo primero o casi lo primero que ve el admin al entrar a `/admin`.)

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/scheduling/admin-alerts.ts src/components/admin/DashboardAlerts.tsx "src/app/(admin)/admin/page.tsx"
git commit -m "feat(scheduling): add admin dashboard alerts (orphans + no-slots)"
```

---

## Task 7 — Página /admin/auditoria

**Files:**
- Create: `src/app/(admin)/admin/auditoria/page.tsx`
- Create: `src/components/admin/AuditLogTable.tsx`
- Modify: `src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Crear el server component**

```tsx
import { redirect } from "next/navigation"
import { getCurrentProfile, isAdmin } from "@/lib/auth/profile"
import { createAdminClient } from "@/lib/supabase/admin"
import AuditLogTable from "@/components/admin/AuditLogTable"

export const dynamic = "force-dynamic"

interface SearchParams {
  action?: string
  target_type?: string
  page?: string
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const profile = await getCurrentProfile()
  if (!isAdmin(profile)) redirect("/admin")

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const limit = 50
  const offset = (page - 1) * limit

  const admin = createAdminClient()
  let query = admin
    .from("audit_log")
    .select("*, actor:users!actor_id(name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (sp.action) query = query.eq("action", sp.action)
  if (sp.target_type) query = query.eq("target_type", sp.target_type)

  const { data, count } = await query

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    actor_id: r.actor_id,
    actor_name: r.actor?.name ?? (r.actor_id ? "(usuario eliminado)" : "(sistema)"),
    actor_email: r.actor?.email ?? null,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    metadata: r.metadata,
    created_at: r.created_at,
  }))

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Auditoría</h1>
        <p className="text-sm text-tertiary">
          Registro de acciones críticas del sistema. Solo lectura.
        </p>
      </header>

      <AuditLogTable rows={rows} totalCount={count ?? 0} page={page} pageSize={limit} />
    </div>
  )
}
```

- [ ] **Step 2: Crear `AuditLogTable.tsx`**

```tsx
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

export interface AuditRow {
  id: string
  actor_id: string | null
  actor_name: string
  actor_email: string | null
  action: string
  target_type: string
  target_id: string
  metadata: any
  created_at: string
}

const ACTION_LABEL: Record<string, string> = {
  manual_payment: "Pago manual registrado",
  adjust_credit: "Ajuste de créditos",
  patient_booked_appointment: "Paciente agendó cita",
  admin_create_manual_appointment: "Admin creó cita manual",
  admin_cancel_appointment: "Admin canceló cita",
  admin_mark_completed: "Cita marcada completada",
  admin_mark_no_show: "Cita marcada no-show",
  admin_reschedule_appointment: "Admin reagendó cita",
  admin_reassign_clinician: "Admin reasignó clínico",
  admin_deactivate_clinician: "Admin desactivó clínico",
  clinician_auto_reassigned: "Sistema reasignó cita (auto)",
  clinician_orphaned_appointment: "Cita huérfana (clínico inactivo)",
}

const TARGET_LABEL: Record<string, string> = {
  appointment: "Cita",
  payment: "Pago",
  evaluation_credit: "Crédito",
  user: "Usuario",
}

interface Props {
  rows: AuditRow[]
  totalCount: number
  page: number
  pageSize: number
}

export default function AuditLogTable({ rows, totalCount, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  function setFilter(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null || value === "") next.delete(key)
    else next.set(key, value)
    next.delete("page")
    router.push(`${pathname}?${next.toString()}`)
  }

  function gotoPage(p: number) {
    const next = new URLSearchParams(params.toString())
    next.set("page", String(p))
    router.push(`${pathname}?${next.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 rounded-xl border border-tertiary/10 bg-white p-4">
        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Acción</span>
          <select
            value={params.get("action") ?? ""}
            onChange={(e) => setFilter("action", e.target.value || null)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {Object.keys(ACTION_LABEL).map((k) => (
              <option key={k} value={k}>{ACTION_LABEL[k]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-tertiary mb-1">Tipo de objeto</span>
          <select
            value={params.get("target_type") ?? ""}
            onChange={(e) => setFilter("target_type", e.target.value || null)}
            className="rounded-lg border border-tertiary/20 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {Object.keys(TARGET_LABEL).map((k) => (
              <option key={k} value={k}>{TARGET_LABEL[k]}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-tertiary/10 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-tertiary">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Cuándo</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Acción</th>
              <th className="px-4 py-3 text-left font-medium">Objeto</th>
              <th className="px-4 py-3 text-left font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-tertiary">Sin entradas.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-tertiary/10">
                  <td className="px-4 py-3 text-neutral whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral">{r.actor_name}</div>
                    {r.actor_email && <div className="text-xs text-tertiary">{r.actor_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-neutral">{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className="px-4 py-3 text-neutral">
                    <div>{TARGET_LABEL[r.target_type] ?? r.target_type}</div>
                    <div className="text-xs text-tertiary font-mono">{r.target_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-tertiary text-xs max-w-md">
                    <pre className="whitespace-pre-wrap break-words font-mono text-[10px]">{JSON.stringify(r.metadata, null, 2)}</pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-tertiary">
            Página {page} de {totalPages} · {totalCount} entradas
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => gotoPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => gotoPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-tertiary/20 px-3 py-1 text-xs disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Agregar "Auditoría" al sidebar admin (grupo "Sistema")**

Modificar `src/components/admin/AdminShell.tsx`. Buscar el grupo "Sistema" (que ya contiene "Configuración"). Agregar entrada después:

Buscar:
```tsx
{
  label: "Sistema",
  visibleTo: ["admin"],
  items: [
    { href: "/admin/configuracion", label: "Configuración", icon: settingsIcon },
  ],
},
```

Reemplazar por:
```tsx
{
  label: "Sistema",
  visibleTo: ["admin"],
  items: [
    { href: "/admin/configuracion", label: "Configuración", icon: settingsIcon },
    { href: "/admin/auditoria", label: "Auditoría", icon: settingsIcon },
  ],
},
```

(Reusa `settingsIcon`. Si quieres uno propio, agrega un `auditIcon` SVG; opcional.)

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/auditoria/page.tsx" \
        src/components/admin/AuditLogTable.tsx \
        src/components/admin/AdminShell.tsx
git commit -m "feat(scheduling): add /admin/auditoria audit log viewer"
```

---

## Task 8 — Verificación end-to-end manual

**Files:** ninguno

- [ ] **Step 1: Aplicar migración v11 en Supabase SQL Editor**

Pegar `supabase/migration-v11-clinician-deactivation.sql` y correr. Verificar:
```sql
select tgname from pg_trigger where tgname = 'on_clinician_deactivated';
-- expected: 1 fila
```

- [ ] **Step 2: Levantar dev server**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && npm run dev
```

- [ ] **Step 3: Probar reasignar clínico de una cita**

Login admin → `/admin/citas/calendario` → click en una cita scheduled → drawer → "Reasignar a otro clínico" → modal aparece con dropdown excluyendo al clínico actual → elige otro clínico → razón "test reasignación" → confirmar.

Verifica:
- Drawer se cierra (fix de Plan 3) y la cita aparece con el nuevo clínico.
- En SQL:
  ```sql
  select clinician_id, reminder_24h_sent_at, reminder_1h_sent_at
  from public.appointments where id = '<cita_uuid>';
  ```
  `clinician_id` es el nuevo. Reminders nullified.
- Audit log:
  ```sql
  select action, metadata from public.audit_log
  where action='admin_reassign_clinician' order by created_at desc limit 1;
  ```
- Email/mensaje al nuevo clínico (revisa email_log).

- [ ] **Step 4: Probar desactivación de clínico con reasignación auto**

Asegúrate de tener:
- 2 clínicos activos (digamos Clínico A y Clínico B), ambos con horarios configurados para el mismo día/hora.
- Una cita programada con Clínico A en una hora futura donde Clínico B también esté disponible.

Login admin → `/admin/personal` → fila del Clínico A → click "Desactivar" → modal confirma → "Confirmar desactivación".

Verifica:
- Aparece alerta del navegador con resumen ("X cita(s) reasignada(s) automáticamente. 0 huérfanas.").
- Clínico A ahora aparece como inactivo en `/admin/personal`.
- La cita ahora tiene `clinician_id` = Clínico B:
  ```sql
  select clinician_id from public.appointments where id = '<cita_uuid>';
  ```
- Audit log con dos entries:
  ```sql
  select action, actor_id, metadata from public.audit_log
  where action in ('admin_deactivate_clinician', 'clinician_auto_reassigned')
  order by created_at desc limit 5;
  ```
  Una con `actor_id` = admin, otra con `actor_id` = NULL (sistema).
- Email al nuevo clínico via email_log.

- [ ] **Step 5: Probar caso huérfana (sin reemplazo posible)**

Crea una cita con un clínico único (sin otros disponibles en ese horario). Desactiva ese clínico.

Verifica:
- Alert summary dice "X cita(s) huérfana(s) requieren resolución manual".
- En `/admin` ahora aparece el banner rojo "X cita(s) huérfana(s) requieren reasignación manual".
- Click "Ver tabla de citas" → te lleva a la tabla filtrada por scheduled. La cita huérfana sigue ahí con clinician_id = inactivo.
- Audit log entry `clinician_orphaned_appointment` con `actor_id = NULL`.

- [ ] **Step 6: Resolver una huérfana manualmente**

Click en la cita huérfana → drawer → "Reasignar a otro clínico" → activa otro clínico primero si es necesario (vuelve a `/admin/personal`, click "Desactivar" en revertido o re-activa via SQL si tu UI no lo soporta), o deja al admin como clínico de respaldo, etc. Lo importante es probar que la cita se puede salvar.

- [ ] **Step 7: Probar `/admin/auditoria`**

Click en "Auditoría" en el sidebar (grupo Sistema). Verifica:
- Tabla con todas las acciones de los últimos días.
- Filtro por acción → solo entries de esa acción.
- Filtro por tipo de objeto → solo "Cita" / "Pago" / etc.
- Paginación funciona si hay >50 entries.
- "Sistema" aparece en la columna actor para entries del trigger (`actor_id=null`).

- [ ] **Step 8: Probar banner de "sin disponibilidad"**

Borra todos los `clinician_schedules` (simula que ningún clínico está disponible). Asegúrate que algún paciente tenga créditos > 0 sin cita activa. Refresca `/admin`.

Verifica: aparece banner amarillo "X paciente(s) con créditos sin disponibilidad...".

- [ ] **Step 9: Detener dev server + correr tests**

```bash
npx tsc --noEmit && npm test
```

Expected: tsc clean, 23 tests pasando.

---

## Self-Review

- [ ] Spec sección "Clínico desactivado con citas futuras" — trigger reasigna automáticamente, audit log entries, alerta al admin si huérfanas ✓.
- [ ] Spec sección "Banners de alerta en /admin dashboard" — dos banners (huérfanas, créditos sin slots) ✓.
- [ ] Spec sección "Asignación paciente ↔ clínico (admin) — override manual" — modal "Reasignar clínico" agregado al drawer ✓.
- [ ] Audit log captura las 4 nuevas acciones: `admin_reassign_clinician`, `admin_deactivate_clinician`, `clinician_auto_reassigned`, `clinician_orphaned_appointment`.
- [ ] Página `/admin/auditoria` lista todo el historial con filtros.
- [ ] Notificación al nuevo clínico cuando hay reasignación (manual o auto).

---

## Resumen de lo que entrega Plan 5

✅ Migración v11: trigger SQL `on_clinician_deactivated` que reasigna citas automáticamente; relax `audit_log.actor_id` para entries del sistema.
✅ Botón "Desactivar" en `/admin/personal` con confirmación y resumen de outcome.
✅ Modal "Reasignar a otro clínico" en cualquier cita activa, con override manual.
✅ Banners en `/admin`: citas huérfanas + pacientes con créditos sin disponibilidad.
✅ Página `/admin/auditoria` con tabla filtrable y paginada.
✅ Notificaciones al clínico nuevo en ambos casos (manual y auto), via Plan 4 triggers.

❌ Wompi — Plan 6.
❌ Reactivación de clínicos (botón Activar) — el caso típico es alta de nuevo personal vía `/admin/personal` que ya existe; reactivación de un previamente desactivado es minoritario, no cubierto en este plan.

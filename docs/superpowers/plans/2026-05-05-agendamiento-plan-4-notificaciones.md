# Agendamiento — Plan 4: Notificaciones (in-platform + Resend + cron)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar todos los eventos del sistema (compra manual, agendamiento, cancelación, recordatorios automáticos) a notificaciones in-platform (mensajes del sistema) y email vía Resend, con dos cron jobs en Vercel para los recordatorios 24h y 1h.

**Architecture:** Un módulo `lib/notifications/` orquesta todo: `triggers.ts` define funciones tipadas por evento (ej. `notifyBookingCreated(args)`) que llaman tanto a `in-platform.ts` (insert en `messages` con `is_system=true`) como a `email.ts` (Resend + log en `email_log`). Cada acción del feature (book, cancel, manual_payment) llama a la trigger correspondiente. Los recordatorios se disparan desde dos endpoints `/api/cron/reminders-*` protegidos con `CRON_SECRET` que Vercel Cron invoca por horario fijo. Idempotencia via `reminder_*_sent_at` timestamps.

**Tech Stack:** Next.js 16 + Supabase + Resend + react-email components + date-fns + Vercel Cron. **Nuevas deps:** `resend`, `@react-email/components`, `@react-email/render`.

**Spec:** [`docs/superpowers/specs/2026-05-04-agendamiento-evaluaciones-design.md`](../specs/2026-05-04-agendamiento-evaluaciones-design.md)
**Plan anterior:** [Plan 3 — Vistas de calendario](./2026-05-05-agendamiento-plan-3-vistas-calendario.md)

**Estado al iniciar Plan 4:**
- Plan 3 mergeado a main ✓
- Tabla `messages` ya extendida con `is_system` y `message_kind` desde Plan 1 ✓
- Tabla `email_log` ya existe desde Plan 1 ✓
- Server actions de Plans 1-3 funcionan sin notificaciones (en este plan las cableamos) ✓

**Convenciones a respetar:**
- En user-facing copy: "evaluación de salud", nunca "historia clínica".
- Money en centavos en DB; UI muestra en COP usando helpers existentes.
- Fechas en `timestamptz` UTC; emails muestran en `America/Bogota` con `formatHumanDateTimeBogota`.
- Server actions retornan `{ ok: true } | { ok: false; error }`.
- **Notificaciones nunca deben fallar la acción de fondo.** Si una notificación falla, se loggea pero la acción (booking, cancel, etc) ya está commiteada.

**Decisión clave de privacidad:** El email del paciente NO incluye el nombre del clínico, alineado con el spec (decisión 5.b). El email del clínico SÍ incluye datos del paciente.

---

## File Structure

**Crear:**

SQL:
- `supabase/migration-v10-system-messages-rls.sql` — fix de RLS para permitir insert de `messages` con `is_system=true` por el service role.

Domain notifications:
- `src/lib/notifications/types.ts` — `MessageKind`, `EmailTemplateKey` enums.
- `src/lib/notifications/in-platform.ts` — `sendSystemMessage(toUserId, body, kind)`.
- `src/lib/notifications/email.ts` — `sendEmail()` wrapper que envía vía Resend y loggea en `email_log`.
- `src/lib/notifications/triggers.ts` — orquestador: `notifyBookingCreated`, `notifyAppointmentCancelled`, `notifyManualPaymentApproved`, `notifyReminder24h`, `notifyReminder1h`.

Email templates (react-email):
- `src/lib/notifications/templates/CaimedLayout.tsx` — shell común (logo, footer).
- `src/lib/notifications/templates/ManualPaymentApprovedEmail.tsx`
- `src/lib/notifications/templates/AppointmentBookedPatientEmail.tsx`
- `src/lib/notifications/templates/AppointmentBookedClinicianEmail.tsx`
- `src/lib/notifications/templates/AppointmentCancelledPatientEmail.tsx`
- `src/lib/notifications/templates/Reminder24hPatientEmail.tsx`
- `src/lib/notifications/templates/Reminder1hPatientEmail.tsx`
- `src/lib/notifications/templates/Reminder1hClinicianEmail.tsx`

Cron endpoints:
- `src/app/api/cron/reminders-24h/route.ts`
- `src/app/api/cron/reminders-1h/route.ts`

**Modificar:**
- `package.json` — agregar `resend`, `@react-email/components`, `@react-email/render` deps.
- `.env.example` — documentar `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `CRON_SECRET`.
- `vercel.json` — agregar 2 crons.
- `src/components/dashboard/MessageThread.tsx` — renderizar mensajes con `is_system=true` con estilo distinto.
- `src/components/admin/AdminMessageThread.tsx` — mismo render para admin.
- `src/app/(admin)/admin/citas/pagos/actions.ts` — llamar `notifyManualPaymentApproved` después de éxito.
- `src/app/(dashboard)/agendar/actions.ts` — llamar `notifyBookingCreated` después de éxito.
- `src/app/(admin)/admin/citas/calendario/actions.ts` — llamar `notifyAppointmentCancelled` después de éxito.

---

## Task 1 — Migración SQL v10: RLS fix para mensajes de sistema

**Files:**
- Create: `supabase/migration-v10-system-messages-rls.sql`

El review de Plan 1 identificó que la policy existente `"Users can send messages"` tiene `with check (auth.uid() = from_user_id)`. Cuando un mensaje de sistema se inserta con `from_user_id = NULL`, esta check falla. Lo arreglamos.

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- ============================================
-- v10 — RLS FIX: permitir system messages
-- ============================================

-- La policy actual rechaza inserts con from_user_id NULL (mensajes de sistema).
-- La actualizamos para que humanos sigan validando auth.uid()=from_user_id.
--
-- Los mensajes de sistema se insertan SOLO via service role (admin client),
-- que bypasea RLS. NO agregamos un branch para is_system=true porque cualquier
-- branch evaluable por sesiones autenticadas sería un vector para forjar
-- mensajes de sistema falsos desde el navegador con la anon key.

drop policy if exists "Users can send messages" on public.messages;

create policy "Users can send messages"
  on public.messages
  for insert
  with check (
    is_system = false
    and auth.uid() = from_user_id
  );
```

- [ ] **Step 2: Aplicar manualmente en Supabase SQL Editor.**

Esta migración es muy corta. **El usuario debe correrla en el SQL Editor de Supabase antes de hacer e2e**, igual que se hizo con v9 en Plan 1.

Verificación post-migración:
```sql
select policyname, with_check from pg_policies
where tablename = 'messages' and policyname = 'Users can send messages';
```
Expected: 1 fila con la nueva expresión.

- [ ] **Step 3: Commit (solo el archivo, no se aplica desde código)**

```bash
git add supabase/migration-v10-system-messages-rls.sql
git commit -m "feat(notifications): v10 migration — RLS fix for system messages"
```

---

## Task 2 — Instalar dependencias + actualizar `.env.example`

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Instalar deps**

```bash
cd "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes" && \
npm install --save resend @react-email/components @react-email/render
```

- [ ] **Step 2: Actualizar `.env.example`** agregando al final:

```
# Resend (transactional email)
RESEND_API_KEY=re_test_xxx
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_REPLY_TO=admin@your-domain.co

# Vercel Cron secret (genera uno random largo)
CRON_SECRET=replace-me-with-a-random-32-byte-hex-string
```

> **Nota para el usuario:** En `.env.local` debes agregar tu `RESEND_API_KEY` real (de https://resend.com/api-keys). Para desarrollo, `RESEND_FROM_EMAIL=onboarding@resend.dev` funciona sin verificar dominio (Resend solo entrega a la cuenta dueña del API key — perfecto para pruebas). En producción reemplazas por un email del dominio que verifiques en Resend.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore(notifications): add resend and react-email deps"
```

---

## Task 3 — Tipos compartidos + helper de mensajes in-platform

**Files:**
- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/in-platform.ts`

- [ ] **Step 1: Crear `types.ts`**

```typescript
/** Tipos de mensaje de sistema. El frontend usa esto para iconos / styling. */
export type MessageKind =
  | "manual_payment_approved"
  | "appointment_booked_patient"
  | "appointment_booked_clinician"
  | "appointment_cancelled_patient"
  | "reminder_24h_patient"
  | "reminder_1h_patient"
  | "reminder_1h_clinician"

/** Plantilla de email correspondiente. Usado por email.ts para resolver el componente. */
export type EmailTemplateKey =
  | "manual_payment_approved"
  | "appointment_booked_patient"
  | "appointment_booked_clinician"
  | "appointment_cancelled_patient"
  | "reminder_24h_patient"
  | "reminder_1h_patient"
  | "reminder_1h_clinician"
```

- [ ] **Step 2: Crear `in-platform.ts`**

```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import type { MessageKind } from "./types"

/**
 * Inserta un mensaje de sistema en `messages`. Usa admin client (bypass RLS).
 * `from_user_id` queda NULL — la coherence constraint del schema lo permite cuando is_system=true.
 *
 * No lanza errores: si el insert falla, loggea con console.error y devuelve sin propagar.
 * Esto es importante porque las notificaciones NO deben fallar la acción de fondo.
 */
export async function sendSystemMessage(args: {
  toUserId: string
  body: string
  kind: MessageKind
}): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.from("messages").insert({
    from_user_id: null,
    to_user_id: args.toUserId,
    body: args.body,
    is_system: true,
    message_kind: args.kind,
  })
  if (error) {
    console.error("[in-platform notification] insert failed:", error.message, { kind: args.kind, toUserId: args.toUserId })
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/notifications/types.ts src/lib/notifications/in-platform.ts
git commit -m "feat(notifications): add MessageKind types and in-platform sender"
```

---

## Task 4 — Helper de email (Resend + log)

**Files:**
- Create: `src/lib/notifications/email.ts`

- [ ] **Step 1: Crear el módulo**

```typescript
import { Resend } from "resend"
import { render } from "@react-email/render"
import type { ReactElement } from "react"
import { createAdminClient } from "@/lib/supabase/admin"
import type { EmailTemplateKey } from "./types"

let _resend: Resend | null = null
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — emails will not be sent.")
    return null
  }
  if (!_resend) _resend = new Resend(key)
  return _resend
}

/**
 * Envía un email vía Resend y loggea el resultado en `email_log`.
 * No lanza errores — devuelve { ok }.
 */
export async function sendEmail(args: {
  to: string
  subject: string
  template: EmailTemplateKey
  body: ReactElement
  recipientId?: string | null         // user.id si aplica, para email_log
}): Promise<{ ok: boolean; error?: string }> {
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
  const replyTo = process.env.RESEND_REPLY_TO

  const resend = getResend()
  if (!resend) {
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "failed",
      error: "RESEND_API_KEY not configured",
      resendId: null,
    })
    return { ok: false, error: "RESEND_API_KEY not configured" }
  }

  let html: string
  try {
    html = await render(args.body)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "render failed"
    console.error("[email] render failed:", msg)
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "failed",
      error: msg,
      resendId: null,
    })
    return { ok: false, error: msg }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html,
      replyTo,
    })
    if (error) {
      const msg = error.message ?? "Resend error"
      console.error("[email] Resend error:", msg)
      await logEmail({
        recipient: args.to,
        recipientId: args.recipientId ?? null,
        template: args.template,
        status: "failed",
        error: msg,
        resendId: null,
      })
      return { ok: false, error: msg }
    }
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "sent",
      error: null,
      resendId: data?.id ?? null,
    })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown send error"
    console.error("[email] send threw:", msg)
    await logEmail({
      recipient: args.to,
      recipientId: args.recipientId ?? null,
      template: args.template,
      status: "failed",
      error: msg,
      resendId: null,
    })
    return { ok: false, error: msg }
  }
}

async function logEmail(args: {
  recipient: string
  recipientId: string | null
  template: string
  status: "sent" | "failed"
  error: string | null
  resendId: string | null
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from("email_log").insert({
    recipient_id: args.recipientId,
    recipient_email: args.recipient,
    template: args.template,
    status: args.status,
    error_message: args.error,
    resend_id: args.resendId,
  })
  if (error) {
    console.error("[email_log] insert failed:", error.message)
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/notifications/email.ts
git commit -m "feat(notifications): add Resend email helper with email_log writes"
```

---

## Task 5 — Templates email: Layout + 4 transactional

**Files:**
- Create: `src/lib/notifications/templates/CaimedLayout.tsx`
- Create: `src/lib/notifications/templates/ManualPaymentApprovedEmail.tsx`
- Create: `src/lib/notifications/templates/AppointmentBookedPatientEmail.tsx`
- Create: `src/lib/notifications/templates/AppointmentBookedClinicianEmail.tsx`
- Create: `src/lib/notifications/templates/AppointmentCancelledPatientEmail.tsx`

- [ ] **Step 1: Crear `CaimedLayout.tsx`** (shell común con header CAIMED + footer)

```tsx
import { Html, Head, Body, Container, Heading, Text, Section, Hr, Img } from "@react-email/components"
import type { ReactNode } from "react"

interface Props {
  preheader?: string
  children: ReactNode
}

const containerStyle = {
  margin: "0 auto",
  padding: "20px",
  maxWidth: "560px",
  fontFamily: "system-ui, -apple-system, sans-serif",
}
const headerStyle = {
  textAlign: "center" as const,
  paddingBottom: "16px",
  borderBottom: "1px solid #e5e7eb",
}
const footerStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  marginTop: "32px",
}

export default function CaimedLayout({ preheader, children }: Props) {
  return (
    <Html>
      <Head>
        {preheader && <title>{preheader}</title>}
      </Head>
      <Body style={{ background: "#f9fafb", margin: 0 }}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={{ fontSize: "20px", color: "#06559F", margin: 0 }}>
              CAIMED · Escuela de Pacientes
            </Heading>
          </Section>
          <Section style={{ paddingTop: "24px" }}>{children}</Section>
          <Hr style={{ borderColor: "#e5e7eb", margin: "32px 0 16px" }} />
          <Text style={footerStyle}>
            Este es un mensaje automático de la plataforma CAIMED. Si tienes preguntas, responde a este correo o entra a la sección de Mensajes en la plataforma.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 2: Crear `ManualPaymentApprovedEmail.tsx`**

```tsx
import { Heading, Text, Section, Button } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  planLabel: string                  // ej. "1 evaluación de salud"
  amountFormatted: string            // ej. "$80.000 COP"
  appUrl: string                     // ej. "https://caimed.example.com/agendar"
}

export default function ManualPaymentApprovedEmail({ patientName, planLabel, amountFormatted, appUrl }: Props) {
  return (
    <CaimedLayout preheader={`Pago confirmado: ${planLabel}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>¡Tu pago fue confirmado!</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Recibimos tu pago de <strong>{amountFormatted}</strong> por el plan: <strong>{planLabel}</strong>. Tus créditos ya están disponibles en tu cuenta para que agendes cuando quieras.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button
          href={appUrl}
          style={{
            background: "#06559F",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Agendar mi evaluación
        </Button>
      </Section>
    </CaimedLayout>
  )
}
```

- [ ] **Step 3: Crear `AppointmentBookedPatientEmail.tsx`**

```tsx
import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string         // formatted "jueves 8 mayo, 10:30 AM"
}

export default function AppointmentBookedPatientEmail({ patientName, appointmentDateTime }: Props) {
  return (
    <CaimedLayout preheader={`Tu evaluación está agendada: ${appointmentDateTime}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación de salud está agendada</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Confirmamos tu cita para el <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text>
        La evaluación será online por <strong>Microsoft Teams</strong>. Recibirás el link 24 horas antes de tu cita en otro correo y también lo encontrarás en la sección "Agendar evaluación" de la plataforma.
      </Text>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        ¿Necesitas reagendar o cancelar? Escríbele al administrador desde la sección de Mensajes en la plataforma.
      </Text>
    </CaimedLayout>
  )
}
```

- [ ] **Step 4: Crear `AppointmentBookedClinicianEmail.tsx`**

```tsx
import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  clinicianName: string
  patientName: string
  patientEmail: string
  appointmentDateTime: string
}

export default function AppointmentBookedClinicianEmail({ clinicianName, patientName, patientEmail, appointmentDateTime }: Props) {
  return (
    <CaimedLayout preheader={`Nueva cita asignada: ${appointmentDateTime}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Te asignaron una nueva cita</Heading>
      <Text>Hola {clinicianName},</Text>
      <Text>
        Se te asignó una evaluación de salud para el <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text>
        <strong>Paciente:</strong> {patientName}<br />
        <strong>Correo:</strong> {patientEmail}
      </Text>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        Puedes ver el detalle completo en tu agenda en la plataforma.
      </Text>
    </CaimedLayout>
  )
}
```

- [ ] **Step 5: Crear `AppointmentCancelledPatientEmail.tsx`**

```tsx
import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string
  reason: string
  creditReturned: boolean
}

export default function AppointmentCancelledPatientEmail({ patientName, appointmentDateTime, reason, creditReturned }: Props) {
  return (
    <CaimedLayout preheader={`Cita cancelada: ${appointmentDateTime}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación fue cancelada</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Tu cita programada para el <strong>{appointmentDateTime}</strong> fue cancelada.
      </Text>
      <Text>
        <strong>Razón:</strong> {reason}
      </Text>
      {creditReturned && (
        <Text style={{ background: "#dcfce7", padding: "12px", borderRadius: "8px", color: "#166534" }}>
          Tu crédito fue devuelto y ya está disponible para agendar otra fecha cuando quieras.
        </Text>
      )}
      {!creditReturned && (
        <Text style={{ background: "#fef3c7", padding: "12px", borderRadius: "8px", color: "#92400e" }}>
          El crédito de esta cita NO fue devuelto. Si tienes alguna duda, escríbele al administrador desde la sección de Mensajes.
        </Text>
      )}
    </CaimedLayout>
  )
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/notifications/templates/CaimedLayout.tsx \
        src/lib/notifications/templates/ManualPaymentApprovedEmail.tsx \
        src/lib/notifications/templates/AppointmentBookedPatientEmail.tsx \
        src/lib/notifications/templates/AppointmentBookedClinicianEmail.tsx \
        src/lib/notifications/templates/AppointmentCancelledPatientEmail.tsx
git commit -m "feat(notifications): add email templates for transactional events"
```

---

## Task 6 — Templates email: 3 reminders

**Files:**
- Create: `src/lib/notifications/templates/Reminder24hPatientEmail.tsx`
- Create: `src/lib/notifications/templates/Reminder1hPatientEmail.tsx`
- Create: `src/lib/notifications/templates/Reminder1hClinicianEmail.tsx`

- [ ] **Step 1: Crear `Reminder24hPatientEmail.tsx`**

```tsx
import { Heading, Text, Section, Button } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string
  teamsUrl: string
}

export default function Reminder24hPatientEmail({ patientName, appointmentDateTime, teamsUrl }: Props) {
  return (
    <CaimedLayout preheader={`Recordatorio: tu evaluación es en 24 horas`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación es mañana</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Te recordamos que tu evaluación de salud es el <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text>El link de Microsoft Teams ya está activo:</Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button
          href={teamsUrl}
          style={{
            background: "#06559F",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Unirme a Teams
        </Button>
      </Section>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        Si no puedes asistir, avísale al administrador cuanto antes desde la sección de Mensajes.
      </Text>
    </CaimedLayout>
  )
}
```

- [ ] **Step 2: Crear `Reminder1hPatientEmail.tsx`**

```tsx
import { Heading, Text, Section, Button } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string
  teamsUrl: string
}

export default function Reminder1hPatientEmail({ patientName, appointmentDateTime, teamsUrl }: Props) {
  return (
    <CaimedLayout preheader={`Tu evaluación es en una hora`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación empieza en una hora</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Tu cita es a las <strong>{appointmentDateTime}</strong>.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button
          href={teamsUrl}
          style={{
            background: "#06559F",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Unirme a Teams ahora
        </Button>
      </Section>
    </CaimedLayout>
  )
}
```

- [ ] **Step 3: Crear `Reminder1hClinicianEmail.tsx`**

```tsx
import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  clinicianName: string
  patientName: string
  appointmentDateTime: string
}

export default function Reminder1hClinicianEmail({ clinicianName, patientName, appointmentDateTime }: Props) {
  return (
    <CaimedLayout preheader={`Cita en una hora: ${patientName}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu próxima cita es en una hora</Heading>
      <Text>Hola {clinicianName},</Text>
      <Text>
        Tienes una evaluación de salud con <strong>{patientName}</strong> a las <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        Puedes acceder al link de Teams desde tu agenda en la plataforma.
      </Text>
    </CaimedLayout>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/notifications/templates/Reminder24hPatientEmail.tsx \
        src/lib/notifications/templates/Reminder1hPatientEmail.tsx \
        src/lib/notifications/templates/Reminder1hClinicianEmail.tsx
git commit -m "feat(notifications): add reminder email templates (24h + 1h)"
```

---

## Task 7 — Triggers (orquestador de notificaciones)

**Files:**
- Create: `src/lib/notifications/triggers.ts`

- [ ] **Step 1: Crear el módulo orquestador**

```typescript
import { createAdminClient } from "@/lib/supabase/admin"
import { sendSystemMessage } from "./in-platform"
import { sendEmail } from "./email"
import { formatHumanDateTimeBogota } from "@/lib/scheduling/format"
import { formatCop } from "@/lib/payments/format"
import { PLAN_LABEL } from "@/lib/payments/types"
import type { Plan } from "@/lib/payments/types"

import ManualPaymentApprovedEmail from "./templates/ManualPaymentApprovedEmail"
import AppointmentBookedPatientEmail from "./templates/AppointmentBookedPatientEmail"
import AppointmentBookedClinicianEmail from "./templates/AppointmentBookedClinicianEmail"
import AppointmentCancelledPatientEmail from "./templates/AppointmentCancelledPatientEmail"
import Reminder24hPatientEmail from "./templates/Reminder24hPatientEmail"
import Reminder1hPatientEmail from "./templates/Reminder1hPatientEmail"
import Reminder1hClinicianEmail from "./templates/Reminder1hClinicianEmail"

function appUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
}

async function getUserContact(userId: string): Promise<{ name: string; email: string } | null> {
  const admin = createAdminClient()
  const { data } = await admin.from("users").select("name, email").eq("id", userId).maybeSingle()
  if (!data) return null
  return { name: data.name, email: data.email }
}

/* ============================================================
 * Eventos
 * ============================================================ */

export async function notifyManualPaymentApproved(args: {
  patientId: string
  plan: Plan
  amountCop: number       // centavos
}): Promise<void> {
  const patient = await getUserContact(args.patientId)
  if (!patient) return

  const planLabel = PLAN_LABEL[args.plan]
  const amountFormatted = formatCop(args.amountCop)
  const body = `Tu pago de ${amountFormatted} por el plan "${planLabel}" fue confirmado. Ya tienes créditos disponibles para agendar tu evaluación de salud.`

  await sendSystemMessage({
    toUserId: args.patientId,
    body,
    kind: "manual_payment_approved",
  })

  await sendEmail({
    to: patient.email,
    subject: "Tu pago fue confirmado",
    template: "manual_payment_approved",
    body: ManualPaymentApprovedEmail({
      patientName: patient.name,
      planLabel,
      amountFormatted,
      appUrl: `${appUrl()}/agendar`,
    }),
    recipientId: args.patientId,
  })
}

export async function notifyBookingCreated(args: {
  patientId: string
  clinicianId: string
  startsAtIso: string
}): Promise<void> {
  const [patient, clinician] = await Promise.all([
    getUserContact(args.patientId),
    getUserContact(args.clinicianId),
  ])

  const dt = formatHumanDateTimeBogota(args.startsAtIso)

  // Paciente
  if (patient) {
    await sendSystemMessage({
      toUserId: args.patientId,
      body: `Tu evaluación de salud está agendada para ${dt}. Recibirás el link de Teams 24 horas antes.`,
      kind: "appointment_booked_patient",
    })
    await sendEmail({
      to: patient.email,
      subject: "Tu evaluación está agendada",
      template: "appointment_booked_patient",
      body: AppointmentBookedPatientEmail({
        patientName: patient.name,
        appointmentDateTime: dt,
      }),
      recipientId: args.patientId,
    })
  }

  // Clínico
  if (clinician && patient) {
    await sendSystemMessage({
      toUserId: args.clinicianId,
      body: `Te asignaron una nueva evaluación: ${patient.name} (${patient.email}) el ${dt}.`,
      kind: "appointment_booked_clinician",
    })
    await sendEmail({
      to: clinician.email,
      subject: "Nueva cita asignada",
      template: "appointment_booked_clinician",
      body: AppointmentBookedClinicianEmail({
        clinicianName: clinician.name,
        patientName: patient.name,
        patientEmail: patient.email,
        appointmentDateTime: dt,
      }),
      recipientId: args.clinicianId,
    })
  }
}

export async function notifyAppointmentCancelled(args: {
  patientId: string
  startsAtIso: string
  reason: string
  creditReturned: boolean
}): Promise<void> {
  const patient = await getUserContact(args.patientId)
  if (!patient) return

  const dt = formatHumanDateTimeBogota(args.startsAtIso)
  const body = `Tu cita del ${dt} fue cancelada. Razón: ${args.reason}. ${args.creditReturned ? "Tu crédito fue devuelto." : "El crédito NO fue devuelto."}`

  await sendSystemMessage({
    toUserId: args.patientId,
    body,
    kind: "appointment_cancelled_patient",
  })

  await sendEmail({
    to: patient.email,
    subject: "Tu evaluación fue cancelada",
    template: "appointment_cancelled_patient",
    body: AppointmentCancelledPatientEmail({
      patientName: patient.name,
      appointmentDateTime: dt,
      reason: args.reason,
      creditReturned: args.creditReturned,
    }),
    recipientId: args.patientId,
  })
}

export async function notifyReminder24h(args: {
  patientId: string
  startsAtIso: string
  teamsUrl: string
}): Promise<void> {
  const patient = await getUserContact(args.patientId)
  if (!patient) return

  const dt = formatHumanDateTimeBogota(args.startsAtIso)
  await sendSystemMessage({
    toUserId: args.patientId,
    body: `Recordatorio: tu evaluación es mañana ${dt}. El link de Teams ya está activo en tu cuenta.`,
    kind: "reminder_24h_patient",
  })
  await sendEmail({
    to: patient.email,
    subject: "Tu evaluación es mañana",
    template: "reminder_24h_patient",
    body: Reminder24hPatientEmail({
      patientName: patient.name,
      appointmentDateTime: dt,
      teamsUrl: args.teamsUrl,
    }),
    recipientId: args.patientId,
  })
}

export async function notifyReminder1h(args: {
  patientId: string
  clinicianId: string
  startsAtIso: string
  teamsUrl: string
}): Promise<void> {
  const [patient, clinician] = await Promise.all([
    getUserContact(args.patientId),
    getUserContact(args.clinicianId),
  ])

  const dt = formatHumanDateTimeBogota(args.startsAtIso)

  if (patient) {
    await sendSystemMessage({
      toUserId: args.patientId,
      body: `Tu evaluación empieza en una hora (${dt}). Únete por Teams cuando estés listo/a.`,
      kind: "reminder_1h_patient",
    })
    await sendEmail({
      to: patient.email,
      subject: "Tu evaluación empieza en una hora",
      template: "reminder_1h_patient",
      body: Reminder1hPatientEmail({
        patientName: patient.name,
        appointmentDateTime: dt,
        teamsUrl: args.teamsUrl,
      }),
      recipientId: args.patientId,
    })
  }

  if (clinician && patient) {
    await sendSystemMessage({
      toUserId: args.clinicianId,
      body: `Tu próxima cita con ${patient.name} es en una hora (${dt}).`,
      kind: "reminder_1h_clinician",
    })
    await sendEmail({
      to: clinician.email,
      subject: "Tu próxima cita en una hora",
      template: "reminder_1h_clinician",
      body: Reminder1hClinicianEmail({
        clinicianName: clinician.name,
        patientName: patient.name,
        appointmentDateTime: dt,
      }),
      recipientId: args.clinicianId,
    })
  }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/lib/notifications/triggers.ts
git commit -m "feat(notifications): add typed event triggers orchestrating in-platform + email"
```

---

## Task 8 — Cablear las 3 server actions a las triggers

**Files:**
- Modify: `src/app/(admin)/admin/citas/pagos/actions.ts`
- Modify: `src/app/(dashboard)/agendar/actions.ts`
- Modify: `src/app/(admin)/admin/citas/calendario/actions.ts`

- [ ] **Step 1: `pagos/actions.ts` — agregar trigger en `registerManualPayment` después de crear el crédito**

Buscar al final de `registerManualPayment` (después del audit_log insert, antes del `revalidatePath`):

```typescript
  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "manual_payment",
    target_type: "payment",
    target_id: payment.id,
    metadata: { credit_id: creditId, plan: input.plan, patient_id: input.patientId },
  })

  revalidatePath("/admin/citas/pagos")
  return { ok: true, paymentId: payment.id }
```

Reemplazar por:

```typescript
  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "manual_payment",
    target_type: "payment",
    target_id: payment.id,
    metadata: { credit_id: creditId, plan: input.plan, patient_id: input.patientId },
  })

  // 5. Notificación (best-effort, no falla la action si el email falla)
  try {
    const { notifyManualPaymentApproved } = await import("@/lib/notifications/triggers")
    await notifyManualPaymentApproved({
      patientId: input.patientId,
      plan: input.plan,
      amountCop: copToCents(input.amountCop),
    })
  } catch (e) {
    console.error("[manual_payment] notification failed:", e)
  }

  revalidatePath("/admin/citas/pagos")
  return { ok: true, paymentId: payment.id }
```

(El `import dinámico` evita ciclos en server actions cuando hay imports complejos.)

- [ ] **Step 2: `agendar/actions.ts` — agregar trigger en `bookSlotAction` después de éxito**

Buscar el `if (result.ok)` block:

```typescript
  const result = await bookAppointment(profile.id, slotStartIso)
  if (result.ok) {
    revalidatePath("/agendar")
    return { ok: true, appointmentId: result.appointmentId }
  }
  return { ok: false, error: result.error }
```

Reemplazar por:

```typescript
  const result = await bookAppointment(profile.id, slotStartIso)
  if (result.ok) {
    // Notificación best-effort. Cargamos los datos de la cita recién creada
    // para tener clinician_id y starts_at.
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin")
      const { notifyBookingCreated } = await import("@/lib/notifications/triggers")
      const admin = createAdminClient()
      const { data: apt } = await admin
        .from("appointments")
        .select("clinician_id, starts_at")
        .eq("id", result.appointmentId)
        .single()
      if (apt) {
        await notifyBookingCreated({
          patientId: profile.id,
          clinicianId: apt.clinician_id,
          startsAtIso: apt.starts_at,
        })
      }
    } catch (e) {
      console.error("[booking] notification failed:", e)
    }
    revalidatePath("/agendar")
    return { ok: true, appointmentId: result.appointmentId }
  }
  return { ok: false, error: result.error }
```

- [ ] **Step 3: `calendario/actions.ts` — agregar trigger en `cancelAppointmentAction`**

Buscar al final de `cancelAppointmentAction`, después del audit_log insert:

```typescript
  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_cancel_appointment",
    target_type: "appointment",
    target_id: input.appointmentId,
    metadata: {
      reason: input.reason.trim(),
      credit_returned: input.returnCredit,
      credit_id: existing.credit_id,
    },
  })

  revalidatePath("/admin/citas")
  return { ok: true }
```

Reemplazar por:

```typescript
  // 4. Audit log
  await admin.from("audit_log").insert({
    actor_id: profile!.id,
    action: "admin_cancel_appointment",
    target_type: "appointment",
    target_id: input.appointmentId,
    metadata: {
      reason: input.reason.trim(),
      credit_returned: input.returnCredit,
      credit_id: existing.credit_id,
    },
  })

  // 5. Notificación (best-effort)
  try {
    const { data: aptFull } = await admin
      .from("appointments")
      .select("patient_id, starts_at")
      .eq("id", input.appointmentId)
      .single()
    if (aptFull) {
      const { notifyAppointmentCancelled } = await import("@/lib/notifications/triggers")
      await notifyAppointmentCancelled({
        patientId: aptFull.patient_id,
        startsAtIso: aptFull.starts_at,
        reason: input.reason.trim(),
        creditReturned: input.returnCredit,
      })
    }
  } catch (e) {
    console.error("[cancel_appointment] notification failed:", e)
  }

  revalidatePath("/admin/citas")
  return { ok: true }
```

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/(admin)/admin/citas/pagos/actions.ts" \
        "src/app/(dashboard)/agendar/actions.ts" \
        "src/app/(admin)/admin/citas/calendario/actions.ts"
git commit -m "feat(notifications): wire booking, cancellation, and manual payment to notification triggers"
```

---

## Task 9 — Cron endpoint: recordatorios 24h

**Files:**
- Create: `src/app/api/cron/reminders-24h/route.ts`

- [ ] **Step 1: Crear el endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyReminder24h } from "@/lib/notifications/triggers"
import { getSchedulingConfig } from "@/lib/payments/config"

export const dynamic = "force-dynamic"

/**
 * Vercel Cron — corre cada hora.
 * Busca citas que arrancan en ~24h (ventana 23h-25h) y aún no tienen
 * reminder_24h_sent_at. Manda recordatorio + marca timestamp para idempotencia.
 *
 * Protegido con header `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now + 23 * 60 * 60 * 1000).toISOString()       // 23h ahead
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000).toISOString()         // 25h ahead

  const admin = createAdminClient()
  const { data: appointments, error } = await admin
    .from("appointments")
    .select("id, patient_id, starts_at")
    .eq("status", "scheduled")
    .is("reminder_24h_sent_at", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd)

  if (error) {
    console.error("[cron 24h] query failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const list = appointments ?? []
  if (list.length === 0) return NextResponse.json({ ok: true, processed: 0 })

  const config = await getSchedulingConfig()
  const teamsUrl = config.teamsMeetingUrl

  let processed = 0
  let failed = 0
  for (const apt of list) {
    try {
      await notifyReminder24h({
        patientId: apt.patient_id,
        startsAtIso: apt.starts_at,
        teamsUrl,
      })
      // Marcar enviado (idempotencia — si la próxima corrida ve este timestamp, salta)
      const { error: updErr } = await admin
        .from("appointments")
        .update({ reminder_24h_sent_at: new Date().toISOString() })
        .eq("id", apt.id)
      if (updErr) {
        console.error("[cron 24h] mark sent failed:", updErr.message, { id: apt.id })
        failed++
      } else {
        processed++
      }
    } catch (e) {
      console.error("[cron 24h] notification failed:", e, { id: apt.id })
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed, failed, total: list.length })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/api/cron/reminders-24h/route.ts"
git commit -m "feat(notifications): add cron endpoint for 24h reminders"
```

---

## Task 10 — Cron endpoint: recordatorios 1h

**Files:**
- Create: `src/app/api/cron/reminders-1h/route.ts`

- [ ] **Step 1: Crear el endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { notifyReminder1h } from "@/lib/notifications/triggers"
import { getSchedulingConfig } from "@/lib/payments/config"

export const dynamic = "force-dynamic"

/**
 * Vercel Cron — corre cada 5 minutos.
 * Busca citas que arrancan en ~1h (ventana 55min-65min) y aún no tienen
 * reminder_1h_sent_at. Manda recordatorio + marca timestamp.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now + 55 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 65 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data: appointments, error } = await admin
    .from("appointments")
    .select("id, patient_id, clinician_id, starts_at")
    .eq("status", "scheduled")
    .is("reminder_1h_sent_at", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd)

  if (error) {
    console.error("[cron 1h] query failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const list = appointments ?? []
  if (list.length === 0) return NextResponse.json({ ok: true, processed: 0 })

  const config = await getSchedulingConfig()
  const teamsUrl = config.teamsMeetingUrl

  let processed = 0
  let failed = 0
  for (const apt of list) {
    try {
      await notifyReminder1h({
        patientId: apt.patient_id,
        clinicianId: apt.clinician_id,
        startsAtIso: apt.starts_at,
        teamsUrl,
      })
      const { error: updErr } = await admin
        .from("appointments")
        .update({ reminder_1h_sent_at: new Date().toISOString() })
        .eq("id", apt.id)
      if (updErr) {
        console.error("[cron 1h] mark sent failed:", updErr.message, { id: apt.id })
        failed++
      } else {
        processed++
      }
    } catch (e) {
      console.error("[cron 1h] notification failed:", e, { id: apt.id })
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed, failed, total: list.length })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npx tsc --noEmit
git add "src/app/api/cron/reminders-1h/route.ts"
git commit -m "feat(notifications): add cron endpoint for 1h reminders"
```

---

## Task 11 — Configurar Vercel Cron

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Leer el archivo actual**

```bash
cat "/Users/danny/Documents/Escuela de pacientes CAIMED/escuela-pacientes/vercel.json"
```

- [ ] **Step 2: Agregar la sección `crons`**

Si el archivo actual es solo `{}` o no tiene `crons`, reemplazar/añadir para que quede:

```json
{
  "crons": [
    { "path": "/api/cron/reminders-24h", "schedule": "0 * * * *" },
    { "path": "/api/cron/reminders-1h", "schedule": "*/5 * * * *" }
  ]
}
```

Si el archivo ya tiene otras configs, mantener las existentes y agregar `crons` como otra propiedad top-level.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat(notifications): wire Vercel cron jobs for 24h and 1h reminders"
```

---

## Task 12 — Renderizar mensajes de sistema con estilo distinto

**Files:**
- Modify: `src/components/dashboard/MessageThread.tsx`
- Modify: `src/components/admin/AdminMessageThread.tsx`

- [ ] **Step 1: Leer el archivo del paciente**

```bash
cat src/components/dashboard/MessageThread.tsx | head -80
```

- [ ] **Step 2: Modificar `MessageThread.tsx`**

Buscar donde se renderiza cada mensaje (un `messages.map(...)` con un `<div>` o similar). Identificar la prop `msg` y agregar un branch para `msg.is_system`.

Ejemplo de modificación (la estructura exacta puede variar — adapta a lo que veas):

Antes (estructura típica):
```tsx
{messages.map((msg) => {
  const isMine = msg.from_user_id === currentUserId
  return (
    <div key={msg.id} className={`...${isMine ? "..." : "..."}`}>
      {msg.body}
    </div>
  )
})}
```

Después:
```tsx
{messages.map((msg) => {
  if (msg.is_system) {
    return (
      <div key={msg.id} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-neutral my-2">
        <div className="flex items-start gap-2">
          <svg className="h-4 w-4 shrink-0 mt-0.5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h.01a1 1 0 100-2H10V9a1 1 0 00-1 0z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-primary mb-0.5">CAIMED · Sistema</div>
            <div>{msg.body}</div>
          </div>
        </div>
      </div>
    )
  }
  const isMine = msg.from_user_id === currentUserId
  return (
    <div key={msg.id} className={`...${isMine ? "..." : "..."}`}>
      {msg.body}
    </div>
  )
})}
```

(Conserva la estructura original para mensajes humanos. Solo agrega el branch al inicio del map.)

- [ ] **Step 3: Aplicar el mismo branch en `AdminMessageThread.tsx`** — también detecta `msg.is_system` y renderiza con el mismo estilo. La estructura será similar; copia el branch desde MessageThread.tsx.

- [ ] **Step 4: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/components/dashboard/MessageThread.tsx src/components/admin/AdminMessageThread.tsx
git commit -m "feat(notifications): render system messages with CAIMED system styling"
```

---

## Task 13 — Verificación end-to-end manual

**Files:** ninguno

- [ ] **Step 1: Aplicar la migración v10 en Supabase SQL Editor**

Si no se hizo en Task 1 Step 2, hacerlo ahora. Pegar el SQL de `supabase/migration-v10-system-messages-rls.sql` y correr.

- [ ] **Step 2: Configurar `.env.local`**

Agregar:
```
RESEND_API_KEY=re_test_xxx_<TU_KEY_REAL>
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_REPLY_TO=admin@<tu-email-de-prueba>
CRON_SECRET=<random-32-bytes>
```

Si no tienes API key de Resend, crea una cuenta en https://resend.com (gratis hasta 3.000 emails/mes) y genera un key. Para `CRON_SECRET` puedes usar:
```bash
openssl rand -hex 32
```

- [ ] **Step 3: Levantar dev server**

```bash
npm run dev
```

- [ ] **Step 4: Probar trigger de booking**

Login como paciente con créditos → `/agendar` → reservar un slot.

Verificar:
- Mensaje en plataforma: ir a `/mensajes`, el último mensaje debe ser del **sistema** con estilo distintivo (icono CAIMED, badge azul) y body "Tu evaluación de salud está agendada para...".
- Email enviado al paciente. Verificar en SQL:
  ```sql
  select template, status, recipient_email, error_message, sent_at
  from public.email_log order by sent_at desc limit 5;
  ```
  Debe haber 2 filas recientes (paciente + clínico) con `status='sent'`.
- Si tu RESEND_FROM_EMAIL es `onboarding@resend.dev` y no has verificado dominio, los emails reales solo llegan a la cuenta dueña del API key (es la conducta esperada de Resend en modo dev).

- [ ] **Step 5: Probar trigger de cancelación**

Como admin → `/admin/citas/calendario` → drawer en la cita recién creada → "Cancelar cita" → razón "Test trigger" → confirmar.

Verificar:
- Mensaje de sistema al paciente con razón.
- Otro fila en `email_log` con `template='appointment_cancelled_patient'`, `status='sent'`.

- [ ] **Step 6: Probar trigger de pago manual**

Como admin → `/admin/citas/pagos` → "+ Registrar pago manual" → seleccionar otro paciente → registrar.

Verificar:
- Mensaje de sistema al paciente.
- Email log con `template='manual_payment_approved'`.

- [ ] **Step 7: Probar cron 24h manualmente**

Crear una cita en Supabase con `starts_at` ~24h en el futuro y `reminder_24h_sent_at = NULL`:

```sql
-- Ajusta los uuids reales y la hora a +24h desde ahora
insert into public.appointments (patient_id, clinician_id, starts_at, ends_at, status, credit_id)
values ('<paciente_uuid>', '<clinico_uuid>',
        (now() + interval '24 hours')::timestamptz,
        (now() + interval '24 hours 30 minutes')::timestamptz,
        'scheduled',
        '<algun_credit_id>');
```

Llamar el endpoint manualmente con tu CRON_SECRET:

```bash
curl -i http://localhost:3000/api/cron/reminders-24h \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Expected response: `{"ok":true,"processed":1,"failed":0,"total":1}`.

Verificar `reminder_24h_sent_at` ahora tiene timestamp.

Llamar de nuevo el endpoint → response `{"ok":true,"processed":0}` (idempotencia).

- [ ] **Step 8: Probar cron 1h manualmente**

Mismo patrón con una cita ~1h en el futuro y endpoint `/api/cron/reminders-1h`.

- [ ] **Step 9: Probar protección del endpoint**

Sin header `Authorization`:
```bash
curl -i http://localhost:3000/api/cron/reminders-24h
```
Expected: `401 unauthorized`.

- [ ] **Step 10: Detener dev server + correr tests**

```bash
npx tsc --noEmit && npm test
```

Expected: tsc clean, 23 tests still passing (no nuevos tests en este plan; Plan 4 es mayormente integraciones).

---

## Self-Review

Antes de mergear:

- [ ] Spec sección "Mensajes en plataforma" — `is_system=true`, `from_user_id=null`, `message_kind` poblado ✓.
- [ ] Spec sección "Email — Resend" — todas las plantillas creadas; render usa react-email; logs en `email_log` ✓.
- [ ] Spec sección "Recordatorios — Vercel Cron" — 2 cron jobs (24h + 1h), idempotencia via `reminder_*_sent_at`, protección por `CRON_SECRET` ✓.
- [ ] Spec sección "Manejo de fallo de email" — Resend tiene retries internos; nosotros loggeamos en `email_log` y no reintentamos en código ✓.
- [ ] Spec sección "Sin verificar dominio (modo dev)" — el helper `email.ts` no asume verificación; Resend maneja el dev mode automáticamente ✓.
- [ ] Privacidad: el email del paciente NO menciona el nombre del clínico ✓.
- [ ] Notificaciones nunca rompen las acciones de fondo (try/catch envolviendo cada trigger) ✓.

---

## Resumen de lo que entrega Plan 4

✅ Migración v10 RLS para system messages.
✅ 7 plantillas de email con estilo CAIMED via react-email.
✅ Helper unificado de notificaciones (in-platform + email + log).
✅ 5 triggers tipados: manual_payment_approved, booking_created, appointment_cancelled, reminder_24h, reminder_1h.
✅ 3 server actions cableadas: book, cancel, manual payment.
✅ 2 endpoints cron protegidos (24h + 1h) con idempotencia.
✅ 2 cron jobs en `vercel.json`.
✅ Mensajes de sistema renderizados con estilo distintivo en `MessageThread` y `AdminMessageThread`.

❌ Re-asignación auto + alertas dashboard — Plan 5.
❌ Wompi + payment-approved email para Wompi (template ya existe pero el trigger correspondiente — `notifyWompiPaymentApproved` — se agrega en Plan 6).
❌ Email de "appointment reassigned" — Plan 5 (cuando el sistema reasigna a otro clínico).

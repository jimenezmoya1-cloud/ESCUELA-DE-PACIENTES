# Design — Agendamiento de evaluaciones de salud

**Fecha:** 2026-05-04
**Estado:** Aprobado — listo para plan de implementación
**Autor:** Danny + Claude (brainstorming)

## Contexto

CAIMED necesita una sección de calendario en su plataforma donde los pacientes puedan agendar su **evaluación de salud** después de pagar. La plataforma actual (Next.js 16 + Supabase + Tailwind 4) ya tiene módulos, mensajería, y perfiles clínicos, pero no tiene aún ningún flujo de agendamiento ni de pago.

**Objetivo:** habilitar el flujo completo paciente → pago → agenda → cita por Microsoft Teams, con vistas para los tres roles existentes (`patient`, `admin`, `clinico`).

## Decisiones de producto (resumen)

| Tema | Decisión |
|---|---|
| Pasarela de pago | **Wompi** (integración aplazada hasta tener credenciales). Mientras tanto: solo pago manual offline registrado por el admin. |
| Modelo de pricing | **2 planes**: `single` ($80.000 COP — 1 evaluación) y `pack3` ($168.000 COP — 3 evaluaciones, 30% off). |
| Pago manual offline | Sí, soportado desde el día 1. Admin registra el pago vía UI y otorga créditos. |
| IVA | Marcado como **exento** por ahora (servicios de salud, Art. 476 ET). Modelo permite cambiar en el futuro. |
| Reembolsos en plata | No por ahora. Solo se devuelve el crédito (puede reagendar). |
| Comprobantes | Mensaje en plataforma + email. Sin PDF ni facturación electrónica DIAN en esta fase. |
| Disponibilidad de clínicos | **Híbrido**: horario base recurrente + bloqueos puntuales. |
| Asignación paciente↔clínico | **Pool blind round-robin**. El paciente nunca ve el nombre del clínico en la UI. Cada evaluación re-asigna del pool al clínico con menos citas futuras. |
| Slot duración / buffer | 30 min slot + 10 min buffer entre citas. |
| Ventana de agendamiento | Sin límite hacia el futuro. |
| Anticipación mínima | 24h. |
| Cancelación / reagendamiento | **Solo admin**. El paciente debe pedírselo por mensaje. |
| Política de crédito al cancelar | Si faltan ≥24h, devolver crédito (toggle del admin). No-show: admin decide. |
| Link Teams | Único link global, configurable por admin. Se desbloquea al paciente 24h antes de la cita. |
| Notificaciones | Plataforma + email (Resend). Confirmaciones, recordatorios 24h y 1h, eventos de pago, cancelaciones. |
| Sin slots disponibles | Mensaje informativo "vuelve a revisar pronto". Sin lista de espera. |
| Clínico desactivado | Re-asignación automática silenciosa al siguiente del round-robin. Si no hay reemplazo posible, alerta al admin. |
| Validaciones previas a comprar | Ninguna — cualquier paciente activo puede comprar. |
| Lanzamiento | Todo en un único proyecto, en fases internas (Wompi al final). |

## Arquitectura — Modelo de datos

### Filosofía: slots computados, no materializados

**No existe** una tabla de `slots`. La disponibilidad se calcula al vuelo en cada consulta usando:

```
slots_disponibles(rango_fechas, clínicos_activos)
  = horario_base_recurrente
  − bloqueos_puntuales
  − citas_ya_reservadas
  − citas_pasadas (filtradas por anticipación mínima 24h)
```

Esto evita generar millones de filas para "ventana sin límite" y hace que cualquier cambio en horarios o bloqueos tenga efecto inmediato.

### Tablas nuevas

```sql
-- Horario base recurrente del clínico (puede tener varias filas por día)
create table public.clinician_schedules (
  id uuid default gen_random_uuid() primary key,
  clinician_id uuid not null references public.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0=domingo, 1=lunes, ...
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index idx_clinician_schedules_clinician on public.clinician_schedules(clinician_id) where is_active;

-- Bloqueos puntuales (vacaciones, congresos, etc.)
create table public.schedule_blocks (
  id uuid default gen_random_uuid() primary key,
  clinician_id uuid not null references public.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index idx_schedule_blocks_clinician_range on public.schedule_blocks(clinician_id, start_at, end_at);

-- Pagos (Wompi y manuales)
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.users(id) on delete cascade,
  plan text not null check (plan in ('single', 'pack3')),
  amount_cop bigint not null,                 -- en centavos: 8000000 = $80.000
  source text not null check (source in ('wompi', 'manual_offline')),
  status text not null check (status in ('pending', 'approved', 'declined', 'voided', 'error')),
  -- Solo para Wompi
  wompi_reference text unique,                -- ej. EVAL-{patient_id}-{timestamp}
  wompi_transaction_id text,
  raw_payload jsonb,
  -- Solo para manual_offline
  created_by_admin_id uuid references public.users(id),
  notes text,
  -- Timestamps
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index idx_payments_patient on public.payments(patient_id);
create index idx_payments_status on public.payments(status);

-- Créditos del paciente
create table public.evaluation_credits (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.users(id) on delete cascade,
  source text not null check (source in ('wompi', 'manual_offline')),
  payment_id uuid references public.payments(id) on delete set null,
  amount integer not null check (amount > 0),       -- 1 o 3
  remaining integer not null check (remaining >= 0),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,                            -- null = sin expiración
  notes text,                                        -- contexto para créditos manuales
  created_at timestamptz not null default now()
);
create index idx_evaluation_credits_patient on public.evaluation_credits(patient_id);
create index idx_evaluation_credits_remaining on public.evaluation_credits(patient_id, remaining) where remaining > 0;

-- Citas reservadas
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid not null references public.users(id) on delete cascade,
  clinician_id uuid not null references public.users(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,                       -- starts_at + 30 min (calculado app-side)
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  credit_id uuid references public.evaluation_credits(id),
  -- Cancelación / no-show
  cancelled_by uuid references public.users(id),
  cancelled_at timestamptz,
  cancellation_reason text,
  credit_returned boolean not null default false,
  -- Recordatorios (idempotencia)
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Anti doble-booking: solo una cita activa por (clinician_id, starts_at)
create unique index uniq_appointment_clinician_slot
  on public.appointments(clinician_id, starts_at)
  where status = 'scheduled';
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_clinician_range on public.appointments(clinician_id, starts_at);

-- Auditoría de acciones administrativas
create table public.audit_log (
  id uuid default gen_random_uuid() primary key,
  actor_id uuid not null references public.users(id),
  action text not null,                               -- 'cancel_appointment', 'manual_payment', 'adjust_credit', 'reassign_clinician', etc.
  target_type text not null,                          -- 'appointment', 'payment', 'evaluation_credit', 'user'
  target_id uuid not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
create index idx_audit_log_target on public.audit_log(target_type, target_id);
create index idx_audit_log_actor on public.audit_log(actor_id, created_at desc);

-- Log de emails enviados (para diagnóstico, no para reintento)
create table public.email_log (
  id uuid default gen_random_uuid() primary key,
  recipient_id uuid references public.users(id),
  recipient_email text not null,
  template text not null,                             -- 'payment_approved', 'reminder_24h', etc.
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  resend_id text,                                     -- id devuelto por Resend
  sent_at timestamptz not null default now()
);
create index idx_email_log_recipient on public.email_log(recipient_id, sent_at desc);
```

### Cambios a tablas existentes

```sql
-- Mensajes del sistema (notificaciones in-platform)
alter table public.messages
  add column is_system boolean not null default false,
  add column message_kind text,                        -- 'payment_approved' | 'appointment_booked' | 'reminder_24h' | etc.
  alter column from_user_id drop not null;             -- mensajes de sistema no tienen remitente humano
-- Constraint de coherencia: si is_system=true, from_user_id puede ser NULL; si is_system=false, debe estar.
alter table public.messages
  add constraint messages_from_user_required_for_human
  check (is_system = true or from_user_id is not null);

-- Configuración global: nuevas keys en app_config
-- (el código las lee/escribe; no requieren cambio de schema)
--   'teams_meeting_url'
--   'price_single_cop'        (default: 8000000)
--   'price_pack3_cop'         (default: 16800000)
--   'wompi_environment'       ('sandbox' | 'production')
--   'wompi_public_key'        (también puede vivir en .env, ver §"Wompi")
```

### Funciones SQL clave

```sql
-- Round-robin: dado un slot inicio, devuelve el clínico con menos citas futuras
-- entre los que tienen ese slot disponible.
create or replace function pick_least_loaded_clinician(slot_start timestamptz)
returns uuid
language sql stable
as $$
  with available as (
    select u.id as clinician_id
    from public.users u
    where u.role = 'clinico'
      and u.is_active = true
      and exists (
        select 1 from public.clinician_schedules cs
        where cs.clinician_id = u.id
          and cs.is_active
          and cs.weekday = extract(dow from (slot_start at time zone 'America/Bogota'))::int
          and cs.start_time <= (slot_start at time zone 'America/Bogota')::time
          and cs.end_time   >= ((slot_start + interval '30 minutes') at time zone 'America/Bogota')::time
      )
      and not exists (
        select 1 from public.schedule_blocks sb
        where sb.clinician_id = u.id
          and sb.start_at <= slot_start
          and sb.end_at   >  slot_start
      )
      and not exists (
        select 1 from public.appointments a
        where a.clinician_id = u.id
          and a.status = 'scheduled'
          and a.starts_at = slot_start
      )
  ),
  load_count as (
    select av.clinician_id,
           (select count(*) from public.appointments a
            where a.clinician_id = av.clinician_id
              and a.status = 'scheduled'
              and a.starts_at >= now()) as pending_count
    from available av
  )
  select clinician_id
  from load_count
  order by pending_count asc, clinician_id asc   -- empate determinístico
  limit 1;
$$;
```

### RLS (Row Level Security)

| Tabla | Patient | Clínico | Admin |
|---|---|---|---|
| `clinician_schedules` | – | SELECT/INSERT/UPDATE/DELETE de los suyos | Todo |
| `schedule_blocks` | – | SELECT/INSERT/UPDATE/DELETE de los suyos | Todo |
| `payments` | SELECT propios (sin `raw_payload`) | – | Todo |
| `evaluation_credits` | SELECT propios | – | Todo |
| `appointments` | SELECT propios | SELECT donde `clinician_id = auth.uid()` | Todo |
| `audit_log` | – | – | SELECT |
| `email_log` | – | – | SELECT |

### Migración

Una sola migración: `supabase/migration-v9-scheduling.sql`. Contiene todas las tablas, índices, función round-robin, policies RLS, y triggers.

## Flujo del paciente — `/agendar`

Página única que cambia su contenido según el estado del paciente.

### Estado A — Sin créditos disponibles

- Header: "Agenda tu evaluación de salud"
- Dos cards de plan:
  - **Card 1:** "1 evaluación · $80.000 COP"
  - **Card 2:** "3 evaluaciones · $168.000 COP — ahorras $72.000 (30% off)"
- Botones primarios:
  - **Antes de tener Wompi:** un solo botón "Solicitar pago" → manda mensaje pre-armado al admin: "Hola, quiero comprar el plan **{plan}**. Por favor envíame los datos para hacer la transferencia." → muestra confirmación.
  - **Cuando Wompi esté integrado:** dos botones, "Pagar con Wompi" (primario) + "Pagar por transferencia" (envía el mensaje anterior).
- Si hay un `payment` en `pending` o `error` previo: banner informativo con detalle del último intento.

### Estado B — Con créditos, sin cita activa

- Header: "Tienes **N** evaluaciones disponibles"
- Selector de slot (custom, no librería externa):
  - Navegador de mes (← Mayo →) y mini-grid de días con dot indicador "hay disponibilidad".
  - Click en día → panel lateral con horas disponibles del día (ya filtradas por buffer 10 min, mínimo 24h, y orden cronológico).
  - Click en hora → modal: "Tu evaluación: jueves 8 mayo a las 10:30 AM. Será online por Microsoft Teams. ¿Confirmar?"
  - Confirmar → server action: `pick_least_loaded_clinician()` → INSERT en `appointments` (UNIQUE constraint protege doble-booking) → decremento atómico de `remaining` en el crédito FIFO más antiguo → INSERT en `messages` (sistema) al paciente y al clínico → enqueue de emails.
  - En caso de error de UNIQUE constraint: mensaje "alguien acaba de tomar ese horario, elige otro".
- Si el calendario no tiene slots en los próximos 90 días: mensaje "Por ahora no hay disponibilidad. Vuelve a revisar pronto." Sin waitlist.

### Estado C — Con cita activa

- Card grande con countdown: "Próxima evaluación · jueves 8 mayo, 10:30 AM · en 3d 4h".
- Botón **"Unirme por Teams"**:
  - Deshabilitado con tooltip "Disponible 24h antes de tu cita" si `now() < starts_at - 24h`.
  - Habilitado con link configurado en `app_config.teams_meeting_url` cuando se cumple la ventana.
- Bloque "¿Necesitas reagendar o cancelar?" → botón abre composer de mensaje al admin pre-llenado.
- Sección "Tus créditos restantes: N" → si N>0, botón "Agendar próxima evaluación" vuelve al Estado B.
- Sección "Evaluaciones pasadas" (si las hay): lista cronológica con estado (completada / cancelada / no-show).

### Reglas UX

- El nombre del clínico **nunca** aparece en la UI del paciente.
- Sin botones de cancelación/reagendamiento — solo vía mensaje al admin.
- Toda fecha/hora se muestra en `America/Bogota` (UTC-5).

## Flujo del admin — `/admin/citas` y `/admin/configuracion`

### `/admin/citas` con tres tabs

**Tab "Calendario" (vista global):**
- Calendario semanal por defecto, toggle a vista mensual.
- Filtros: clínico, estado, rango de fechas.
- Cada cita = bloque clickeable con nombre del paciente + nombre del clínico.
- Click → drawer lateral con detalle y acciones:
  - **Cancelar cita** → modal con razón obligatoria + checkbox "Devolver crédito" (default: marcado si faltan ≥24h, desmarcado si <24h, pero el admin lo puede toggle). Confirma: `status = cancelled`, increment opcional de `remaining`, mensaje al paciente, fila en `audit_log`.
  - **Reagendar** → abre el selector de slots del paciente (mismo componente del Estado B), elige nuevo, mueve la cita.
  - **Marcar como no-show** → modal "¿Devolver crédito?" (default: no), opcional mensaje al paciente.
  - **Marcar completada** → simple confirmación.

**Tab "Tabla de citas":**
- Tabla paginada filtrable: fecha, paciente, clínico, estado, fuente del crédito, acciones (link a drawer).
- Búsqueda por nombre/email del paciente.
- Export CSV.

**Tab "Pagos y créditos":**
- Tabla de todos los `payments` con sub-filtros por status y source.
- Botón **"Registrar pago manual"**:
  - Modal: selecciona paciente (autocomplete), plan (`single`/`pack3`), monto (default desde `app_config`), nota.
  - Confirma → INSERT `payments` con `source='manual_offline'`, `status='approved'`, `created_by_admin_id`, `notes` → INSERT `evaluation_credits` con `amount` correspondiente → mensaje al paciente + email "tu pago manual fue confirmado" → fila en `audit_log`.
- Botón **"Ajustar créditos"** por paciente:
  - Permite sumar/restar créditos manualmente con razón obligatoria.
  - Crea/actualiza `evaluation_credits` y registra en `audit_log`.

### `/admin/configuracion` (página nueva)

- Campo **"Link de Microsoft Teams"** (input URL + Guardar) → escribe `app_config.teams_meeting_url`.
- Campo **"Precio plan individual (COP)"** y **"Precio paquete 3 (COP)"** → escriben `app_config.price_single_cop` y `price_pack3_cop`.
- Sección **"Wompi"** (oculta o disabled hasta tener credenciales):
  - Public key (visible).
  - Private key, events secret, integrity key (encriptados; solo se muestra "configurado/no configurado").
  - Toggle environment: `sandbox` | `production`.
  - Botón "Probar conexión" que pega al endpoint de health de Wompi.

### Asignación paciente ↔ clínico (override manual)

- En `/admin/pacientes/[id]` se agrega sección "Citas y créditos".
- Al reagendar o crear cita manual, admin puede **forzar** un clínico específico (override del round-robin) vía dropdown.

### Banners de alerta en `/admin` (dashboard principal)

- Si hay >X pacientes con créditos pero sin slots disponibles próximos: "X pacientes esperan slots. Considera abrir más disponibilidad."
- Si un clínico fue desactivado y la re-asignación automática no pudo cubrir todas sus citas: "X citas huérfanas requieren reasignación manual."

## Flujo del clínico — `/admin/clinico/agenda` y `/admin/clinico/disponibilidad`

### `/admin/clinico/agenda` (vista de su calendario)

Toggle de tres modos:

**Modo "Semana" (default):** grid Lun-Dom, filas cada 30 min. Citas como bloques con nombre del paciente. Slots libres sombreados. Click en cita → drawer con detalle (paciente, link a perfil clínico existente, link Teams permanente para el clínico, hora).

**Modo "Mes":** grid mensual con count por día. Click en día expande detalle.

**Modo "Lista":** cronológica simple — Hoy / Mañana / Esta semana / Este mes.

Header con métricas rápidas: "Hoy: 4 citas · Esta semana: 18 · Próxima cita en 2h 15min".

Botón **"Unirme a Teams"** siempre visible para el clínico (sin la restricción de 24h).

### `/admin/clinico/disponibilidad`

**Sección "Mi horario base":**
- Tabla editable con filas por día de la semana.
- Cada fila: día, hora inicio, hora fin, activo (checkbox), botón borrar.
- Botón "Agregar bloque" para horarios partidos (ej. mañana + tarde el mismo día = dos filas para Lun).
- Cambios se guardan al instante (server action) y afectan disponibilidad futura.

**Sección "Bloqueos puntuales":**
- Lista de bloqueos activos.
- Botón "Bloquear tiempo" → modal con fecha-hora inicio / fin + razón.
- Si hay citas dentro del rango del bloqueo nuevo: error "Hay X citas dentro de este rango. Pide al admin reasignarlas primero."

### Permisos

- Clínico solo ve sus propias citas (RLS).
- No puede crear/cancelar/reagendar citas — solo el admin.
- Sí puede crear/editar/borrar sus propios `clinician_schedules` y `schedule_blocks`.

## Pagos — Wompi (fase final)

> **Nota de implementación:** Wompi es la **última fase** del proyecto. Mientras no se tengan credenciales, todo el flujo funciona vía pago manual offline registrado por admin. La tabla `payments` ya soporta ambos `source` desde el día 1.

### Flujo de compra Wompi

1. Paciente en `/agendar` Estado A → click "Pagar con Wompi" para el plan elegido.
2. Server action genera `payments` con `status='pending'`, `wompi_reference` único (`EVAL-{patient_id}-{timestamp}`), `amount_cop` desde `app_config` (no se confía en input del cliente).
3. Server action devuelve URL del **Widget Checkout Wompi** con: `public-key`, `currency=COP`, `amount-in-cents`, `reference`, `redirect-url`, `signature:integrity` calculada con `WOMPI_INTEGRITY_KEY`.
4. Cliente redirect a Wompi → paciente paga.
5. Wompi redirect → `/agendar?ref={reference}` (página de éxito tentativo).
6. **En paralelo**, Wompi envía webhook a `/api/webhooks/wompi`:
   - Valida firma HMAC (`x-event-signature`) usando `WOMPI_EVENTS_SECRET`. Rechaza con 401 si inválida.
   - Busca `payment` por `wompi_reference`.
   - Verifica que `amount_in_cents` recibido coincide con el guardado (anti-tampering).
   - Idempotencia: si `status` ya está en estado terminal, no-op.
   - Actualiza `status` (`approved` / `declined` / `voided` / `error`) y guarda `raw_payload`.
   - Si `approved`: INSERT en `evaluation_credits` con `amount` según plan, mensaje al paciente, email.
7. La página `/agendar` hace polling cada 3s al `payment` (o usa Supabase Realtime) hasta que pase a estado terminal. Si `approved` → transición animada al Estado B.

### Variables de entorno

```
WOMPI_PUBLIC_KEY=pub_prod_xxx
WOMPI_PRIVATE_KEY=prv_prod_xxx
WOMPI_EVENTS_SECRET=xxx
WOMPI_INTEGRITY_KEY=xxx
WOMPI_ENV=sandbox | production
```

Las llaves privadas **nunca** llegan al cliente — solo se usan en server actions y route handlers.

### Pago manual offline (disponible desde el día 1)

- Disparado únicamente desde el admin (`/admin/citas → Tab Pagos → Registrar pago manual`).
- INSERT `payments` con `source='manual_offline'`, `status='approved'`, `created_by_admin_id`, `notes`.
- INSERT `evaluation_credits`.
- Mensaje al paciente + email.
- Fila en `audit_log`.

## Notificaciones

### Mensajes en plataforma

Se reutiliza la tabla `messages` con dos columnas nuevas: `is_system` (boolean) y `message_kind` (text). El `MessageThread.tsx` existente renderiza mensajes del sistema con estilo distinto (icono CAIMED, sin avatar, no replyable directo).

### Email — Resend

`lib/email/resend.ts` exporta cliente único. `lib/email/templates/` contiene una plantilla por evento, construida con `@react-email/components`:

- `PaymentApprovedEmail` (Wompi)
- `ManualPaymentApprovedEmail`
- `AppointmentBookedPatientEmail`
- `AppointmentBookedClinicianEmail`
- `Reminder24hPatientEmail` (incluye link Teams ya activo)
- `Reminder1hPatientEmail`
- `Reminder1hClinicianEmail`
- `AppointmentCancelledPatientEmail`
- `AppointmentReassignedClinicianEmail`

Todas las plantillas reciben props tipadas y mantienen estilo visual de CAIMED.

### Variables de entorno

```
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=evaluaciones@<tu-dominio>.co
RESEND_REPLY_TO=admin@<tu-dominio>.co
```

### Recordatorios — Vercel Cron

`vercel.json` define dos cron jobs:

```json
{
  "crons": [
    { "path": "/api/cron/reminders-24h", "schedule": "0 * * * *" },
    { "path": "/api/cron/reminders-1h",  "schedule": "*/5 * * * *" }
  ]
}
```

Cada endpoint:
- Protegido con header `Authorization: Bearer ${CRON_SECRET}`.
- Busca `appointments` con `status='scheduled'` y `starts_at` dentro de la ventana correspondiente y `reminder_*_sent_at IS NULL`.
- Para cada cita: enqueue de email + mensaje plataforma → marca `reminder_*_sent_at = now()` (idempotencia).

### Manejo de fallos de email

Sin reintento aplicativo (Resend tiene retries internos). Cada envío logea en `email_log` con `status` y `error_message`. Admin puede reenviar manual desde la UI si es necesario.

### Sin verificar dominio (modo dev)

Si `RESEND_FROM_EMAIL` no tiene dominio verificado, Resend solo envía a la cuenta del dueño del API key. Funciona en local; los emails reales no se entregan a otros — útil para desarrollo.

## Reglas de negocio (consolidadas)

- **Slot duración:** 30 min.
- **Buffer entre citas:** 10 min (la siguiente cita posible empieza 40 min después de la anterior).
- **Anticipación mínima:** 24h.
- **Ventana de agendamiento:** sin límite hacia el futuro.
- **Round-robin:** clínico con menos citas futuras `scheduled`. Empate → menor `id` (determinístico).
- **Doble-booking imposible:** UNIQUE constraint en `(clinician_id, starts_at) WHERE status='scheduled'`.
- **FIFO de créditos:** se consume el `evaluation_credits` con `purchased_at` más antiguo.
- **Política de devolución de crédito al cancelar:** sugerida si faltan ≥24h, decisión final del admin.
- **No-show:** `status='no_show'`, default no devuelve crédito.
- **Validación previa a comprar:** ninguna — paciente activo cualquiera puede comprar.
- **Validación monto Wompi:** webhook compara `amount_in_cents` con valor guardado al crear el payment.
- **Re-asignación automática al desactivar clínico:** trigger SQL al cambiar `is_active=false` busca reemplazo del round-robin para cada cita futura. Si no encuentra → cita queda con `clinician_id` actual y banner aparece en `/admin`.

## Permisos (RLS resumida)

| Recurso | Patient | Clínico | Admin |
|---|---|---|---|
| Ver propio crédito y citas | ✓ | – | ✓ |
| Ver citas asignadas | – | ✓ (las suyas) | ✓ (todas) |
| Editar disponibilidad propia | – | ✓ | ✓ |
| Crear/cancelar citas | – | – | ✓ |
| Auto-cancelar | – | – | – |
| Registrar pago manual | – | – | ✓ |
| Ver `audit_log` y `email_log` | – | – | ✓ |
| Ver `payments.raw_payload` | – | – | ✓ |
| Ver nombre del clínico de su cita | – (nunca) | n/a | ✓ |

## Tech stack — adiciones

```
"resend"
"@react-email/components"
"date-fns"
"date-fns-tz"
```

No se instala librería de calendario externa. Las vistas se construyen custom con Tailwind + framer-motion + componentes propios, dejando el styling final al UI skill (ui-ux-pro-max) que el usuario ejecutará en una etapa posterior.

## Orden de implementación

Wompi al final. El sistema funciona end-to-end con pago manual offline desde la fase 3.

1. **Migración SQL** (`migration-v9-scheduling.sql`) — todas las tablas + RLS + función round-robin + trigger de re-asignación. Sin UI.
2. **`/admin/configuracion`** — campos para link Teams + precios. (Wompi keys disabled por ahora.)
3. **Pagos manuales del admin** — `/admin/citas → Tab Pagos → Registrar pago manual`. Crea payments + créditos.
4. **Disponibilidad del clínico** — `/admin/clinico/disponibilidad`. Permite que clínicos definan horarios y bloqueos.
5. **Cómputo de slots + selector del paciente** — `/agendar` con Estados A/B/C. En Estado A, botón "Solicitar pago" envía mensaje al admin (sin Wompi todavía).
6. **Vistas calendario admin** — `/admin/citas` Tabs "Calendario" y "Tabla de citas".
7. **Vista calendario clínico** — `/admin/clinico/agenda` con los 3 modos (Semana / Mes / Lista).
8. **Notificaciones in-platform** — mensajes del sistema en `messages`, `MessageThread.tsx` con estilo de sistema.
9. **Resend + plantillas + cron** — emails y recordatorios 24h y 1h.
10. **Casos límite** — re-asignación automática, alertas en dashboard, `audit_log`, `email_log`.
11. **(FASE FINAL) Wompi** — webhook, checkout, validaciones, agregar botón "Pagar con Wompi" en Estado A junto al de transferencia.

## Testing

**Unit tests críticos:**
- `pick_least_loaded_clinician(slot_start)` — casos con 0/1/N clínicos disponibles, empates, clínicos desactivados, bloqueados, ya con cita en el slot.
- `computeAvailableSlots(rangeStart, rangeEnd)` — caso normal, con buffer, con bloqueos, con citas existentes, ventana 24h en el borde.
- Validación de webhook Wompi — firma válida/inválida, monto manipulado, referencia inexistente, idempotencia (webhook duplicado).

**Integration tests del flujo completo:**
- Compra manual → agenda → completa.
- Compra manual → agenda → cancela con devolución → re-agenda.
- Compra manual de pack3 → agenda 3 veces → 4to intento falla por créditos en 0.
- Race: dos pacientes intentan reservar el mismo slot simultáneo → uno gana, otro recibe error claro.

**Tests con Wompi:**
- Sandbox de Wompi con tarjetas de prueba documentadas — no se mockea el SDK en tests críticos.

**Resend en tests:**
- Stub que escribe en `email_log` (status='sent') sin llamar a Resend real.

## Open questions / fase 2 (fuera de scope)

- Facturación electrónica DIAN.
- Reembolso real en plata vía API de Wompi (ahora: solo crédito).
- Lista de espera cuando no hay slots.
- Multi-link Teams (uno por clínico o convenio).
- Evaluaciones presenciales (todo es online por Teams en este spec).
- Expiración automática de créditos.
- Modificación del IVA si CAIMED no califica como exento.

---

## Resumen ejecutivo

Sistema de agendamiento online integrado a la plataforma actual: paciente paga (vía transferencia/manual al inicio, vía Wompi en fase final) → recibe créditos → agenda en un calendario tipo Calendly sin saber qué clínico le tocará → recibe link Teams 24h antes → tiene la cita. Admin tiene calendario maestro, gestiona pagos manuales y cancelaciones. Clínico tiene su agenda y su panel de disponibilidad. Notificaciones por mensaje y email para todos los eventos relevantes. Modelo "slots computados" sin tabla de slots, anti doble-booking por constraint DB, RLS estricta por rol, trail de auditoría.

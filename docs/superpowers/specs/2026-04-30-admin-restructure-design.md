# Restructuración del panel admin — diseño

**Fecha:** 2026-04-30
**Estado:** Diseño aprobado, pendiente plan de implementación

## Terminología

Toda la copia visible al usuario usa **"evaluación de salud"** (no "historia clínica" / "HC"). Los identificadores de código y tablas existentes pueden mantenerse hasta que se solicite un rename explícito.

## Contexto

La app pasó de ser únicamente "Escuela de pacientes" a un software integral de salud. El panel admin actual tiene 6 items planos en sidebar (Dashboard, Pacientes, Convenios, Códigos, Contenido, Blog) y un único rol admin. Hace falta:

1. Reorganizar la navegación en 3 grupos temáticos.
2. Introducir un rol clínico (médico/enfermero) con acceso limitado a evaluaciones de salud.
3. Agregar un dashboard con métricas clínicas agregadas.
4. Enriquecer el export a Excel con 47 columnas de datos clínicos.
5. Backup automático diario a Drive corporativo CAIMED.
6. Bloque de firma del clínico al final del PDF de evaluación de salud.
7. Restringir entradas numéricas en el cuestionario (sueño, actividad física).

## 1. Arquitectura general

### 1.1 Sidebar agrupado en 3 secciones

Un único sidebar con encabezados de sección no clicables. URLs actuales se preservan para no romper enlaces.

```
ESCUELA DE PACIENTES
  · Dashboard            /admin
  · Contenido            /admin/contenido
  · Blog                 /admin/blog

GESTIÓN ADMINISTRATIVA
  · Convenios            /admin/convenios
  · Códigos de acceso    /admin/codigos
  · Personal             /admin/personal          ← NUEVO

CLÍNICO
  · Dashboard clínico    /admin/clinico/dashboard ← NUEVO
  · Pacientes            /admin/pacientes
```

### 1.2 Roles

| Rol | Sidebar visible | Rutas accesibles |
|---|---|---|
| `admin` | Los 3 grupos completos | Todo `/admin/*` |
| `clinico` | Solo grupo "CLÍNICO" | `/admin/pacientes/*`, `/admin/clinico/*` |

Sub-tipo del clínico (`profession`) — `medico` / `enfermero` / `otro` — es informativo (firma del PDF), no de permisos.

## 2. Modelo de datos

### 2.1 Tabla `staff_profiles` (nueva)

Vinculada 1:1 con `auth.users.id`.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK FK→`auth.users.id` | |
| `full_name` | text NOT NULL | "Dra. María Pérez" |
| `role` | text NOT NULL CHECK IN ('admin','clinico') | |
| `profession` | text NULL CHECK IN ('medico','enfermero','otro') | Solo cuando `role='clinico'` |
| `specialty` | text NULL | Opcional |
| `medical_registration` | text NULL | Opcional |
| `professional_id_card` | text NULL | Opcional |
| `is_active` | boolean NOT NULL DEFAULT true | |
| `created_at`, `updated_at` | timestamptz | |

Reemplaza la lógica actual de "es admin si está en una lista de correos".

### 2.2 Auditoría en evaluaciones de salud

Agregar a la tabla existente de evaluaciones clínicas:

| Campo | Tipo | Uso |
|---|---|---|
| `created_by` | uuid NULL → `staff_profiles.id` | NULL = "Auto-diligenciado" |
| `last_modified_by` | uuid NULL → `staff_profiles.id` | Auditoría interna |
| `last_modified_at` | timestamptz | |

`created_at` ya existe; se reusa para la columna 1 del Excel y el "Registro" del bloque de firma.

### 2.3 Enforcement de permisos (defensa en profundidad)

**Capa 1 — Middleware Next.js** en el layout de `/admin`: lee `role` del usuario logueado. Si `role='clinico'` y la ruta no es `/admin/pacientes/*` ni `/admin/clinico/*`, redirige a `/admin/clinico/dashboard`.

**Capa 2 — RLS en Supabase**: políticas que solo permiten a `clinico` leer/escribir tablas de pacientes y evaluaciones. Tablas de convenios/códigos/blog/contenido bloqueadas para `clinico`.

### 2.4 Gestión de clínicos — `/admin/personal` (nueva, solo admin)

- Tabla con clínicos existentes (nombre, profesión, registro, estado activo).
- Botón **Invitar clínico** → form con: nombre, email, profesión, especialidad opcional, registro opcional, tarjeta profesional opcional. Envía magic link de Supabase Auth.
- Toggle activo/inactivo (no se borra para preservar `created_by` histórico).

## 3. Dashboard clínico — `/admin/clinico/dashboard`

Primera pantalla al hacer login para `clinico`. Admins también pueden entrar.

### 3.1 Filtros globales (aplican a todas las bandas)

- Convenio (multi-select)
- Médico responsable (multi-select)
- Rango de fechas de la última evaluación

### 3.2 Banda 1 — KPIs de cohorte

- Total pacientes activos · Nuevos este mes
- % evaluaciones completas · Pacientes sin evaluación en >6 meses (alerta)
- Distribución por convenio (donut)

### 3.3 Banda 2 — Promedios y distribuciones de los 14 componentes

Grilla de tarjetas:

| Tarjeta | Métrica principal |
|---|---|
| HbA1c | Promedio · % en meta (<7%) · % descontrolados (>9%) |
| Perfil lipídico | Promedios LDL · HDL · TG · colesterol total |
| Presión arterial | Promedios sistólica/diastólica · % HTA controlada |
| IMC | Promedio · % en cada categoría |
| Tabaquismo | % fumadores actuales · distribución escala nicotina (1–5) |
| Actividad física | Promedio min/semana · % cumple meta OMS (≥150 min) |
| Sueño | Promedio horas/noche · % con <6h |
| ARMS | Promedio · % buena adherencia |
| MSPSS | Promedio · distribución por nivel |
| HES | Promedio · distribución |
| PHQ-9 | Promedio · % con riesgo (≥10) |
| Alimentación | Promedio del score |
| Acceso a medicamentos | % sí/parcial/no |
| Antecedentes | Top 5 más frecuentes |

### 3.4 Banda 3 — Tendencias mes a mes (12 meses)

- HbA1c promedio
- ARMS promedio
- Pacientes evaluados por mes
- PHQ-9 promedio

### 3.5 Banda 4 — Alertas accionables

Listas clicables que llevan a la evaluación del paciente:

- Pacientes con HbA1c >9%
- Pacientes con ARMS bajo
- Pacientes con PHQ-9 ≥10
- Pacientes sin seguimiento en >6 meses

### 3.6 Implementación

- Vistas SQL materializadas en Supabase para promedios/distribuciones (refresco nocturno).
- Consultas directas para alertas (datos en vivo).

## 4. Export Excel + Backup a Drive

### 4.1 Estructura del Excel — 47 columnas, una hoja, una fila **por evaluación**

(Múltiples filas por paciente si tiene varias evaluaciones — la fecha en col. 1 las distingue.)

| # | Columna | Tipo | Notas |
|---|---|---|---|
| 1 | Fecha y hora de registro | datetime | `created_at` |
| 2 | Profesional responsable | texto | `staff_profiles.full_name` o `"Auto-diligenciado"` si `created_by` NULL |
| 3 | Primer nombre | texto | |
| 4 | Segundo nombre | texto | |
| 5 | Primer apellido | texto | |
| 6 | Segundo apellido | texto | |
| 7 | Tipo de documento | texto | |
| 8 | Documento | texto | |
| 9 | Fecha de nacimiento | fecha | |
| 10 | Teléfono | texto | |
| 11 | Correo | texto | |
| 12 | Género | texto | |
| 13 | País de nacimiento | texto | |
| 14 | País de residencia | texto | |
| 15 | Departamento | texto | |
| 16 | Municipio | texto | |
| 17 | Dirección | texto | |
| 18 | Contacto de emergencia | texto | nombre + teléfono |
| 19 | EPS | texto | |
| 20 | Régimen | texto | contributivo/subsidiado/especial |
| 21 | MSPSS | numérico | score total |
| 22 | HES | numérico | score total |
| 23 | Antecedentes | texto | concatenado coma: `"HTA, DM2, dislipidemia"` |
| 24 | Toma medicamentos | 1 / 0 | |
| 25 | Acceso medicamentos | 1 / 2 / 3 | sí / parcial / no |
| 26 | Razón principal | código numérico | catálogo a definir |
| 27 | ARMS | numérico | score total |
| 28 | Presión sistólica | numérico | |
| 29 | Presión diastólica | numérico | |
| 30 | Frecuencia cardíaca | numérico | |
| 31 | Frecuencia respiratoria | numérico | |
| 32 | Saturación O₂ | numérico | |
| 33 | Talla (cm) | numérico | |
| 34 | Peso (kg) | numérico | |
| 35 | Fecha perfil lipídico | fecha | |
| 36 | Colesterol total | numérico | |
| 37 | LDL | numérico | |
| 38 | HDL | numérico | |
| 39 | Triglicéridos | numérico | |
| 40 | Fecha HbA1c | fecha | |
| 41 | Valor HbA1c | numérico | |
| 42 | Tabaquismo | 1 / 0 | |
| 43 | Nicotina | 1–5 | mapeo: fumador actual cigarrillo=5, electrónico=5, exfumador <1a=4, 1–5a=3, >5a=2, no fumador=1 |
| 44 | Min actividad física | numérico | minutos/semana |
| 45 | Horas sueño | numérico | horas/noche |
| 46 | PHQ-9 | numérico | score total |
| 47 | Alimentación | numérico | score "Evaluación de alimentación" |

Una segunda hoja `Catálogos` documenta los códigos numéricos (razón principal, género, etc.). La hoja principal queda plana, una fila por evaluación.

### 4.2 Filtros antes de descargar (UI en `/admin/pacientes`)

- Convenio (multi-select)
- Médico responsable (multi-select)
- Rango de fechas de evaluación
- Estado evaluación: completa / incompleta / todas

### 4.3 Implementación técnica

- Librería: `exceljs` (server-side, en una API route de Next.js).
- Permisos: solo `admin` y `clinico` pueden invocar el endpoint.
- Catálogos definidos en `src/lib/clinical/constants.ts`.

### 4.4 Backup automático a Drive

- **Cron diario** vía Vercel Cron Job (02:00 hora Colombia).
- Genera el mismo Excel sin filtros (todos los pacientes/evaluaciones).
- Sube a una carpeta de Drive corporativa CAIMED vía Google Drive API.
- **Nombre:** `caimed-clinico-backup-YYYY-MM-DD.xlsx` (un archivo por día — historial accesible).
- **Retención:** últimos 90 días, se borran automáticamente los más antiguos.
- **Credenciales:** Service Account de Google con permiso de escritura en una carpeta compartida con esa cuenta. Credenciales JSON en variables de entorno de Vercel.
- **Botón manual** "Forzar backup ahora" en `/admin/pacientes` para admin.
- Tabla `backup_logs` para auditar: `(timestamp, status, file_url, error_message)`.

### 4.5 Pre-requisitos fuera del código

- Crear Service Account en Google Cloud (proyecto CAIMED).
- Crear carpeta en Drive corporativo CAIMED y compartirla con el email del Service Account.
- Configurar variables de entorno en Vercel: `GOOGLE_SA_EMAIL`, `GOOGLE_SA_PRIVATE_KEY`, `DRIVE_BACKUP_FOLDER_ID`.

## 5. PDF de evaluación de salud — bloque de firma

Se agrega al final de `ReportPage3.tsx`, después del contenido clínico:

```
─────────────────────────────────
Evaluación de salud realizada por:

Dra. María Pérez
Médica · Medicina interna
Reg. médico: 12345-COL
Tarjeta profesional: 67890

Registro: 30/04/2026 14:32
─────────────────────────────────
```

### 5.1 Reglas de armado

| Campo `staff_profiles` | Cómo se imprime | Si está vacío |
|---|---|---|
| `full_name` | Línea 1 | (siempre obligatorio) |
| `profession` + `specialty` | Línea 2 (`"Médica · Medicina interna"`) | Si especialidad NULL → solo profesión |
| `medical_registration` | Línea 3 (`"Reg. médico: …"`) | Línea omitida |
| `professional_id_card` | Línea 4 (`"Tarjeta profesional: …"`) | Línea omitida |
| `created_at` | Línea final (`"Registro: …"`) | Siempre presente |

### 5.2 Casos especiales

- **Auto-diligenciada** (`created_by` NULL): el bloque dice `"Auto-diligenciado por el paciente · Registro: …"` sin más datos.
- **Edición posterior**: la firma usa `created_by` original, no `last_modified_by`. La firma representa quien realizó la evaluación, no el último editor.

## 6. Cuestionario — inputs numéricos

En `Questionnaire.tsx`:

| Campo | Tipo de input | Validación |
|---|---|---|
| Horas de sueño/noche | `<input type="number">` | min=0, max=24, step=0.5 |
| Minutos de actividad física/semana | `<input type="number">` | min=0, max=1440, step=1 |

Validación en cliente (HTML5) + en server al guardar (rechaza fuera de rango). Texto libre ya no se acepta — esto facilita los promedios del dashboard y el dato del Excel.

## 7. Resumen del alcance

1. Sidebar agrupado en 3 secciones — solo cambio visual, URLs preservadas.
2. Tabla `staff_profiles` + rol `clinico`.
3. Auditoría `created_by`/`last_modified_by` en evaluaciones de salud.
4. Middleware + RLS para permisos del clínico.
5. Página `/admin/personal` para gestión de clínicos.
6. Dashboard clínico nuevo en `/admin/clinico/dashboard`.
7. Export Excel de 47 columnas con filtros.
8. Backup diario automático a Drive corporativo CAIMED + botón manual.
9. Bloque de firma al final del PDF basado en `created_by`.
10. Inputs numéricos en cuestionario para sueño y actividad física.

# Escuela de Pacientes — CAIMED Cardiopreventiva

Plataforma LMS de educación en salud cardiovascular. Los pacientes acceden a 14 módulos que se desbloquean semanalmente desde su fecha de registro.

**Stack**: Next.js 16 (App Router) + Supabase (Auth, DB, Storage) + Tailwind CSS v4

---

## Instalación local

```bash
# 1. Clonar e instalar dependencias
git clone <repo-url>
cd escuela-pacientes
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales de Supabase
```

## Configuración de Supabase

### 1. Crear proyecto en Supabase

Ir a [supabase.com](https://supabase.com) y crear un proyecto nuevo.

### 2. Obtener credenciales

En **Settings > API**, copiar:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Crear tablas y políticas

Ir a **SQL Editor** y ejecutar el contenido de:

```
supabase/schema.sql
```

Esto crea todas las tablas, índices y políticas RLS.

### 4. Cargar datos semilla

Ejecutar en SQL Editor:

```
supabase/seed.sql
```

### 5. Crear usuarios en Authentication

Ir a **Authentication > Users** y crear manualmente:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@caimed.co` | `Admin2025!` | Admin |
| `paciente@test.com` | `Test2025!` | Paciente de prueba |

Copiar los UUIDs generados y ejecutar en SQL Editor:

```sql
-- Reemplazar UUID-ADMIN y UUID-PACIENTE con los UUIDs reales

INSERT INTO public.users (id, name, email, role, registered_at)
VALUES ('UUID-ADMIN', 'Administrador CAIMED', 'admin@caimed.co', 'admin', now());

INSERT INTO public.users (id, name, email, role, access_code_used, registered_at)
VALUES ('UUID-PACIENTE', 'Paciente de Prueba', 'paciente@test.com', 'patient', 'CAIMED-A001', now() - interval '14 days');

UPDATE public.access_codes
SET is_used = true, used_by_user_id = 'UUID-PACIENTE', used_at = now() - interval '14 days'
WHERE code = 'CAIMED-A001';
```

### 6. Configurar Auth (opcional)

En **Authentication > Settings**:
- Desactivar "Enable email confirmations" si se quiere registro inmediato sin confirmar correo
- Configurar URL del sitio en "Site URL": `http://localhost:3000`
- Agregar redirect URL: `http://localhost:3000/auth/callback`

## Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

- **Login admin**: `admin@caimed.co` / `Admin2025!`
- **Login paciente**: `paciente@test.com` / `Test2025!`
- **Registro nuevo paciente**: usar código `CAIMED-A002` a `CAIMED-A005`

## Deploy en Vercel

1. Conectar repositorio en [vercel.com](https://vercel.com)
2. Configurar las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → URL del deploy (ej. `https://escuela.caimed.co`)
3. Deploy automático con cada push a `main`
4. Actualizar "Site URL" y "Redirect URLs" en Supabase Auth Settings con la URL de producción

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login, registro, reset password
│   ├── (dashboard)/     # Vistas del paciente (Mi Camino, módulos, mensajes, progreso)
│   ├── (admin)/         # Panel de administración
│   ├── api/admin/       # API routes (generar códigos, exportar CSV)
│   └── auth/callback/   # Callback de Supabase Auth
├── components/
│   ├── admin/           # Componentes del panel admin
│   ├── dashboard/       # Componentes del dashboard paciente
│   └── ui/              # Componentes UI reutilizables
├── lib/
│   ├── supabase/        # Clientes Supabase (server, client, admin)
│   └── modules.ts       # Lógica de desbloqueo de módulos
├── types/
│   └── database.ts      # Tipos TypeScript
└── proxy.ts             # Proxy (middleware) de autenticación
```

## Lógica de desbloqueo

Cada módulo se desbloquea automáticamente por tiempo:

```
Módulo N se desbloquea en: fecha_registro + (N-1) × 7 días
```

- Módulo 1: día 0 (inmediato)
- Módulo 2: día 7
- Módulo 14: día 91

El cálculo se hace en tiempo real en cada render, sin cron jobs.

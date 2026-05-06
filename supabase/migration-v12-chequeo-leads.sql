-- Chequeo Cardiovascular Express: leads table + is_clinico() helper

-- 1. Helper function for clinico role (mirrors is_admin())
create or replace function public.is_clinico()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'clinico'
  );
$$;

-- 2. Leads table
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  cedula text not null unique,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date not null,
  sexo text,
  telefono text not null,
  email text,
  pais text default 'Colombia',
  departamento text default 'Bogotá D.C.',
  municipio text default 'Bogotá',

  peso_kg numeric(5,2),
  talla_cm numeric(5,2),
  imc numeric(4,1),
  enfermedades text[] default '{}',
  medicamentos_texto text,
  acceso_medicamentos int,
  adherencia_simple int,
  fumador_nivel int,
  actividad_minutos int,
  horas_sueno numeric(3,1),

  is_dm2 boolean default false,
  is_sca boolean default false,

  score_parcial int not null,
  componentes_scores jsonb not null,
  nivel text not null,

  estado text not null default 'nuevo'
    check (estado in ('nuevo', 'contactado', 'interesado', 'agendado', 'convertido', 'descartado')),
  prioridad_score int default 0,
  asignado_a uuid references public.users(id),
  fuente text default 'web',
  notas text,

  user_id uuid references public.users(id) on delete set null,
  cuenta_creada boolean default false,

  ultimo_contacto_at timestamptz,
  intentos_contacto int default 0,
  historial_contacto jsonb default '[]'
);

create index idx_leads_estado on leads(estado);
create index idx_leads_prioridad on leads(prioridad_score desc);
create index idx_leads_created on leads(created_at desc);
create index idx_leads_cedula on leads(cedula);

-- 3. RLS
alter table leads enable row level security;

create policy "leads_insert_public"
  on leads for insert
  with check (true);

create policy "leads_select_staff"
  on leads for select
  using (public.is_admin() or public.is_clinico());

create policy "leads_update_staff"
  on leads for update
  using (public.is_admin() or public.is_clinico());

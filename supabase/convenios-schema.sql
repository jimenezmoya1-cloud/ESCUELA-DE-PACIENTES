-- ============================================
-- CONVENIOS + CAMBIOS EN USUARIOS Y CÓDIGOS
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Tabla de convenios
create table if not exists public.convenios (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,       -- BMG, BRINSA, CAIMED
  name text not null,              -- Boston Medical Group, Brinsa, etc.
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Columnas nuevas en users
alter table public.users
  add column if not exists cedula text,
  add column if not exists convenio_code text,
  add column if not exists is_active boolean default true;

-- 3. Columnas nuevas en access_codes
alter table public.access_codes
  add column if not exists cedula text,
  add column if not exists convenio_code text;

-- 4. RLS convenios
alter table public.convenios enable row level security;

create policy "Anyone can view active convenios"
  on public.convenios for select using (true);

create policy "Admins can manage convenios"
  on public.convenios for all using (public.is_admin());

-- 5. Seed convenios iniciales
insert into public.convenios (code, name) values
  ('BMG', 'Boston Medical Group'),
  ('BRINSA', 'Brinsa'),
  ('CAIMED', 'CAIMED Cardiopreventiva')
on conflict (code) do nothing;

-- ============================================
-- FIX: Recursión infinita en políticas RLS
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Crear función segura para verificar si el usuario es admin
-- Usa SECURITY DEFINER para bypassear RLS y evitar recursión
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Eliminar TODAS las políticas existentes

-- users
drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Admins can view all users" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Enable insert for registration" on public.users;

-- access_codes
drop policy if exists "Anyone can validate access codes" on public.access_codes;
drop policy if exists "Admins can manage access codes" on public.access_codes;
drop policy if exists "System can update access codes on registration" on public.access_codes;

-- modules
drop policy if exists "Anyone can view published modules" on public.modules;
drop policy if exists "Admins can view all modules" on public.modules;
drop policy if exists "Admins can manage modules" on public.modules;

-- content_blocks
drop policy if exists "Authenticated can view content blocks" on public.content_blocks;
drop policy if exists "Admins can manage content blocks" on public.content_blocks;

-- module_completions
drop policy if exists "Users can view own completions" on public.module_completions;
drop policy if exists "Users can insert own completions" on public.module_completions;
drop policy if exists "Admins can view all completions" on public.module_completions;

-- quiz_responses
drop policy if exists "Users can view own quiz responses" on public.quiz_responses;
drop policy if exists "Users can insert own quiz responses" on public.quiz_responses;
drop policy if exists "Admins can view all quiz responses" on public.quiz_responses;

-- task_submissions
drop policy if exists "Users can view own submissions" on public.task_submissions;
drop policy if exists "Users can insert own submissions" on public.task_submissions;
drop policy if exists "Admins can view all submissions" on public.task_submissions;

-- messages
drop policy if exists "Users can view own messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Users can mark messages as read" on public.messages;
drop policy if exists "Admins can view all messages" on public.messages;

-- sessions
drop policy if exists "Users can manage own sessions" on public.sessions;
drop policy if exists "Admins can view all sessions" on public.sessions;

-- 3. Recrear políticas usando is_admin()

-- USERS
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select
  using (public.is_admin());

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Admins can update all users"
  on public.users for update
  using (public.is_admin());

create policy "Enable insert for registration"
  on public.users for insert
  with check (true);

-- ACCESS CODES
create policy "Anyone can validate access codes"
  on public.access_codes for select
  using (true);

create policy "Anyone can update access codes"
  on public.access_codes for update
  using (true);

create policy "Admins can insert access codes"
  on public.access_codes for insert
  with check (public.is_admin());

create policy "Admins can delete access codes"
  on public.access_codes for delete
  using (public.is_admin());

-- MODULES
create policy "Anyone can view published modules"
  on public.modules for select
  using (is_published = true or public.is_admin());

create policy "Admins can insert modules"
  on public.modules for insert
  with check (public.is_admin());

create policy "Admins can update modules"
  on public.modules for update
  using (public.is_admin());

create policy "Admins can delete modules"
  on public.modules for delete
  using (public.is_admin());

-- CONTENT BLOCKS
create policy "Authenticated can view content blocks"
  on public.content_blocks for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert content blocks"
  on public.content_blocks for insert
  with check (public.is_admin());

create policy "Admins can update content blocks"
  on public.content_blocks for update
  using (public.is_admin());

create policy "Admins can delete content blocks"
  on public.content_blocks for delete
  using (public.is_admin());

-- MODULE COMPLETIONS
create policy "Users can view own completions"
  on public.module_completions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own completions"
  on public.module_completions for insert
  with check (auth.uid() = user_id);

-- QUIZ RESPONSES
create policy "Users can view own quiz responses"
  on public.quiz_responses for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own quiz responses"
  on public.quiz_responses for insert
  with check (auth.uid() = user_id);

-- TASK SUBMISSIONS
create policy "Users can view own submissions"
  on public.task_submissions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert own submissions"
  on public.task_submissions for insert
  with check (auth.uid() = user_id);

-- MESSAGES
create policy "Users can view own messages"
  on public.messages for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id or public.is_admin());

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = from_user_id);

create policy "Users can mark messages as read"
  on public.messages for update
  using (auth.uid() = to_user_id or public.is_admin());

-- SESSIONS
create policy "Users can manage own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

create policy "Admins can view all sessions"
  on public.sessions for select
  using (public.is_admin());

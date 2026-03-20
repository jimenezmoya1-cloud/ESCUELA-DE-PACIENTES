-- ============================================
-- ESCUELA DE PACIENTES CAIMED — Schema SQL
-- Para ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla: users (extiende auth.users de Supabase)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text not null default 'patient' check (role in ('patient', 'admin')),
  access_code_used text,
  registered_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- Tabla: access_codes
create table public.access_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  is_used boolean not null default false,
  used_by_user_id uuid references public.users(id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Tabla: modules
create table public.modules (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  short_description text,
  long_description text,
  "order" integer not null unique,
  days_to_unlock integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabla: content_blocks
create table public.content_blocks (
  id uuid default gen_random_uuid() primary key,
  module_id uuid not null references public.modules(id) on delete cascade,
  type text not null check (type in ('video', 'text', 'pdf', 'quiz', 'task')),
  content jsonb not null default '{}',
  "order" integer not null,
  created_at timestamptz not null default now()
);

-- Tabla: module_completions
create table public.module_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(user_id, module_id)
);

-- Tabla: quiz_responses
create table public.quiz_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  question_id text not null,
  answer jsonb not null,
  is_correct boolean,
  answered_at timestamptz not null default now()
);

-- Tabla: task_submissions
create table public.task_submissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  content text not null,
  submitted_at timestamptz not null default now()
);

-- Tabla: messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  from_user_id uuid not null references public.users(id) on delete cascade,
  to_user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  sent_at timestamptz not null default now(),
  read_at timestamptz
);

-- Tabla: sessions (tracking de actividad)
create table public.sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- ============================================
-- ÍNDICES
-- ============================================
create index idx_content_blocks_module on public.content_blocks(module_id);
create index idx_module_completions_user on public.module_completions(user_id);
create index idx_quiz_responses_user on public.quiz_responses(user_id);
create index idx_task_submissions_user on public.task_submissions(user_id);
create index idx_messages_to on public.messages(to_user_id);
create index idx_messages_from on public.messages(from_user_id);
create index idx_sessions_user on public.sessions(user_id);
create index idx_modules_order on public.modules("order");

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Users: cada usuario ve solo su propio perfil, admin ve todos
alter table public.users enable row level security;

create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Admins can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Enable insert for registration"
  on public.users for insert
  with check (true);

-- Access codes: lectura pública para validación, escritura para admin y sistema
alter table public.access_codes enable row level security;

create policy "Anyone can validate access codes"
  on public.access_codes for select
  using (true);

create policy "Admins can manage access codes"
  on public.access_codes for all
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "System can update access codes on registration"
  on public.access_codes for update
  using (true);

-- Modules: lectura pública (publicados), gestión admin
alter table public.modules enable row level security;

create policy "Anyone can view published modules"
  on public.modules for select
  using (is_published = true);

create policy "Admins can view all modules"
  on public.modules for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage modules"
  on public.modules for all
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Content blocks: lectura para autenticados, gestión admin
alter table public.content_blocks enable row level security;

create policy "Authenticated can view content blocks"
  on public.content_blocks for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage content blocks"
  on public.content_blocks for all
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Module completions: cada usuario ve/crea las suyas, admin ve todas
alter table public.module_completions enable row level security;

create policy "Users can view own completions"
  on public.module_completions for select
  using (auth.uid() = user_id);

create policy "Users can insert own completions"
  on public.module_completions for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all completions"
  on public.module_completions for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Quiz responses: cada usuario ve/crea las suyas, admin ve todas
alter table public.quiz_responses enable row level security;

create policy "Users can view own quiz responses"
  on public.quiz_responses for select
  using (auth.uid() = user_id);

create policy "Users can insert own quiz responses"
  on public.quiz_responses for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all quiz responses"
  on public.quiz_responses for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Task submissions: cada usuario ve/crea las suyas, admin ve todas
alter table public.task_submissions enable row level security;

create policy "Users can view own submissions"
  on public.task_submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert own submissions"
  on public.task_submissions for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all submissions"
  on public.task_submissions for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Messages: usuarios ven mensajes donde son emisor o receptor
alter table public.messages enable row level security;

create policy "Users can view own messages"
  on public.messages for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = from_user_id);

create policy "Users can mark messages as read"
  on public.messages for update
  using (auth.uid() = to_user_id);

create policy "Admins can view all messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- Sessions: cada usuario ve las suyas, admin ve todas
alter table public.sessions enable row level security;

create policy "Users can manage own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

create policy "Admins can view all sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.users where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================
-- FUNCIÓN: actualizar updated_at automáticamente
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_module_updated
  before update on public.modules
  for each row execute function public.handle_updated_at();

-- ============================================
-- SISTEMA DE RECOMPENSAS — Escuela de Pacientes CAIMED
-- Ejecutar en SQL Editor de Supabase
-- ============================================

-- 1. Tabla de puntos del usuario
alter table public.users
  add column if not exists total_points integer default 0,
  add column if not exists current_streak integer default 0,
  add column if not exists best_streak integer default 0,
  add column if not exists last_activity_date date;

-- 2. Definiciones de logros
create table if not exists public.achievements (
  id uuid default gen_random_uuid() primary key,
  key text unique not null,
  title text not null,
  description text not null,
  category text not null, -- 'modules', 'quizzes', 'tasks', 'streaks', 'special'
  icon text not null, -- nombre del icono SVG
  points integer not null default 0,
  requirement_type text not null, -- 'modules_completed', 'quizzes_perfect', 'tasks_submitted', 'streak_days', 'all_complete'
  requirement_value integer not null default 1,
  tier text not null default 'bronze', -- 'bronze', 'silver', 'gold', 'platinum', 'diamond'
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- 3. Logros desbloqueados por usuario
create table if not exists public.user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  achievement_id uuid references public.achievements(id) on delete cascade not null,
  unlocked_at timestamptz default now(),
  notified boolean default false,
  unique(user_id, achievement_id)
);

-- 4. Historial de puntos
create table if not exists public.points_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  points integer not null,
  reason text not null, -- 'module_complete', 'quiz_perfect', 'task_submit', 'streak_bonus', 'achievement_unlock'
  reference_id text, -- module_id, achievement_id, etc.
  created_at timestamptz default now()
);

-- 5. RLS
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.points_log enable row level security;

-- Achievements: todos pueden leer
create policy "Anyone can view achievements" on public.achievements for select using (true);
create policy "Admins can manage achievements" on public.achievements for all using (public.is_admin());

-- User achievements: usuario ve los suyos, admin ve todos
create policy "Users can view own achievements" on public.user_achievements for select
  using (auth.uid() = user_id or public.is_admin());
create policy "System can insert achievements" on public.user_achievements for insert
  with check (auth.uid() = user_id);

-- Points log: usuario ve los suyos
create policy "Users can view own points" on public.points_log for select
  using (auth.uid() = user_id or public.is_admin());
create policy "System can insert points" on public.points_log for insert
  with check (auth.uid() = user_id);

-- 6. Seed: Definiciones de logros

insert into public.achievements (key, title, description, category, icon, points, requirement_type, requirement_value, tier, sort_order) values
-- MÓDULOS
('first_module', 'Primer Paso', 'Completaste tu primer módulo. ¡El camino comienza!', 'modules', 'footsteps', 50, 'modules_completed', 1, 'bronze', 1),
('three_modules', 'En Marcha', 'Has completado 3 módulos. ¡Vas por buen camino!', 'modules', 'flame', 100, 'modules_completed', 3, 'bronze', 2),
('five_modules', 'Medio Camino', 'Ya llevas 5 módulos completados.', 'modules', 'mountain', 150, 'modules_completed', 5, 'silver', 3),
('seven_modules', 'Constancia', '7 módulos completados. ¡Increíble dedicación!', 'modules', 'heartbeat', 200, 'modules_completed', 7, 'silver', 4),
('ten_modules', 'Casi Allí', '10 módulos completados. ¡La meta está cerca!', 'modules', 'target', 300, 'modules_completed', 10, 'gold', 5),
('twelve_modules', 'Imparable', '12 módulos completados. ¡Nada te detiene!', 'modules', 'rocket', 400, 'modules_completed', 12, 'gold', 6),
('all_modules', 'Graduado CAIMED', 'Completaste los 14 módulos. ¡Eres un ejemplo!', 'modules', 'graduation', 500, 'modules_completed', 14, 'diamond', 7),

-- QUIZZES
('first_quiz', 'Curioso', 'Respondiste tu primer quiz.', 'quizzes', 'lightbulb', 30, 'quizzes_completed', 1, 'bronze', 10),
('quiz_perfect', 'Respuesta Perfecta', 'Obtuviste 100% en un quiz.', 'quizzes', 'star', 75, 'quizzes_perfect', 1, 'silver', 11),
('quiz_master', 'Maestro del Saber', 'Perfecto en 5 quizzes diferentes.', 'quizzes', 'crown', 250, 'quizzes_perfect', 5, 'gold', 12),

-- TAREAS
('first_task', 'Manos a la Obra', 'Enviaste tu primera tarea.', 'tasks', 'pencil', 40, 'tasks_submitted', 1, 'bronze', 20),
('five_tasks', 'Dedicación', 'Has enviado 5 tareas.', 'tasks', 'clipboard', 150, 'tasks_submitted', 5, 'silver', 21),
('all_tasks', 'Compromiso Total', 'Enviaste todas las tareas disponibles.', 'tasks', 'medal', 300, 'tasks_submitted', 14, 'gold', 22),

-- RACHAS
('streak_3', 'Racha de 3', '3 días consecutivos activo en la plataforma.', 'streaks', 'calendar', 60, 'streak_days', 3, 'bronze', 30),
('streak_7', 'Semana Perfecta', '7 días consecutivos de actividad.', 'streaks', 'fire', 150, 'streak_days', 7, 'silver', 31),
('streak_14', 'Dos Semanas', '14 días seguidos. ¡Disciplina de campeón!', 'streaks', 'bolt', 300, 'streak_days', 14, 'gold', 32),
('streak_30', 'Hábito de Salud', '30 días consecutivos. Esto ya es un estilo de vida.', 'streaks', 'shield', 500, 'streak_days', 30, 'platinum', 33),

-- ESPECIALES
('speed_learner', 'Aprendiz Veloz', 'Completaste un módulo el mismo día que se desbloqueó.', 'special', 'bolt', 100, 'speed_complete', 1, 'silver', 40),
('full_program', 'Corazón de Campeón', 'Completaste TODO: módulos, quizzes y tareas. Descuento del 30% desbloqueado.', 'special', 'trophy', 1000, 'all_complete', 1, 'diamond', 50);

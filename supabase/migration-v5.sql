-- Migration v5: Rewards system overhaul
-- Run this in Supabase SQL Editor

-- 1. Wipe the old rewards data (no production users yet)
TRUNCATE TABLE public.user_achievements CASCADE;
TRUNCATE TABLE public.achievements CASCADE;
TRUNCATE TABLE public.points_log CASCADE;

-- 2. Drop unused columns on users
ALTER TABLE public.users DROP COLUMN IF EXISTS total_points;
ALTER TABLE public.users DROP COLUMN IF EXISTS quizzes_perfect;
ALTER TABLE public.users DROP COLUMN IF EXISTS tasks_submitted;

-- 3. Add module_key column to achievements (nullable — only used by module badges)
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS module_key text;

-- 4. Drop/widen the tier + points columns (we don't use them anymore)
ALTER TABLE public.achievements ALTER COLUMN points DROP NOT NULL;
ALTER TABLE public.achievements ALTER COLUMN tier DROP NOT NULL;

-- 5. Certificates table
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  certificate_number text NOT NULL UNIQUE,
  UNIQUE(user_id)
);

ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificate"
  ON public.user_certificates FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "System can insert certificates"
  ON public.user_certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. Seed: 29 achievements

-- 16 module badges
INSERT INTO public.achievements (key, title, description, category, icon, requirement_type, requirement_value, module_key, sort_order) VALUES
  ('module_empowerment',          'Inicio del ciclo',             'Completaste el módulo de inicio.',                 'module', 'Compass',         'module_complete', 1, 'empowerment',          1),
  ('module_el_incendio',          'El incendio que vamos a apagar','Aprendiste la metáfora del incendio.',             'module', 'Flame',           'module_complete', 1, 'el_incendio',          2),
  ('module_empoderamiento_salud', 'Empoderamiento en salud',      'Tomaste las riendas de tu salud.',                 'module', 'Sparkles',        'module_complete', 1, 'empoderamiento_salud', 3),
  ('module_red_de_apoyo',         'Red de apoyo',                 'Fortaleciste tu red de apoyo.',                    'module', 'Users',           'module_complete', 1, 'red_de_apoyo',         4),
  ('module_adherencia',           'Adherencia a medicamentos',    'Aprendiste a cuidar tu tratamiento.',              'module', 'Pill',            'module_complete', 1, 'adherencia',           5),
  ('module_salud_sexual',         'Salud sexual masculina',       'Cuidaste este aspecto importante de tu salud.',    'module', 'HeartHandshake',  'module_complete', 1, 'salud_sexual',         6),
  ('module_actividad_fisica',     'Actividad física',             'Pusiste tu cuerpo en movimiento.',                 'module', 'Activity',        'module_complete', 1, 'actividad_fisica',     7),
  ('module_alimentacion',         'Alimentación',                 'Mejoraste tu alimentación.',                       'module', 'Apple',           'module_complete', 1, 'alimentacion',         8),
  ('module_salud_mental',         'Salud mental',                 'Cuidaste tu salud mental.',                        'module', 'Brain',           'module_complete', 1, 'salud_mental',         9),
  ('module_sueno',                'Salud del sueño',              'Diste prioridad a tu descanso.',                   'module', 'Moon',            'module_complete', 1, 'sueno',               10),
  ('module_presion_arterial',     'Presión arterial',             'Aprendiste a cuidar tu presión arterial.',         'module', 'Heart',           'module_complete', 1, 'presion_arterial',    11),
  ('module_glucosa',              'Glucosa',                      'Aprendiste a cuidar tus niveles de glucosa.',      'module', 'Droplet',         'module_complete', 1, 'glucosa',             12),
  ('module_colesterol',           'Colesterol',                   'Aprendiste a cuidar tu colesterol.',               'module', 'CircleDashed',    'module_complete', 1, 'colesterol',          13),
  ('module_nicotina',             'Nicotina',                     'Entendiste el impacto de la nicotina.',            'module', 'CigaretteOff',    'module_complete', 1, 'nicotina',            14),
  ('module_control_peso',         'Control del peso',             'Trabajaste en el control de tu peso.',             'module', 'Scale',           'module_complete', 1, 'control_peso',        15),
  ('module_cierre',               'Cierre de ciclo',              'Cerraste tu ciclo de aprendizaje.',                'module', 'GraduationCap',   'module_complete', 1, 'empowerment_cierre',  16);

-- 5 special badges
INSERT INTO public.achievements (key, title, description, category, icon, requirement_type, requirement_value, module_key, sort_order) VALUES
  ('special_welcome',        'Bienvenida',             'Iniciaste tu camino en Escuela de Pacientes.', 'special', 'Handshake',    'first_login',     1,  NULL, 101),
  ('special_first_module',   'Primer módulo completo', 'Completaste tu primer módulo.',                'special', 'Leaf',         'modules_count',   1,  NULL, 102),
  ('special_three_modules',  '3 módulos completos',    'Completaste 3 módulos.',                       'special', 'Sprout',       'modules_count',   3,  NULL, 103),
  ('special_six_modules',    '6 módulos completos',    'Completaste 6 módulos.',                       'special', 'TreePalm',     'modules_count',   6,  NULL, 104),
  ('special_firefighter',    'Bombero oficial',        'Apagaste el incendio. Eres un bombero oficial.','special', 'Siren',        'all_modules',     1,  NULL, 105);

-- 8 streak badges
INSERT INTO public.achievements (key, title, description, category, icon, requirement_type, requirement_value, module_key, sort_order) VALUES
  ('streak_1',  'Primer día',     'Entraste a la plataforma.',              'streak', 'Flame', 'streak_days',  1, NULL, 201),
  ('streak_3',  '3 días',         '3 días conectado seguidos.',             'streak', 'Flame', 'streak_days',  3, NULL, 202),
  ('streak_7',  'Una semana',     'Una semana conectado.',                  'streak', 'Flame', 'streak_days',  7, NULL, 203),
  ('streak_10', '10 días',        '10 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 10, NULL, 204),
  ('streak_15', '15 días',        '15 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 15, NULL, 205),
  ('streak_20', '20 días',        '20 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 20, NULL, 206),
  ('streak_30', 'Un mes',         'Un mes conectado seguidos.',             'streak', 'Flame', 'streak_days', 30, NULL, 207),
  ('streak_60', 'Dos meses',      '60 días conectado seguidos.',            'streak', 'Flame', 'streak_days', 60, NULL, 208);

-- ============================================
-- SEED DATA — Escuela de Pacientes CAIMED
-- ============================================
-- NOTA: El usuario admin y el paciente de prueba deben crearse
-- primero en Supabase Auth (Dashboard > Authentication > Users).
-- Luego ejecutar este script con los UUIDs generados.
--
-- Admin: admin@caimed.co / Admin2025!
-- Paciente: paciente@test.com / Test2025!
--
-- Reemplazar los UUIDs de ejemplo con los reales.
-- ============================================

-- Variables placeholder (reemplazar con UUIDs reales de auth.users)
-- UUID_ADMIN = 'REEMPLAZAR-CON-UUID-ADMIN'
-- UUID_PACIENTE = 'REEMPLAZAR-CON-UUID-PACIENTE'

-- 1. Códigos de acceso
insert into public.access_codes (code, is_used, created_at) values
  ('CAIMED-A001', false, now()),
  ('CAIMED-A002', false, now()),
  ('CAIMED-A003', false, now()),
  ('CAIMED-A004', false, now()),
  ('CAIMED-A005', false, now());

-- 2. Módulos (14 módulos del programa)
insert into public.modules (title, short_description, long_description, "order", days_to_unlock, is_published) values
(
  'Tu mapa personal de salud',
  'Empoderamiento en salud (E1): Tu mapa personal de salud con base en el CAIMED Score',
  'En este módulo introductorio, usted conocerá su CAIMED Score: una herramienta diseñada para evaluar de forma integral su riesgo cardiovascular. Aprenderá a interpretar sus resultados, identificar áreas de oportunidad y establecer metas realistas para las próximas semanas. Este es el punto de partida de su camino hacia una mejor salud cardiovascular.',
  1, 0, true
),
(
  'Rompe el sedentarismo',
  'Actividad física (AF): Cómo interrumpir el sedentarismo mejora tu corazón',
  'El sedentarismo es uno de los principales factores de riesgo cardiovascular modificables. En este módulo aprenderá por qué interrumpir los períodos prolongados de inactividad tiene un impacto directo en la salud de su corazón. Descubrirá estrategias prácticas para incorporar movimiento en su rutina diaria, sin necesidad de ir a un gimnasio.',
  2, 7, true
),
(
  'El plato saludable de la familia colombiana',
  'Alimentación (A): El plato saludable de la familia colombiana',
  'La alimentación es medicina preventiva. En este módulo exploraremos las guías alimentarias adaptadas a la realidad colombiana: qué alimentos priorizar, cómo preparar un plato balanceado y cómo realizar cambios graduales en la alimentación de toda la familia. Aprenderá a leer etiquetas nutricionales y a tomar decisiones informadas en el supermercado.',
  3, 14, true
),
(
  'Salud sexual masculina',
  'Salud sexual masculina (SSM): A cargo de BMG — contenido por definir',
  'Este módulo está a cargo del equipo de Boston Medical Group. El contenido estará disponible próximamente. La salud sexual masculina está directamente relacionada con la salud cardiovascular, y este módulo explorará esa conexión desde una perspectiva médica integral.',
  4, 21, true
),
(
  'La verdad sobre el control del peso',
  'Control del peso (CP): Más allá de la fuerza de voluntad',
  'El control del peso no se trata solo de dietas restrictivas o fuerza de voluntad. En este módulo entenderá los mecanismos fisiológicos que regulan el peso corporal, por qué las dietas extremas fallan a largo plazo, y qué estrategias basadas en evidencia realmente funcionan. Aprenderá a establecer metas realistas y sostenibles.',
  5, 28, true
),
(
  'Entendiendo el enemigo silencioso',
  'Presión arterial (PA): Normal, elevada e hipertensión',
  'La hipertensión arterial es conocida como el "enemigo silencioso" porque rara vez presenta síntomas hasta que causa daño significativo. En este módulo aprenderá qué significan los números de su presión arterial, cuándo preocuparse, cómo medirla correctamente en casa, y qué cambios en su estilo de vida pueden ayudar a controlarla.',
  6, 35, true
),
(
  'El origen de la salud metabólica',
  'Glucosa (G): Glucosa, prediabetes y 5 hábitos clave',
  'La glucosa elevada y la resistencia a la insulina son precursoras de la diabetes tipo 2 y un factor de riesgo cardiovascular importante. Entenderá cómo funciona el metabolismo de la glucosa, qué es la prediabetes, y descubrirá 5 hábitos basados en evidencia que pueden revertir esta condición antes de que progrese.',
  7, 42, true
),
(
  'El colesterol como un aliado',
  'Colesterol (C): Entendiendo tu biología',
  'El colesterol no es el villano que muchos creen. En este módulo aprenderá a entender su perfil lipídico, la diferencia entre colesterol "bueno" y "malo", qué significan realmente sus números, y cómo la alimentación, el ejercicio y los medicamentos trabajan juntos para mantener niveles saludables.',
  8, 49, true
),
(
  'Tu plan para dejar de fumar',
  'Exposición a nicotina (EN): Beneficios inmediatos y el día D',
  'Si usted fuma o está expuesto a nicotina, este módulo le ayudará a crear un plan personalizado para dejarlo. Conocerá los beneficios inmediatos que experimenta su cuerpo desde las primeras horas sin fumar, aprenderá técnicas probadas para manejar la ansiedad y los deseos, y establecerá su "Día D" — el día en que tomará la decisión.',
  9, 56, true
),
(
  'El renacer de tu conciencia emocional',
  'Salud mental (SM): Emociones e impacto cardiovascular',
  'Las emociones tienen un impacto directo en su corazón. El estrés crónico, la ansiedad y la depresión son factores de riesgo cardiovascular tan importantes como el colesterol alto. En este módulo explorará la conexión mente-corazón, aprenderá técnicas de regulación emocional y descubrirá cuándo es importante buscar ayuda profesional.',
  10, 63, true
),
(
  'Arquitecto de tu descanso',
  'Salud del sueño (SS): Higiene del sueño basada en evidencia',
  'Dormir bien no es un lujo, es una necesidad fisiológica. La falta de sueño aumenta significativamente el riesgo cardiovascular. En este módulo aprenderá los principios de la higiene del sueño basada en evidencia: cómo crear un ambiente ideal para dormir, rutinas que funcionan, y cuándo los problemas de sueño requieren atención médica.',
  11, 70, true
),
(
  'Identificando tu red de apoyo',
  'Red de apoyo (RA): Familia, salud y vínculos',
  'Ningún cambio de estilo de vida es sostenible sin una red de apoyo. En este módulo identificará a las personas clave en su vida que pueden acompañarlo en este proceso, aprenderá a comunicar sus necesidades de salud a su familia, y descubrirá cómo los vínculos sociales fuertes protegen su corazón.',
  12, 77, true
),
(
  'Medicamentos y estilo de vida',
  'Adherencia a medicamentos (AM): ¿Se reemplazan o se complementan?',
  'Una de las preguntas más comunes es si los cambios en el estilo de vida pueden reemplazar los medicamentos. La respuesta es matizada. En este módulo entenderá cómo funcionan sus medicamentos cardiovasculares, por qué la adherencia es crucial, y cómo el estilo de vida y los medicamentos trabajan juntos para proteger su salud.',
  13, 84, true
),
(
  'Cierre de ciclo: lo que descubrí en mí',
  'Empoderamiento cierre (E2): Resultados, fortalezas, próximos pasos',
  'Ha llegado al final del programa. En este módulo de cierre, revisará su progreso desde el primer día, comparará su CAIMED Score inicial con el actual, identificará las fortalezas que desarrolló y los hábitos que adoptó. Establecerá un plan de mantenimiento y recibirá orientación sobre los próximos pasos para seguir cuidando su salud cardiovascular.',
  14, 91, true
);

-- 3. Contenido placeholder para cada módulo
-- (Se insertará contenido real desde el CMS admin)

-- Módulo 1: Contenido introductorio
insert into public.content_blocks (module_id, type, content, "order")
select id, 'text',
  '{"html": "<h2>Bienvenido a la Escuela de Pacientes</h2><p>Este es el inicio de su camino hacia una mejor salud cardiovascular. En las próximas semanas, aprenderá herramientas prácticas y basadas en evidencia para cuidar su corazón.</p><p>El CAIMED Score es una evaluación integral que considera múltiples factores de riesgo. Su médico le explicará sus resultados y juntos establecerán metas para las próximas 14 semanas.</p><h3>¿Qué aprenderá en este módulo?</h3><ul><li>Qué es el CAIMED Score y cómo se calcula</li><li>Cómo interpretar sus resultados</li><li>Cómo establecer metas realistas</li></ul>"}'::jsonb,
  1
from public.modules where "order" = 1;

-- Módulo 4: Placeholder de BMG
insert into public.content_blocks (module_id, type, content, "order")
select id, 'text',
  '{"html": "<h2>Módulo a cargo de Boston Medical Group</h2><p>Este módulo está a cargo del equipo de Boston Medical Group. El contenido estará disponible próximamente.</p><p>La salud sexual masculina está directamente relacionada con la salud cardiovascular. Este módulo explorará esa conexión desde una perspectiva médica integral.</p>"}'::jsonb,
  1
from public.modules where "order" = 4;

-- Contenido placeholder para módulos 2-3, 5-14
do $$
declare
  mod record;
begin
  for mod in select id, "order", title from public.modules where "order" not in (1, 4) order by "order"
  loop
    insert into public.content_blocks (module_id, type, content, "order")
    values (
      mod.id,
      'text',
      json_build_object(
        'html',
        '<h2>' || mod.title || '</h2><p>Contenido educativo del módulo en desarrollo. El equipo de CAIMED está preparando material especializado para este tema.</p><p>Pronto encontrará aquí videos, lecturas y actividades diseñadas para ayudarle a mejorar su salud cardiovascular.</p>'
      )::jsonb,
      1
    );
  end loop;
end $$;

-- NOTA IMPORTANTE:
-- Para crear el admin y el paciente de prueba:
--
-- 1. En Supabase Dashboard > Authentication > Users, crear:
--    - admin@caimed.co con contraseña Admin2025!
--    - paciente@test.com con contraseña Test2025!
--
-- 2. Copiar los UUIDs generados y ejecutar:
--
-- INSERT INTO public.users (id, name, email, role, registered_at)
-- VALUES ('UUID-DEL-ADMIN', 'Administrador CAIMED', 'admin@caimed.co', 'admin', now());
--
-- INSERT INTO public.users (id, name, email, role, access_code_used, registered_at)
-- VALUES ('UUID-DEL-PACIENTE', 'Paciente de Prueba', 'paciente@test.com', 'patient', 'CAIMED-A001', now() - interval '14 days');
--
-- UPDATE public.access_codes
-- SET is_used = true, used_by_user_id = 'UUID-DEL-PACIENTE', used_at = now() - interval '14 days'
-- WHERE code = 'CAIMED-A001';

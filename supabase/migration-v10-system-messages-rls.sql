-- ============================================
-- v10 — RLS FIX: permitir system messages
-- ============================================

-- La policy actual rechaza inserts con from_user_id NULL (mensajes de sistema).
-- La actualizamos para que humanos sigan validando auth.uid()=from_user_id.
--
-- Los mensajes de sistema se insertan SOLO via service role (admin client),
-- que bypasea RLS. NO agregamos un branch para is_system=true porque cualquier
-- branch evaluable por sesiones autenticadas sería un vector para forjar
-- mensajes de sistema falsos desde el navegador con la anon key.

drop policy if exists "Users can send messages" on public.messages;

create policy "Users can send messages"
  on public.messages
  for insert
  with check (
    is_system = false
    and auth.uid() = from_user_id
  );

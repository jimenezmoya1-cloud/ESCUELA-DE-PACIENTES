-- ============================================
-- v10 — RLS FIX: permitir system messages
-- ============================================

-- La policy actual rechaza inserts con from_user_id NULL (mensajes de sistema).
-- La actualizamos para permitir is_system=true sin from_user_id, manteniendo
-- la regla original para mensajes humano-a-humano.

drop policy if exists "Users can send messages" on public.messages;

create policy "Users can send messages"
  on public.messages
  for insert
  with check (
    -- Mensajes humanos: el from_user_id debe ser el actor autenticado
    (is_system = false and auth.uid() = from_user_id)
    -- Mensajes de sistema: el insert los hace el service role (bypass RLS),
    -- pero por defensa explícita, permitimos solo cuando is_system=true y from_user_id es NULL
    or
    (is_system = true and from_user_id is null)
  );

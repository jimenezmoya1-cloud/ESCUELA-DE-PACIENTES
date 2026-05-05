-- ============================================
-- v11 — CLINICIAN DEACTIVATION TRIGGER + AUDIT
-- ============================================

-- 1. Relax audit_log.actor_id para permitir entries del sistema (trigger SQL).
alter table public.audit_log alter column actor_id drop not null;

-- 2. Función que se ejecuta cuando un clínico se desactiva (is_active true→false).
--    Itera sus citas futuras 'scheduled' e intenta reasignarlas via
--    pick_least_loaded_clinician(slot). Las que no encuentran reemplazo
--    quedan con clinician_id apuntando al inactivo (huérfanas).
--    Cada caso registra audit_log para que el admin las pueda ver/notificar.

create or replace function public.handle_clinician_deactivation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  cita record;
  new_clinician uuid;
begin
  -- Solo nos interesa la transición true → false en clínicos
  if not (old.is_active = true and new.is_active = false and new.role = 'clinico') then
    return new;
  end if;

  for cita in
    select id, starts_at
    from public.appointments
    where clinician_id = new.id
      and status = 'scheduled'
      and starts_at >= now()
  loop
    -- Intentar encontrar reemplazo
    new_clinician := public.pick_least_loaded_clinician(cita.starts_at);

    if new_clinician is not null and new_clinician <> new.id then
      -- Reasignar
      update public.appointments
      set clinician_id = new_clinician,
          reminder_24h_sent_at = null,
          reminder_1h_sent_at = null
      where id = cita.id;

      insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
      values (
        null,                                            -- 'sistema'
        'clinician_auto_reassigned',
        'appointment',
        cita.id,
        jsonb_build_object(
          'old_clinician_id', new.id,
          'new_clinician_id', new_clinician,
          'starts_at', cita.starts_at
        )
      );
    else
      -- No hay reemplazo: marcar como huérfana en audit (la cita queda como está)
      insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
      values (
        null,
        'clinician_orphaned_appointment',
        'appointment',
        cita.id,
        jsonb_build_object(
          'old_clinician_id', new.id,
          'starts_at', cita.starts_at
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

-- 3. Trigger after update on users — solo dispara cuando is_active cambia
drop trigger if exists on_clinician_deactivated on public.users;
create trigger on_clinician_deactivated
  after update of is_active on public.users
  for each row
  when (old.is_active is distinct from new.is_active)
  execute function public.handle_clinician_deactivation();

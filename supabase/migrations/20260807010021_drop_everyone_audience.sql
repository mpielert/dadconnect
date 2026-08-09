-- Finalize the event-audience change now that the new code has shipped
-- (migration 19 kept 'everyone' valid only for the deploy window). The deployed
-- form/action only ever send 'selected' or 'first_gen', so it's safe to drop
-- 'everyone' — otherwise a member could POST audience='everyone' directly and
-- make an event community-wide, bypassing the intended choice.

update events set audience = 'first_gen' where audience = 'everyone';

alter table events alter column audience set default 'selected';
alter table events drop constraint if exists events_audience_check;
alter table events
  add constraint events_audience_check check (audience in ('selected', 'first_gen'));

create or replace function can_see_event(p_event_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from events e
    where e.event_id = p_event_id
      and (
        e.created_by = current_member_id()
        or (e.audience = 'selected' and exists (
          select 1 from event_invitees i
          where i.event_id = e.event_id and i.member_id = current_member_id()
        ))
        or (e.audience = 'first_gen' and exists (
          select 1 from members me
          where me.member_id = current_member_id()
            and me.generation = 'original'
            and me.departed_at is null
        ))
      )
  );
$$;

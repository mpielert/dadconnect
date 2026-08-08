-- Deploy-order safety for migration 18. The currently-deployed events form
-- still creates 'everyone' events (default), so migration 18's check — which
-- dropped 'everyone' — would break event creation on prod until the new code
-- ships. Keep 'everyone' valid AND visible until then. The NEW createEvent
-- action rejects 'everyone' and the new form only offers selected/first_gen,
-- so no new 'everyone' events appear once the code deploys.

alter table events drop constraint if exists events_audience_check;
alter table events add constraint events_audience_check
  check (audience in ('everyone', 'selected', 'first_gen'));

create or replace function can_see_event(p_event_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from events e
    where e.event_id = p_event_id
      and (
        e.audience = 'everyone'
        or e.created_by = current_member_id()
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

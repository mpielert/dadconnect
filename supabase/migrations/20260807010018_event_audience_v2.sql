-- Event audience refinement: drop "everyone"; an event is either for a
-- 'selected' set of members or for all 'first_gen' CMU students (generation =
-- 'original'). Family attend via a per-RSVP headcount, not their own invites.

update events set audience = 'first_gen' where audience = 'everyone';

alter table events alter column audience set default 'selected';
alter table events drop constraint if exists events_audience_check;
alter table events
  add constraint events_audience_check check (audience in ('selected', 'first_gen'));

-- Visibility: creator always; 'selected' -> invitees; 'first_gen' -> any
-- first-generation member.
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

-- Per-RSVP party size (the member + any family), for reunions.
alter table event_rsvps
  add column headcount int not null default 1 check (headcount >= 1);
grant insert (headcount) on event_rsvps to authenticated;
grant update (headcount) on event_rsvps to authenticated;

-- Targeted events: an event is either for 'everyone' (group-wide) or for a
-- 'selected' set of invitees. Selected events are visible — and RSVP-able —
-- only to the creator and the invited members, enforced in RLS.

alter table events
  add column audience text not null default 'everyone'
    check (audience in ('everyone', 'selected'));

create table event_invitees (
  event_id  text not null references events (event_id) on delete cascade,
  member_id text not null references members (member_id),
  primary key (event_id, member_id)
);
create index event_invitees_member_idx on event_invitees (member_id);
alter table event_invitees enable row level security;

-- SECURITY DEFINER helpers (bypass RLS to avoid policy recursion between
-- events / event_invitees).
create or replace function can_see_event(p_event_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from events e
    where e.event_id = p_event_id
      and (
        e.audience = 'everyone'
        or e.created_by = current_member_id()
        or exists (
          select 1 from event_invitees i
          where i.event_id = e.event_id and i.member_id = current_member_id()
        )
      )
  );
$$;
grant execute on function can_see_event(text) to authenticated;

create or replace function is_event_creator(p_event_id text)
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from events
    where event_id = p_event_id and created_by = current_member_id()
  );
$$;
grant execute on function is_event_creator(text) to authenticated;

-- Events: replace the see-all policy with visibility gating.
drop policy events_select_members on events;
create policy events_select_visible
  on events for select to authenticated
  using (can_see_event(event_id));

-- event_invitees: creator + invitees can read the list; only the creator adds
-- or removes, and only adults can be invited (minors don't participate).
create policy event_invitees_select
  on event_invitees for select to authenticated
  using (can_see_event(event_id));
create policy event_invitees_insert
  on event_invitees for insert to authenticated
  with check (is_event_creator(event_id) and is_adult_member(member_id));
create policy event_invitees_delete
  on event_invitees for delete to authenticated
  using (is_event_creator(event_id));

revoke insert on event_invitees from authenticated;
grant insert (event_id, member_id) on event_invitees to authenticated;

-- RSVPs: only for events you can see.
drop policy event_rsvps_select_members on event_rsvps;
create policy event_rsvps_select_visible
  on event_rsvps for select to authenticated
  using (can_see_event(event_id));

drop policy event_rsvps_insert_own on event_rsvps;
create policy event_rsvps_insert_own
  on event_rsvps for insert to authenticated
  with check (member_id = current_member_id() and can_see_event(event_id));

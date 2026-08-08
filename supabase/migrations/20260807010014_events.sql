-- Events / Gatherings with RSVPs. Group-wide, member-created. Location is a
-- free venue/city field (an event's meeting spot, not anyone's home address, so
-- it's fine to store — unlike the deliberately-absent member address fields).

create table events (
  event_id     text primary key default ('EV-' || gen_random_uuid()),
  created_by   text not null references members (member_id),
  title        text not null,
  description  text,
  location     text,
  event_date   date not null,
  event_time   text,                 -- free text, e.g. "6:00pm ET" (tz-safe)
  cancelled_at timestamptz,
  created_at   timestamptz not null default now()
);
create index events_date_idx on events (event_date);

alter table events enable row level security;

create policy events_select_members
  on events for select to authenticated
  using (current_member_id() is not null);
create policy events_insert_own
  on events for insert to authenticated
  with check (created_by = current_member_id());
create policy events_update_own
  on events for update to authenticated
  using (created_by = current_member_id())
  with check (created_by = current_member_id());

-- Column grants (the review lesson): created_by set once; only the creator's
-- own fields are writable, cancelled_at only via update.
revoke insert, update on events from authenticated;
grant insert (created_by, title, description, location, event_date, event_time)
  on events to authenticated;
grant update (title, description, location, event_date, event_time, cancelled_at)
  on events to authenticated;

-- One RSVP per member per event.
create table event_rsvps (
  event_id   text not null references events (event_id) on delete cascade,
  member_id  text not null references members (member_id),
  response   text not null check (response in ('going', 'maybe', 'no')),
  note       text,
  updated_at timestamptz not null default now(),
  primary key (event_id, member_id)
);
create index event_rsvps_event_idx on event_rsvps (event_id);
create trigger event_rsvps_set_updated_at
  before update on event_rsvps
  for each row execute function set_updated_at();

alter table event_rsvps enable row level security;

create policy event_rsvps_select_members
  on event_rsvps for select to authenticated
  using (current_member_id() is not null);
create policy event_rsvps_insert_own
  on event_rsvps for insert to authenticated
  with check (member_id = current_member_id());
create policy event_rsvps_update_own
  on event_rsvps for update to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());

revoke insert, update on event_rsvps from authenticated;
grant insert (event_id, member_id, response, note) on event_rsvps to authenticated;
grant update (response, note) on event_rsvps to authenticated;

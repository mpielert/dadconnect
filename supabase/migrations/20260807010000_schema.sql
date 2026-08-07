-- DadConnect — 0001 schema
-- Translates the four data-schema docs (Handoff §0, §3) into Postgres tables.
-- RLS policies live in 0002_rls.sql. This is the starting migration described
-- in §3 ("a starting point, not a final migration") — types/constraints are
-- deliberately tightened beyond the doc's rough SQL to make the minors policy
-- and the no-address rule structurally enforced, not just conventions.

-- gen_random_uuid() (pgcrypto) ships enabled on Supabase; no extension needed.

-- Auto-bump updated_at on tables that carry it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- members — the roster (Member_Directory_Data_Schema_v2.md)
-- ---------------------------------------------------------------------------
create table members (
  member_id          text primary key,
  auth_user_id       uuid references auth.users (id) on delete set null, -- null for minors
  name               text not null,
  is_minor           boolean not null default false,
  age                int,                       -- populated only when is_minor = true
  generation         text check (generation in ('original', 'next_gen')),
  class_year         int,                       -- adults only
  city               text,                      -- null for minors; city/region only, NEVER a street address
  role_or_school     text,                      -- null for minors
  bio                text,                      -- null for minors
  contact_preference text check (contact_preference in ('in_app', 'email', 'phone', 'none')),
  -- Per-field self-service sharing toggles (adults only; null for minors).
  share_city         boolean,
  share_role         boolean,
  share_bio          boolean,
  share_contact      boolean,
  guardian_managed   boolean not null default false,
  profile_owner_id   text references members (member_id), -- guardian's member_id, for minors
  created_at         timestamptz not null default now(),

  -- Minors policy (Member Directory schema §"Minors policy"): a minor's row
  -- physically has no city/role/bio/contact/visibility, so there is nothing to
  -- leak. Adults never store an exact age. Enforced here, not just in the UI.
  constraint members_minor_or_adult check (
    (
      is_minor = true
      and auth_user_id is null
      and guardian_managed = true
      and profile_owner_id is not null
      and age is not null
      and city is null
      and role_or_school is null
      and bio is null
      and class_year is null
      and (contact_preference is null or contact_preference = 'none')
      and share_city is null
      and share_role is null
      and share_bio is null
      and share_contact is null
    )
    or
    (
      is_minor = false
      and guardian_managed = false
      and profile_owner_id is null
      and age is null
    )
  )
);

create index members_auth_user_id_idx on members (auth_user_id);
create index members_profile_owner_id_idx on members (profile_owner_id);

-- ---------------------------------------------------------------------------
-- invites — invite-only account creation (Handoff §2). Managed by admins via
-- the service-role client; unreadable/unwritable to normal members (see RLS).
-- ---------------------------------------------------------------------------
create table invites (
  code       uuid primary key default gen_random_uuid(),
  email      text,                    -- optional: pre-bind an invite to an email
  created_by text references members (member_id),
  used_by    uuid references auth.users (id),
  used_at    timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Crash Pads (Crash_Pads_Data_Schema_v2.md). No address column anywhere, by
-- design (§3, PRD privacy model) — address exchange is a messaging concern.
-- ---------------------------------------------------------------------------
create table hosting_status (
  member_id   text primary key references members (member_id) on delete cascade,
  status      text not null check (status in ('yes', 'maybe', 'no')),
  constraints text,
  updated_at  timestamptz not null default now()
);
create trigger hosting_status_set_updated_at
  before update on hosting_status
  for each row execute function set_updated_at();

create table hosting_requests (
  request_id   text primary key,
  traveler_id  text not null references members (member_id),
  host_id      text not null references members (member_id),
  city         text not null,           -- copied at request time for display
  start_date   date,
  end_date     date,
  headcount    int,
  context      text,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined', 'countered')),
  counter_note text,                     -- only when status = 'countered'
  created_at   timestamptz not null default now()
);
create index hosting_requests_host_idx on hosting_requests (host_id);
create index hosting_requests_traveler_idx on hosting_requests (traveler_id);

-- ---------------------------------------------------------------------------
-- Travel Sharing (Travel_Sharing_Data_Schema_v2.md)
-- ---------------------------------------------------------------------------
create table travel_posts (
  post_id          text primary key,
  author_id        text not null references members (member_id),
  destination_city text not null,        -- city/region only, never a street address
  start_date       date,
  end_date         date,
  highlights       text not null,
  has_photos       boolean not null default false, -- flag only; real storage deferred (§6)
  created_at       timestamptz not null default now()
);
create index travel_posts_author_idx on travel_posts (author_id);
create index travel_posts_destination_idx on travel_posts (destination_city);

create table travel_replies (
  reply_id   text primary key,
  post_id    text not null references travel_posts (post_id) on delete cascade,
  author_id  text not null references members (member_id),
  message    text not null,
  created_at timestamptz not null default now()
);
create index travel_replies_post_idx on travel_replies (post_id);

-- ---------------------------------------------------------------------------
-- Career Networking (Career_Networking_Data_Schema_v1.md)
-- ---------------------------------------------------------------------------
create table career_resources (
  member_id        text primary key references members (member_id) on delete cascade,
  opted_in         boolean not null default false,
  industry         text,
  company_or_school text,
  function_area    text,
  updated_at       timestamptz not null default now()
);
create trigger career_resources_set_updated_at
  before update on career_resources
  for each row execute function set_updated_at();

create table career_requests (
  request_id    text primary key,
  requester_id  text not null references members (member_id),
  resource_id   text not null references members (member_id),
  ask           text not null,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined', 'redirected')),
  redirect_note text,                    -- only when status = 'redirected'
  outcome_note  text,                    -- optional light tracking
  created_at    timestamptz not null default now()
);
create index career_requests_resource_idx on career_requests (resource_id);
create index career_requests_requester_idx on career_requests (requester_id);

-- ---------------------------------------------------------------------------
-- Helper: the member_id for the current auth user (null if not a member, e.g.
-- an anon caller). SECURITY DEFINER so it can read members regardless of RLS.
-- ---------------------------------------------------------------------------
create or replace function current_member_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member_id from members where auth_user_id = auth.uid();
$$;

grant execute on function current_member_id() to authenticated;

-- ---------------------------------------------------------------------------
-- member_directory view — the ONLY cross-member read path.
--
-- Why a view: RLS on `members` (0002) only lets a member read their OWN row
-- (and minors they guardian) from the base table, so no other member's raw row
-- — and therefore no un-shared field — is ever reachable directly. This view
-- is SECURITY DEFINER (runs as owner, bypassing that row restriction) and
-- re-implements visibility itself: it returns every member but masks each
-- adult's share-gated fields unless the caller owns/guardians that row. This
-- is how field-level visibility is enforced in the database, not the client
-- (Handoff §2). Minors expose name + age to the whole group (resolved product
-- decision, §3); their other fields are physically null already.
--
-- Note: Supabase's linter flags SECURITY DEFINER views ("Security Definer
-- View") — that warning is expected and accepted here; the masking below is
-- the reason the view exists. See README.
-- ---------------------------------------------------------------------------
create view member_directory
with (security_invoker = false)
as
select
  m.member_id,
  m.name,
  m.is_minor,
  m.age,
  m.generation,
  m.class_year,
  case when owns then m.city           when m.share_city    then m.city           else null end as city,
  case when owns then m.role_or_school when m.share_role    then m.role_or_school else null end as role_or_school,
  case when owns then m.bio            when m.share_bio     then m.bio            else null end as bio,
  case when owns then m.contact_preference
       when m.share_contact then m.contact_preference else null end as contact_preference,
  m.guardian_managed,
  m.profile_owner_id
from members m
cross join lateral (
  select
    -- caller owns this row directly, or is the guardian of this minor
    (m.auth_user_id = auth.uid())
    or (m.profile_owner_id is not null and m.profile_owner_id = current_member_id())
    as owns
) o
-- Only authenticated members may read the directory at all.
where current_member_id() is not null;

grant select on member_directory to authenticated;

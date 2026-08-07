-- DadConnect — 0002 Row Level Security (Handoff §2, §3)
--
-- Model:
--   * Every feature table is readable only by authenticated members (the group
--     is closed), and writable only by the member who owns the row.
--   * `members` is the sensitive one: from the base table a member can read
--     ONLY their own row (plus minors they guardian). All cross-member reads go
--     through the `member_directory` view (0001), which masks un-shared fields.
--     This is what enforces field-level visibility in the DB, not the client.
--   * The service-role (admin) client bypasses RLS entirely and is how invites
--     are issued/consumed and how admin tooling seeds/repairs data.

-- ===========================================================================
-- members
-- ===========================================================================
alter table members enable row level security;

-- Read your own row, and the rows of minors you guardian. (Everyone else is
-- reached only via member_directory.)
create policy members_select_self_or_ward
  on members for select
  to authenticated
  using (
    auth_user_id = auth.uid()
    or profile_owner_id = current_member_id()
  );

-- Create your own adult profile on first sign-in, or a minor you guardian.
create policy members_insert_self_or_ward
  on members for insert
  to authenticated
  with check (
    -- your own adult account
    (
      is_minor = false
      and auth_user_id = auth.uid()
      and profile_owner_id is null
    )
    or
    -- a minor record you own (you must already be a member)
    (
      is_minor = true
      and auth_user_id is null
      and profile_owner_id = current_member_id()
    )
  );

-- Edit your own row, or a minor you guardian. Cannot re-point a row to another
-- owner or flip ownership away from yourself.
create policy members_update_self_or_ward
  on members for update
  to authenticated
  using (
    auth_user_id = auth.uid()
    or profile_owner_id = current_member_id()
  )
  with check (
    auth_user_id = auth.uid()
    or profile_owner_id = current_member_id()
  );

-- (No DELETE policy: removing accounts/minor records is an admin/service-role
-- action, so member rows are never hard-deleted by ordinary users.)

-- ===========================================================================
-- invites — admin-only. No policies for `authenticated`, so RLS denies all
-- access; only the service-role client (which bypasses RLS) can touch these.
-- ===========================================================================
alter table invites enable row level security;

-- ===========================================================================
-- hosting_status (Crash Pads)
-- ===========================================================================
alter table hosting_status enable row level security;

create policy hosting_status_select_members
  on hosting_status for select
  to authenticated
  using (current_member_id() is not null);

create policy hosting_status_write_own
  on hosting_status for all
  to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());

-- ===========================================================================
-- hosting_requests
-- ===========================================================================
alter table hosting_requests enable row level security;

-- Both parties to a request can see it.
create policy hosting_requests_select_party
  on hosting_requests for select
  to authenticated
  using (
    traveler_id = current_member_id()
    or host_id = current_member_id()
  );

-- The traveler creates the request (for themselves).
create policy hosting_requests_insert_traveler
  on hosting_requests for insert
  to authenticated
  with check (traveler_id = current_member_id());

-- Either party can update (host responds; traveler edits/withdraws).
create policy hosting_requests_update_party
  on hosting_requests for update
  to authenticated
  using (
    traveler_id = current_member_id()
    or host_id = current_member_id()
  )
  with check (
    traveler_id = current_member_id()
    or host_id = current_member_id()
  );

-- ===========================================================================
-- travel_posts
-- ===========================================================================
alter table travel_posts enable row level security;

create policy travel_posts_select_members
  on travel_posts for select
  to authenticated
  using (current_member_id() is not null);

create policy travel_posts_write_own
  on travel_posts for all
  to authenticated
  using (author_id = current_member_id())
  with check (author_id = current_member_id());

-- ===========================================================================
-- travel_replies
-- ===========================================================================
alter table travel_replies enable row level security;

create policy travel_replies_select_members
  on travel_replies for select
  to authenticated
  using (current_member_id() is not null);

create policy travel_replies_write_own
  on travel_replies for all
  to authenticated
  using (author_id = current_member_id())
  with check (author_id = current_member_id());

-- ===========================================================================
-- career_resources
-- ===========================================================================
alter table career_resources enable row level security;

create policy career_resources_select_members
  on career_resources for select
  to authenticated
  using (current_member_id() is not null);

create policy career_resources_write_own
  on career_resources for all
  to authenticated
  using (member_id = current_member_id())
  with check (member_id = current_member_id());

-- ===========================================================================
-- career_requests
-- ===========================================================================
alter table career_requests enable row level security;

-- Both parties to a request can see it.
create policy career_requests_select_party
  on career_requests for select
  to authenticated
  using (
    requester_id = current_member_id()
    or resource_id = current_member_id()
  );

create policy career_requests_insert_requester
  on career_requests for insert
  to authenticated
  with check (requester_id = current_member_id());

create policy career_requests_update_party
  on career_requests for update
  to authenticated
  using (
    requester_id = current_member_id()
    or resource_id = current_member_id()
  )
  with check (
    requester_id = current_member_id()
    or resource_id = current_member_id()
  );

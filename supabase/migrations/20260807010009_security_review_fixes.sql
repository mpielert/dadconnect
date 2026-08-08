-- Security-review fixes (2026-08-07). All four share one root cause: an RLS
-- policy restricts which ROWS a member may write, but not which COLUMNS, and
-- column grants had only been applied to `members` (migration 8). Supabase
-- grants table-level privileges to `authenticated`, which cover every column,
-- so anywhere the app relied on a server action to limit the columns, a direct
-- PostgREST call bypassed it.

-- ===========================================================================
-- Vuln 1 (HIGH): a pre-onboarding member could INSERT their own row with
-- is_admin = true and gain the admin panel (which uses the service role).
-- Migration 8 fixed UPDATE but not INSERT.
-- ===========================================================================
revoke insert on members from authenticated;
grant insert (
  auth_user_id, name, is_minor, age, generation, class_year,
  city, role_or_school, bio, contact_preference,
  share_city, share_role, share_bio, share_contact,
  guardian_managed, profile_owner_id
) on members to authenticated;
-- (is_admin, member_id, created_at omitted → they fall back to defaults.)

-- One row per auth user. Minors keep auth_user_id NULL; Postgres UNIQUE allows
-- multiple NULLs, so guardians can still manage several minors.
alter table members add constraint members_auth_user_unique unique (auth_user_id);

-- Belt-and-braces: forbid is_admin on self/ward insert at the policy layer too.
drop policy members_insert_self_or_ward on members;
create policy members_insert_self_or_ward
  on members for insert to authenticated
  with check (
    is_admin = false
    and (
      (is_minor = false and auth_user_id = auth.uid() and profile_owner_id is null)
      or
      (is_minor = true and auth_user_id is null and profile_owner_id = current_member_id())
    )
  );

-- ===========================================================================
-- Vuln 2 (MEDIUM): the recipient could rewrite body/sender_id/conversation_id
-- of a received message, not just mark it read.
-- ===========================================================================
revoke update on messages from authenticated;
grant update (read_at) on messages to authenticated;

-- ===========================================================================
-- Vuln 3 (MEDIUM): opted-out career resources (and non-hosting statuses) were
-- readable by any member — the opt-out was only applied in the app query.
-- ===========================================================================
drop policy career_resources_select_members on career_resources;
create policy career_resources_select_opted_in
  on career_resources for select to authenticated
  using (
    current_member_id() is not null
    and (opted_in = true or member_id = current_member_id())
  );

drop policy hosting_status_select_members on hosting_status;
create policy hosting_status_select_open
  on hosting_status for select to authenticated
  using (
    current_member_id() is not null
    and (status in ('yes', 'maybe') or member_id = current_member_id())
  );

-- ===========================================================================
-- Vuln 4 (LOW): either party could forge the other's response, or re-point a
-- request onto an uninvolved member.
-- ===========================================================================
-- hosting_requests: only the host responds (the app never has the traveler
-- update the row), and only to the response columns.
drop policy hosting_requests_update_party on hosting_requests;
create policy hosting_requests_update_host
  on hosting_requests for update to authenticated
  using (host_id = current_member_id())
  with check (host_id = current_member_id());
revoke update on hosting_requests from authenticated;
grant update (status, counter_note) on hosting_requests to authenticated;

-- career_requests: both parties legitimately write (resource → status/
-- redirect_note, requester → outcome_note), so the both-party row policy stays.
-- Column grants stop re-pointing the request (requester_id/resource_id),
-- rewriting the ask, or transplanting it onto someone else.
revoke update on career_requests from authenticated;
grant update (status, redirect_note, outcome_note) on career_requests to authenticated;

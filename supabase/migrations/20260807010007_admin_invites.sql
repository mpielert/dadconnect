-- Admin invite flow: let the project owner provision accounts from inside the
-- app instead of the Supabase dashboard (Handoff §2 — invite-only).

alter table members add column is_admin boolean not null default false;

-- Bootstrap the project owner as the first admin.
update members set is_admin = true where member_id = 'M-0001';

-- CRITICAL: members_update_self_or_ward lets a member update their own row,
-- which would otherwise let anyone grant themselves is_admin. Column-level
-- privileges are checked independently of RLS, so revoking UPDATE on just this
-- column closes that escalation path. Admin changes go through the service
-- role only.
revoke update (is_admin) on members from authenticated;

create or replace function is_admin_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select is_admin from members where auth_user_id = auth.uid()),
    false
  );
$$;
grant execute on function is_admin_member() to authenticated;

-- invites gains the fields the flow needs. The table keeps RLS on with no
-- policies for `authenticated`, so only the service-role client (behind an
-- admin check in the server action) can read or write it.
alter table invites add column invited_name text;
alter table invites add column revoked_at timestamptz;
create index invites_email_idx on invites (email);

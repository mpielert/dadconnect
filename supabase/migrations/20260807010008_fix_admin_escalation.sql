-- SECURITY FIX: any member could grant themselves is_admin.
--
-- 20260807010007 tried `revoke update (is_admin) on members from authenticated`,
-- but that is a no-op here: Supabase grants TABLE-level UPDATE on public tables
-- to `authenticated`, and a table-level privilege covers every column. Column
-- restrictions only bite when the privilege is granted per column.
--
-- So: drop the table-level grant, then re-grant UPDATE on exactly the columns a
-- member may edit on their own row (and on minors they guardian). Everything
-- else — is_admin, auth_user_id, is_minor, guardian_managed, profile_owner_id,
-- member_id, created_at — becomes writable only by the service role.
--
-- RLS still decides WHICH rows; these grants decide WHICH columns.

revoke update on members from authenticated;

grant update (
  name,
  age,                 -- guardian editing a minor
  generation,
  class_year,
  city,
  role_or_school,
  bio,
  contact_preference,
  share_city,
  share_role,
  share_bio,
  share_contact
) on members to authenticated;

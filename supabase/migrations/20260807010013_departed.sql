-- "Leave the community" (soft leave). A departing member's row is kept as a
-- scrubbed shell (member_id is permanent — Member Directory schema), so other
-- people's threads, connections, and request history stay intact and simply
-- read "Former member". This adds the marker column and surfaces it in the
-- directory view; the scrub + access-revocation happens in the leaveCommunity
-- server action.

alter table members add column departed_at timestamptz;

-- Republish member_directory with a `departed` flag. Departed rows STAY in the
-- view so their (scrubbed) name still resolves for attribution in others'
-- content; the Directory browse UI filters them out.
drop view member_directory;
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
  m.profile_owner_id,
  (m.departed_at is not null) as departed
from members m
cross join lateral (
  select
    (m.auth_user_id = auth.uid())
    or (m.profile_owner_id is not null and m.profile_owner_id = current_member_id())
    as owns
) o
where current_member_id() is not null;

grant select on member_directory to authenticated;

-- "How you're connected to CMU" — so members with different last names are
-- identifiable by the original student (e.g. "Wife of Matt Pielert",
-- "Son of Matt Pielert"). The relationship term is self-chosen (no gender is
-- inferred), and the anchor is free text so it works even if that student
-- hasn't joined.

alter table members
  add column cmu_relationship text
    check (cmu_relationship in ('student', 'spouse', 'child', 'other')),
  add column cmu_relationship_term text,   -- self-chosen: Wife/Husband/Son/…
  add column cmu_anchor_name text;         -- the CMU student's name (free text)

-- Keep minors to name + age only (structural minors guarantee).
alter table members add constraint members_minor_no_cmu check (
  not is_minor
  or (cmu_relationship is null and cmu_relationship_term is null
      and cmu_anchor_name is null)
);

-- Members may set these on their own row (column-grant model).
grant insert (cmu_relationship, cmu_relationship_term, cmu_anchor_name)
  on members to authenticated;
grant update (cmu_relationship, cmu_relationship_term, cmu_anchor_name)
  on members to authenticated;

-- Surface the new fields in the directory view (affiliation, shown to all
-- members — not masked by the share_* toggles).
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
  m.cmu_relationship,
  m.cmu_relationship_term,
  m.cmu_anchor_name,
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

-- Profile photos (2026-08-10). Adults may add one optional profile photo, shown
-- to the whole group. Minors stay photo-free (name + age only). Stored in a
-- private bucket and served via signed URLs — same pattern as travel-photos.

alter table members add column photo_path text;

-- Structural guarantee: a minor row can never carry a photo.
alter table members add constraint members_minor_no_photo
  check (not is_minor or photo_path is null);

-- Members may set the photo on their own row (column-grant model). Set after
-- onboarding via the profile page, so only UPDATE is granted (not INSERT).
grant update (photo_path) on members to authenticated;

-- Surface photo_path in the directory view. Like the CMU-affiliation fields it
-- is shown to everyone (not gated by the share_* toggles).
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
  m.photo_path,
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

-- Private storage bucket for avatars (served via signed URLs, never public).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Storage object RLS: any member may view avatars; a member may only write
-- under their own "<member_id>/..." folder.
create policy "avatars viewable by members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and public.current_member_id() is not null
  );

create policy "members upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_member_id()
  );

create policy "members update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_member_id()
  );

create policy "members delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_member_id()
  );

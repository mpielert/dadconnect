-- Real photo storage for travel posts (previously just a has_photos flag; §6).
-- Additive — no change to existing travel_posts columns.

create table travel_photos (
  photo_id     text primary key default ('TF-' || gen_random_uuid()),
  post_id      text not null references travel_posts (post_id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);
create index travel_photos_post_idx on travel_photos (post_id);

alter table travel_photos enable row level security;

-- Any member can see photo rows; only the post's author can attach/remove them.
create policy travel_photos_select_members
  on travel_photos for select to authenticated
  using (current_member_id() is not null);

create policy travel_photos_write_own
  on travel_photos for all to authenticated
  using (
    exists (
      select 1 from travel_posts p
      where p.post_id = travel_photos.post_id
        and p.author_id = current_member_id()
    )
  )
  with check (
    exists (
      select 1 from travel_posts p
      where p.post_id = travel_photos.post_id
        and p.author_id = current_member_id()
    )
  );

-- Private storage bucket (not public — images are served via signed URLs).
insert into storage.buckets (id, name, public)
values ('travel-photos', 'travel-photos', false)
on conflict (id) do nothing;

-- Storage object RLS: members can read any travel photo; a member can only
-- write under their own "<member_id>/..." folder.
create policy "travel photos viewable by members"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'travel-photos'
    and public.current_member_id() is not null
  );

create policy "members upload travel photos to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'travel-photos'
    and (storage.foldername(name))[1] = public.current_member_id()
  );

create policy "members delete own travel photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'travel-photos'
    and (storage.foldername(name))[1] = public.current_member_id()
  );

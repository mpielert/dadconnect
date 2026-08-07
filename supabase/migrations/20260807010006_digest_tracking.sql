-- Tracking for the unread-message email digest (Messaging_Spec_v1 §6).
-- Runs every ~15 min, covers messages unread for >10 min, and emails each
-- member at most once per hour.

-- Which messages have already been included in a digest.
alter table messages add column notified_at timestamptz;
create index messages_unnotified_idx on messages (read_at, notified_at)
  where read_at is null and notified_at is null;

-- Per-member throttle. Written only by the digest job (service role).
create table digest_log (
  member_id    text primary key references members (member_id) on delete cascade,
  last_sent_at timestamptz not null default now()
);

-- No policies: RLS on, so only the service-role job can touch it.
alter table digest_log enable row level security;

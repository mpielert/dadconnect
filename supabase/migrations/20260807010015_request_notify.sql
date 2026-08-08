-- Notify recipients of new pending requests via the existing digest.
-- notified_at marks a request already included in a digest email, so each new
-- request nudges its recipient exactly once. The digest job (service role) sets
-- it; members can't (INSERT column grants from migration 11/12 exclude it, and
-- the career_requests UPDATE trigger skips service-role callers).

alter table career_requests add column notified_at timestamptz;
alter table hosting_requests add column notified_at timestamptz;

create index career_requests_unnotified_idx on career_requests (created_at)
  where status = 'pending' and notified_at is null;
create index hosting_requests_unnotified_idx on hosting_requests (created_at)
  where status = 'pending' and notified_at is null;

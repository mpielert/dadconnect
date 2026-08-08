-- Fixes for the direct-PostgREST bypass gaps found by the multi-agent review
-- and confirmed live. Same root cause as migration 9: RLS gates rows, but
-- table-level INSERT/UPDATE grants let a member set any column via a direct API
-- call, bypassing the server actions. Migration 9 fixed this for `members`,
-- `messages` (UPDATE), and the request tables' UPDATE-by-party; these are the
-- INSERT/state gaps it left open.

-- ===========================================================================
-- 1b. Column-restricted INSERT grants (mirror members/connections).
-- ===========================================================================

-- messages: a sender could INSERT read_at/notified_at pre-set, hiding the
-- message from the unread badge and the digest. Grant only the real fields.
revoke insert on messages from authenticated;
grant insert (conversation_id, sender_id, body) on messages to authenticated;

-- career_requests: a requester could INSERT status='accepted' (or redirect/
-- outcome notes). Grant only the fields the requester legitimately sets; status
-- falls back to its 'pending' default.
revoke insert on career_requests from authenticated;
grant insert (request_id, requester_id, resource_id, ask) on career_requests to authenticated;

-- hosting_requests: same, for a traveler.
revoke insert on hosting_requests from authenticated;
grant insert (request_id, traveler_id, host_id, city, start_date, end_date, headcount, context)
  on hosting_requests to authenticated;

-- ===========================================================================
-- 6. INSERT policies must reject a MINOR as the counterparty (the platform-wide
-- minors rule; connections/conversations already do this).
-- ===========================================================================
drop policy hosting_requests_insert_traveler on hosting_requests;
create policy hosting_requests_insert_traveler
  on hosting_requests for insert to authenticated
  with check (
    traveler_id = current_member_id()
    and is_adult_member(host_id)
  );

drop policy career_requests_insert_requester on career_requests;
create policy career_requests_insert_requester
  on career_requests for insert to authenticated
  with check (
    requester_id = current_member_id()
    and is_adult_member(resource_id)
  );

-- ===========================================================================
-- 1c. hosting_requests: the host may only respond to a request that is still
-- pending (the app enforces this; the RLS policy didn't). Adding the guard to
-- USING means a settled request can't be re-answered via a direct call.
-- ===========================================================================
drop policy hosting_requests_update_host on hosting_requests;
create policy hosting_requests_update_host
  on hosting_requests for update to authenticated
  using (host_id = current_member_id() and status = 'pending')
  with check (host_id = current_member_id());

-- ===========================================================================
-- 1a. career_requests keeps a both-party UPDATE policy (resource responds,
-- requester adds an outcome note), so column grants alone can't separate what
-- each party may change. A trigger enforces the state machine + per-party
-- columns, comparing OLD/NEW — which RLS WITH CHECK can't do.
-- ===========================================================================
create or replace function career_requests_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare me text := current_member_id();
begin
  -- Service role / non-member callers are trusted (admin tooling); skip.
  if me is null then return new; end if;

  if me = old.resource_id then
    -- The resource responds, and only to a still-pending request.
    if old.status <> 'pending' then
      raise exception 'career request has already been answered';
    end if;
    if new.requester_id <> old.requester_id
       or new.resource_id <> old.resource_id
       or new.ask <> old.ask
       or new.outcome_note is distinct from old.outcome_note then
      raise exception 'a resource may only set status and redirect_note';
    end if;
    return new;
  elsif me = old.requester_id then
    -- The requester may only record the outcome note.
    if new.status <> old.status
       or new.redirect_note is distinct from old.redirect_note
       or new.requester_id <> old.requester_id
       or new.resource_id <> old.resource_id
       or new.ask <> old.ask then
      raise exception 'a requester may only set the outcome note';
    end if;
    return new;
  else
    raise exception 'not a party to this request';
  end if;
end;
$$;

create trigger career_requests_guard_trg
  before update on career_requests
  for each row execute function career_requests_guard();

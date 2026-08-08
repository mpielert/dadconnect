-- Deploy-order safety for migration 11.
--
-- Migration 11 revoked INSERT on the `status` column of career_requests /
-- hosting_requests. But the currently-deployed app code still sends
-- status:'pending' on insert, so until that code ships those inserts would fail
-- with "permission denied for column status". Rather than depend on deploy
-- order, allow the column but PIN its value to 'pending' in the INSERT policy —
-- so both the old (sends 'pending') and new (omits it) code work, while a
-- forged status:'accepted' is still rejected.

grant insert (status) on career_requests to authenticated;
grant insert (status) on hosting_requests to authenticated;

drop policy career_requests_insert_requester on career_requests;
create policy career_requests_insert_requester
  on career_requests for insert to authenticated
  with check (
    requester_id = current_member_id()
    and is_adult_member(resource_id)
    and status = 'pending'
  );

drop policy hosting_requests_insert_traveler on hosting_requests;
create policy hosting_requests_insert_traveler
  on hosting_requests for insert to authenticated
  with check (
    traveler_id = current_member_id()
    and is_adult_member(host_id)
    and status = 'pending'
  );

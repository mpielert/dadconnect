-- Fix: members couldn't create events. Migration 14 granted INSERT on the
-- event columns, but migration 16 added `audience` afterward without granting
-- it — so an authenticated INSERT that sets audience failed with "permission
-- denied for column audience". Grant it (still value-constrained by the
-- events_audience_check and the createEvent action).

grant insert (audience) on events to authenticated;

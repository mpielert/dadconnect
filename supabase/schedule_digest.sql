-- Schedules the unread-message email digest to run every 15 minutes.
--
-- NOT a migration: it embeds the CRON_SECRET, which must never be committed.
-- Run it once by hand in the Supabase SQL Editor, replacing the placeholder
-- below with the CRON_SECRET value from .env.local / Vercel.
--
-- Why pg_cron instead of Vercel Cron: Vercel's free tier limits cron jobs to
-- once per day, which can't do a 15-minute cadence. pg_cron runs in Postgres
-- and calls the endpoint over HTTP via pg_net.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove any previous schedule so this script is safe to re-run.
select cron.unschedule('message-digest')
where exists (select 1 from cron.job where jobname = 'message-digest');

select cron.schedule(
  'message-digest',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://cmudadconnect.com/api/cron/message-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    )
  );
  $$
);

-- Useful checks:
--   select jobname, schedule, active from cron.job;
--   select * from cron.job_run_details order by start_time desc limit 10;

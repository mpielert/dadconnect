-- Auto-generate ledger-style member IDs (M-0002, M-0003, …) on insert, so
-- onboarding and guardian-created minor records don't have to invent an ID.
-- The first admin row (M-0001) was inserted manually, so the sequence starts
-- at 2. IDs are permanent and never reused (Member Directory schema).

create sequence if not exists members_ledger_seq as int start with 2
  owned by members.member_id;

alter table members
  alter column member_id
  set default ('M-' || lpad(nextval('members_ledger_seq')::text, 4, '0'));

-- The default is evaluated as the inserting role, so authenticated members need
-- to advance the sequence when they onboard / add a minor.
grant usage, select on sequence members_ledger_seq to authenticated;

-- Message cleanup (2026-08-10): let members tidy their own threads.
--   • delete a single message      → sender only
--   • delete a whole conversation  → either participant (messages cascade)
--   • archive / unarchive          → per-user hide, reversible
--
-- DELETE was already granted to `authenticated` at the table level, but RLS had
-- no DELETE policy, so every delete was denied (default-deny). Adding scoped
-- policies enables exactly these operations and nothing wider. Purely additive,
-- so it is safe to apply ahead of the code deploy — old code never deletes.

-- --- Delete a single message: only its sender ------------------------------
create policy messages_delete_own
  on messages for delete to authenticated
  using (sender_id = current_member_id());

-- --- Delete a conversation: either participant (messages cascade via FK) ----
create policy conversations_delete_participant
  on conversations for delete to authenticated
  using (
    member_a_id = current_member_id()
    or member_b_id = current_member_id()
  );

-- --- Archive a conversation: per-user hide, reversible ----------------------
-- One row per (conversation, member) means archiving is personal: hiding a
-- thread for yourself never affects the other participant.
create table conversation_hides (
  conversation_id text not null references conversations (conversation_id) on delete cascade,
  member_id       text not null references members (member_id) on delete cascade,
  archived_at     timestamptz not null default now(),
  primary key (conversation_id, member_id)
);
alter table conversation_hides enable row level security;

-- You see and manage only your own hide rows, and can only hide a conversation
-- you're actually a participant in.
create policy conversation_hides_select_own
  on conversation_hides for select to authenticated
  using (member_id = current_member_id());

create policy conversation_hides_insert_own
  on conversation_hides for insert to authenticated
  with check (
    member_id = current_member_id()
    and in_conversation(conversation_id)
  );

create policy conversation_hides_delete_own
  on conversation_hides for delete to authenticated
  using (member_id = current_member_id());

grant select, insert, delete on conversation_hides to authenticated;

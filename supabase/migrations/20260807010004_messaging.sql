-- 1:1 messaging (Messaging_Spec_v1.md §4-5). Closes the Crash Pads
-- address-exchange gap: a host accepts, then sends the address in a message —
-- addresses stay out of the schema entirely, by design.

create table conversations (
  conversation_id text primary key default ('CV-' || gen_random_uuid()),
  member_a_id     text not null references members (member_id),
  member_b_id     text not null references members (member_id),
  origin_kind     text check (origin_kind in ('direct', 'crash_pad', 'career')),
  origin_id       text,
  created_at      timestamptz not null default now(),
  -- Canonical ordering + uniqueness: one conversation per pair, so two people
  -- starting one simultaneously can't create duplicates.
  constraint conversations_pair_ordered check (member_a_id < member_b_id),
  constraint conversations_pair_unique unique (member_a_id, member_b_id)
);
create index conversations_a_idx on conversations (member_a_id);
create index conversations_b_idx on conversations (member_b_id);

create table messages (
  message_id      text primary key default ('MS-' || gen_random_uuid()),
  conversation_id text not null references conversations (conversation_id) on delete cascade,
  sender_id       text not null references members (member_id),
  body            text not null,
  read_at         timestamptz,          -- null = unread by the recipient
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);

-- Is this member_id an adult? Minors have no accounts and must never be a
-- participant (spec §3.1). SECURITY DEFINER so it works under RLS.
create or replace function is_adult_member(p_member_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from members
    where member_id = p_member_id and is_minor = false
  );
$$;
grant execute on function is_adult_member(text) to authenticated;

-- Does the caller participate in this conversation?
create or replace function in_conversation(p_conversation_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from conversations c
    where c.conversation_id = p_conversation_id
      and (c.member_a_id = current_member_id()
           or c.member_b_id = current_member_id())
  );
$$;
grant execute on function in_conversation(text) to authenticated;

-- ===========================================================================
-- conversations RLS
-- ===========================================================================
alter table conversations enable row level security;

create policy conversations_select_participant
  on conversations for select to authenticated
  using (
    member_a_id = current_member_id()
    or member_b_id = current_member_id()
  );

-- Creator must be a participant; BOTH participants must be adults; and the
-- other person must not have opted out of contact.
create policy conversations_insert_participant
  on conversations for insert to authenticated
  with check (
    (member_a_id = current_member_id() or member_b_id = current_member_id())
    and member_a_id <> member_b_id
    and is_adult_member(member_a_id)
    and is_adult_member(member_b_id)
    and exists (
      select 1 from members m
      where m.member_id = case
              when member_a_id = current_member_id() then member_b_id
              else member_a_id
            end
        and coalesce(m.contact_preference, 'in_app') <> 'none'
    )
  );

-- ===========================================================================
-- messages RLS
-- ===========================================================================
alter table messages enable row level security;

create policy messages_select_participant
  on messages for select to authenticated
  using (in_conversation(conversation_id));

create policy messages_insert_own
  on messages for insert to authenticated
  with check (
    sender_id = current_member_id()
    and in_conversation(conversation_id)
  );

-- Only the RECIPIENT may update (to mark read) — never the sender.
create policy messages_update_recipient
  on messages for update to authenticated
  using (
    in_conversation(conversation_id)
    and sender_id <> current_member_id()
  )
  with check (
    in_conversation(conversation_id)
    and sender_id <> current_member_id()
  );

-- No DELETE policy: destructive ops stay admin/service-role, consistent with
-- members (spec §5).

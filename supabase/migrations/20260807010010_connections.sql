-- Connections Chronology: a group-wide timeline where a member logs a
-- connection they had with another member and a short summary of it.

create table connections (
  connection_id  text primary key default ('CN-' || gen_random_uuid()),
  author_id      text not null references members (member_id),      -- who logged it
  with_member_id text not null references members (member_id),      -- who they connected with
  context        text check (context in ('career', 'crash_pad', 'travel', 'directory', 'other')),
  summary        text not null,
  connected_on   date,                                             -- when it happened (optional)
  created_at     timestamptz not null default now(),
  constraint connections_distinct check (author_id <> with_member_id)
);
create index connections_author_idx on connections (author_id);
create index connections_with_idx on connections (with_member_id);
create index connections_created_idx on connections (created_at desc);

alter table connections enable row level security;

-- The chronology is shared with the whole group.
create policy connections_select_members
  on connections for select to authenticated
  using (current_member_id() is not null);

-- You log your own connections, with another ADULT member (minors don't take
-- part — consistent with the platform-wide minors policy).
create policy connections_insert_own
  on connections for insert to authenticated
  with check (
    author_id = current_member_id()
    and is_adult_member(with_member_id)
  );

-- You can edit (but not re-attribute) your own entries.
create policy connections_update_own
  on connections for update to authenticated
  using (author_id = current_member_id())
  with check (author_id = current_member_id());

-- Column grants (the lesson from the security review): RLS controls which rows,
-- these control which columns. author_id / with_member_id are set once on
-- insert and never rewritable; everything else the author may edit.
revoke insert, update on connections from authenticated;
grant insert (author_id, with_member_id, context, summary, connected_on)
  on connections to authenticated;
grant update (context, summary, connected_on)
  on connections to authenticated;

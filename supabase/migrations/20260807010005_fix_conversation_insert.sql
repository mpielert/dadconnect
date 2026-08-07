-- Fix: nobody could start a conversation.
--
-- conversations_insert_participant checked the other member's
-- contact_preference with an inline `exists (select ... from members ...)`.
-- That subquery evaluates under the CALLER's privileges, and members' RLS only
-- exposes your own row — so the check was always false and every insert was
-- rejected. Move it into a SECURITY DEFINER helper, same as is_adult_member().

create or replace function accepts_messages(p_member_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from members
    where member_id = p_member_id
      and is_minor = false
      and coalesce(contact_preference, 'in_app') <> 'none'
  );
$$;
grant execute on function accepts_messages(text) to authenticated;

drop policy conversations_insert_participant on conversations;

create policy conversations_insert_participant
  on conversations for insert to authenticated
  with check (
    (member_a_id = current_member_id() or member_b_id = current_member_id())
    and member_a_id <> member_b_id
    and is_adult_member(member_a_id)
    and is_adult_member(member_b_id)
    -- the OTHER participant must not have opted out of contact
    and accepts_messages(
      case
        when member_a_id = current_member_id() then member_b_id
        else member_a_id
      end
    )
  );

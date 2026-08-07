import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import type { Conversation, ConversationOrigin } from "./types";

/** Canonical pair ordering — matches the conversations_pair_ordered CHECK. */
export function orderPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

/**
 * Find the conversation with `otherId`, creating it if needed. Returns null if
 * it couldn't be created (e.g. the other member has contact_preference 'none',
 * or is a minor — both rejected by RLS).
 */
export async function getOrCreateConversation(
  otherId: string,
  origin: ConversationOrigin = "direct",
  originId?: string,
): Promise<Conversation | null> {
  const me = await getCurrentMember();
  if (!me || otherId === me.member_id) return null;

  const supabase = await createClient();
  const [a, b] = orderPair(me.member_id, otherId);

  const existing = await supabase
    .from("conversations")
    .select("*")
    .eq("member_a_id", a)
    .eq("member_b_id", b)
    .maybeSingle();

  if (existing.data) return existing.data as Conversation;

  const created = await supabase
    .from("conversations")
    .insert({
      member_a_id: a,
      member_b_id: b,
      origin_kind: origin,
      origin_id: originId ?? null,
    })
    .select("*")
    .maybeSingle();

  if (created.data) return created.data as Conversation;

  // Lost an insert race — the row now exists, so read it back.
  const retry = await supabase
    .from("conversations")
    .select("*")
    .eq("member_a_id", a)
    .eq("member_b_id", b)
    .maybeSingle();

  return (retry.data as Conversation | null) ?? null;
}

/** Count of messages sent to me that I haven't read. */
export async function getUnreadCount(): Promise<number> {
  const me = await getCurrentMember();
  if (!me) return 0;

  const supabase = await createClient();
  const { count } = await supabase
    .from("messages")
    .select("message_id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_id", me.member_id);

  return count ?? 0;
}

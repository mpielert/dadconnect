import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";

/**
 * The Inbox: everything currently awaiting the signed-in member, aggregated
 * across features so they don't have to open every tab to find it. Read through
 * the member's RLS-gated client, so it can only ever surface their own items.
 *
 * "Awaiting you" = unread direct messages + incoming pending crash-pad / career
 * requests (you're the host / listed resource) + upcoming events you can see but
 * haven't RSVP'd to. This mirrors what the activity email digest notifies about.
 */

export type InboxKind = "message" | "crash_pad" | "career" | "event";

export type InboxItem = {
  id: string;
  kind: InboxKind;
  from: string | null; // who it's from (null for open invites)
  title: string; // the topic line
  detail?: string; // optional secondary line
  href: string; // where clicking takes you
  at: string; // ISO timestamp, for newest-first ordering
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function snippet(s: string | null | undefined, n = 90): string | undefined {
  if (!s) return undefined;
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export async function getInboxItems(): Promise<InboxItem[]> {
  const me = await getCurrentMember();
  if (!me) return [];
  const supabase = await createClient();
  const today = todayStr();

  const [msgs, hosting, career, events, rsvps, names] = await Promise.all([
    supabase
      .from("messages")
      .select("message_id, conversation_id, sender_id, body, created_at")
      .is("read_at", null)
      .neq("sender_id", me.member_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("hosting_requests")
      .select("request_id, traveler_id, city, start_date, end_date, created_at")
      .eq("host_id", me.member_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("career_requests")
      .select("request_id, requester_id, ask, created_at")
      .eq("resource_id", me.member_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select("event_id, title, event_date, created_by, created_at")
      .is("cancelled_at", null)
      .gte("event_date", today)
      .neq("created_by", me.member_id),
    supabase.from("event_rsvps").select("event_id").eq("member_id", me.member_id),
    getMemberNames(),
  ]);

  const nameOf = (id: string) => names.get(id) ?? id;
  const items: InboxItem[] = [];

  // Unread messages → one row per conversation (with a count when several).
  type MsgRow = {
    message_id: string;
    conversation_id: string;
    sender_id: string;
    body: string | null;
    created_at: string;
  };
  const msgRows = (msgs.data as MsgRow[] | null) ?? [];
  const perConvo = new Map<string, number>();
  for (const m of msgRows)
    perConvo.set(m.conversation_id, (perConvo.get(m.conversation_id) ?? 0) + 1);
  const seen = new Set<string>();
  for (const m of msgRows) {
    if (seen.has(m.conversation_id)) continue; // rows are newest-first
    seen.add(m.conversation_id);
    const n = perConvo.get(m.conversation_id) ?? 1;
    items.push({
      id: `msg-${m.conversation_id}`,
      kind: "message",
      from: nameOf(m.sender_id),
      title: n > 1 ? `${n} new messages` : "New message",
      detail: snippet(m.body),
      href: `/messages/${m.conversation_id}`,
      at: m.created_at,
    });
  }

  // Incoming crash-pad requests (you're the host).
  type HostRow = {
    request_id: string;
    traveler_id: string;
    city: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  };
  for (const r of (hosting.data as HostRow[] | null) ?? []) {
    const dates = [r.start_date, r.end_date].filter(Boolean).join(" → ");
    items.push({
      id: `host-${r.request_id}`,
      kind: "crash_pad",
      from: nameOf(r.traveler_id),
      title: `Wants to stay in ${r.city}`,
      detail: dates || undefined,
      href: "/crash-pads/requests",
      at: r.created_at,
    });
  }

  // Incoming career requests (you're the listed resource).
  type CareerRow = {
    request_id: string;
    requester_id: string;
    ask: string | null;
    created_at: string;
  };
  for (const r of (career.data as CareerRow[] | null) ?? []) {
    items.push({
      id: `career-${r.request_id}`,
      kind: "career",
      from: nameOf(r.requester_id),
      title: "Career intro request",
      detail: snippet(r.ask),
      href: "/career/requests",
      at: r.created_at,
    });
  }

  // Upcoming events you can see but haven't RSVP'd to.
  const myRsvps = new Set(
    ((rsvps.data as { event_id: string }[] | null) ?? []).map((r) => r.event_id),
  );
  type EventRow = {
    event_id: string;
    title: string;
    event_date: string;
    created_by: string;
    created_at: string;
  };
  for (const e of (events.data as EventRow[] | null) ?? []) {
    if (myRsvps.has(e.event_id)) continue;
    items.push({
      id: `event-${e.event_id}`,
      kind: "event",
      from: nameOf(e.created_by),
      title: `Invited: ${e.title}`,
      detail: `No RSVP yet · ${e.event_date}`,
      href: "/events",
      at: e.created_at,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items;
}

/** Lightweight count for the header badge (no name resolution). */
export async function getInboxCount(): Promise<number> {
  try {
    const me = await getCurrentMember();
    if (!me) return 0;
    const supabase = await createClient();
    const today = todayStr();

    const [msg, host, career, events, rsvps] = await Promise.all([
      supabase
        .from("messages")
        .select("message_id", { count: "exact", head: true })
        .is("read_at", null)
        .neq("sender_id", me.member_id),
      supabase
        .from("hosting_requests")
        .select("request_id", { count: "exact", head: true })
        .eq("host_id", me.member_id)
        .eq("status", "pending"),
      supabase
        .from("career_requests")
        .select("request_id", { count: "exact", head: true })
        .eq("resource_id", me.member_id)
        .eq("status", "pending"),
      supabase
        .from("events")
        .select("event_id")
        .is("cancelled_at", null)
        .gte("event_date", today)
        .neq("created_by", me.member_id),
      supabase.from("event_rsvps").select("event_id").eq("member_id", me.member_id),
    ]);

    const myRsvps = new Set(
      ((rsvps.data as { event_id: string }[] | null) ?? []).map((r) => r.event_id),
    );
    const eventInvites = (
      (events.data as { event_id: string }[] | null) ?? []
    ).filter((e) => !myRsvps.has(e.event_id)).length;

    return (msg.count ?? 0) + (host.count ?? 0) + (career.count ?? 0) + eventInvites;
  } catch {
    return 0;
  }
}

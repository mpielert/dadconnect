import { NextResponse } from "next/server";
import { createAdminClient, listAllAuthUsers } from "@/lib/supabase/admin";

/**
 * Activity email digest. Runs every ~15 minutes (pg_cron). Nudges a member when
 * they have unread messages, or new pending career / crash-pad requests, older
 * than GRACE_MINUTES — at most once per hour. No message contents or request
 * details are ever included, only counts (and message-sender names).
 *
 * Auth: requires `Authorization: Bearer $CRON_SECRET`.
 */

export const dynamic = "force-dynamic";

const GRACE_MINUTES = 10;
const THROTTLE_MINUTES = 60;
const SITE_URL = "https://cmudadconnect.com";

type Entry = {
  messageIds: string[];
  senderIds: Set<string>;
  careerIds: string[];
  hostingIds: string[];
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

  const [{ data: msgData }, { data: careerData }, { data: hostingData }] =
    await Promise.all([
      supabase
        .from("messages")
        .select("message_id, conversation_id, sender_id")
        .is("read_at", null)
        .is("notified_at", null)
        .lt("created_at", cutoff),
      supabase
        .from("career_requests")
        .select("request_id, resource_id")
        .eq("status", "pending")
        .is("notified_at", null)
        .lt("created_at", cutoff),
      supabase
        .from("hosting_requests")
        .select("request_id, host_id")
        .eq("status", "pending")
        .is("notified_at", null)
        .lt("created_at", cutoff),
    ]);

  const messages =
    (msgData as { message_id: string; conversation_id: string; sender_id: string }[] | null) ?? [];
  const careerReqs = (careerData as { request_id: string; resource_id: string }[] | null) ?? [];
  const hostingReqs = (hostingData as { request_id: string; host_id: string }[] | null) ?? [];

  if (messages.length === 0 && careerReqs.length === 0 && hostingReqs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, considered: 0 });
  }

  const perRecipient = new Map<string, Entry>();
  const entryFor = (id: string): Entry => {
    let e = perRecipient.get(id);
    if (!e) {
      e = { messageIds: [], senderIds: new Set(), careerIds: [], hostingIds: [] };
      perRecipient.set(id, e);
    }
    return e;
  };

  // Messages: recipient is the participant who isn't the sender.
  if (messages.length) {
    const convoIds = [...new Set(messages.map((m) => m.conversation_id))];
    const { data: convoData } = await supabase
      .from("conversations")
      .select("conversation_id, member_a_id, member_b_id")
      .in("conversation_id", convoIds);
    const convoById = new Map(
      ((convoData as { conversation_id: string; member_a_id: string; member_b_id: string }[] | null) ?? [])
        .map((c) => [c.conversation_id, c]),
    );
    for (const m of messages) {
      const c = convoById.get(m.conversation_id);
      if (!c) continue;
      const recipient = c.member_a_id === m.sender_id ? c.member_b_id : c.member_a_id;
      const e = entryFor(recipient);
      e.messageIds.push(m.message_id);
      e.senderIds.add(m.sender_id);
    }
  }
  for (const r of careerReqs) entryFor(r.resource_id).careerIds.push(r.request_id);
  for (const r of hostingReqs) entryFor(r.host_id).hostingIds.push(r.request_id);

  const recipientIds = [...perRecipient.keys()];

  // Throttle: skip anyone emailed within the last hour.
  const throttleCutoff = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString();
  const { data: logData } = await supabase
    .from("digest_log")
    .select("member_id, last_sent_at")
    .in("member_id", recipientIds);
  const recentlySent = new Set(
    ((logData as { member_id: string; last_sent_at: string }[] | null) ?? [])
      .filter((r) => r.last_sent_at > throttleCutoff)
      .map((r) => r.member_id),
  );

  // Names + auth ids for recipients and message senders.
  const involved = [
    ...new Set([...recipientIds, ...messages.map((m) => m.sender_id)]),
  ];
  const { data: memberData } = await supabase
    .from("members")
    .select("member_id, name, auth_user_id")
    .in("member_id", involved);
  const members = new Map(
    ((memberData as { member_id: string; name: string; auth_user_id: string | null }[] | null) ?? [])
      .map((m) => [m.member_id, m]),
  );
  const emailByAuthId = new Map<string, string>();
  for (const u of await listAllAuthUsers(supabase)) {
    if (u.email) emailByAuthId.set(u.id, u.email);
  }

  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  let sent = 0;

  for (const recipientId of recipientIds) {
    if (recentlySent.has(recipientId)) continue;
    const member = members.get(recipientId);
    if (!member?.auth_user_id) continue;
    const email = emailByAuthId.get(member.auth_user_id);
    if (!email) continue;

    const e = perRecipient.get(recipientId)!;
    const lines: string[] = [];
    if (e.messageIds.length) {
      const who = [...e.senderIds].map((id) => members.get(id)?.name ?? "someone").join(", ");
      lines.push(`• ${plural(e.messageIds.length, "unread message")} from ${who} — ${SITE_URL}/messages`);
    }
    if (e.careerIds.length) {
      lines.push(`• ${plural(e.careerIds.length, "new career request")} — ${SITE_URL}/career/requests`);
    }
    if (e.hostingIds.length) {
      lines.push(`• ${plural(e.hostingIds.length, "new crash-pad request")} — ${SITE_URL}/crash-pads/requests`);
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "CMUDadConnect <login@cmudadconnect.com>",
        to: [email],
        subject: "New activity on CMUDadConnect",
        text:
          `Hi ${member.name},\n\n` +
          `You have new activity on CMUDadConnect:\n\n` +
          `${lines.join("\n")}\n\n` +
          `(We don't include contents or details in email.)`,
      }),
    });
    if (!res.ok) continue;
    sent++;

    // Mark everything we emailed about notified BEFORE the throttle write, so a
    // failure here can at worst re-notify one recipient, never the whole group.
    const now = new Date().toISOString();
    if (e.messageIds.length) {
      await supabase.from("messages").update({ notified_at: now }).in("message_id", e.messageIds);
    }
    if (e.careerIds.length) {
      await supabase.from("career_requests").update({ notified_at: now }).in("request_id", e.careerIds);
    }
    if (e.hostingIds.length) {
      await supabase.from("hosting_requests").update({ notified_at: now }).in("request_id", e.hostingIds);
    }
    await supabase
      .from("digest_log")
      .upsert({ member_id: recipientId, last_sent_at: now }, { onConflict: "member_id" });
  }

  return NextResponse.json({ ok: true, considered: recipientIds.length, sent });
}

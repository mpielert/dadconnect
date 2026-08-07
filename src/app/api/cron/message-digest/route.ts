import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Unread-message email digest (Messaging_Spec_v1 §6).
 *
 * Runs every ~15 minutes (scheduled with pg_cron). Emails a member when they
 * have messages unread for more than GRACE_MINUTES, at most once per hour.
 * Message bodies are NEVER included — only counts and sender names.
 *
 * Auth: requires `Authorization: Bearer $CRON_SECRET`.
 */

export const dynamic = "force-dynamic";

const GRACE_MINUTES = 10;
const THROTTLE_MINUTES = 60;
const SITE_URL = "https://cmudadconnect.com";

type MessageRow = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
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
    return NextResponse.json(
      { error: "RESEND_API_KEY not set" },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

  // Messages still unread, old enough to notify about, not yet notified.
  const { data: msgData, error: msgErr } = await supabase
    .from("messages")
    .select("message_id, conversation_id, sender_id")
    .is("read_at", null)
    .is("notified_at", null)
    .lt("created_at", cutoff);

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  const pending = (msgData as MessageRow[] | null) ?? [];
  if (pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, considered: 0 });
  }

  // Resolve each message's recipient = the participant who isn't the sender.
  const convoIds = [...new Set(pending.map((m) => m.conversation_id))];
  const { data: convoData } = await supabase
    .from("conversations")
    .select("conversation_id, member_a_id, member_b_id")
    .in("conversation_id", convoIds);

  const convoById = new Map(
    (
      (convoData as
        | { conversation_id: string; member_a_id: string; member_b_id: string }[]
        | null) ?? []
    ).map((c) => [c.conversation_id, c]),
  );

  // recipient_id -> { messageIds, senderIds }
  const perRecipient = new Map<
    string,
    { messageIds: string[]; senderIds: Set<string> }
  >();

  for (const m of pending) {
    const convo = convoById.get(m.conversation_id);
    if (!convo) continue;
    const recipient =
      convo.member_a_id === m.sender_id ? convo.member_b_id : convo.member_a_id;

    const entry = perRecipient.get(recipient) ?? {
      messageIds: [],
      senderIds: new Set<string>(),
    };
    entry.messageIds.push(m.message_id);
    entry.senderIds.add(m.sender_id);
    perRecipient.set(recipient, entry);
  }

  const recipientIds = [...perRecipient.keys()];

  // Throttle: skip anyone emailed within the last hour.
  const throttleCutoff = new Date(
    Date.now() - THROTTLE_MINUTES * 60_000,
  ).toISOString();
  const { data: logData } = await supabase
    .from("digest_log")
    .select("member_id, last_sent_at")
    .in("member_id", recipientIds);

  const recentlySent = new Set(
    ((logData as { member_id: string; last_sent_at: string }[] | null) ?? [])
      .filter((r) => r.last_sent_at > throttleCutoff)
      .map((r) => r.member_id),
  );

  // Names + auth ids for everyone involved.
  const involved = [
    ...new Set([
      ...recipientIds,
      ...pending.map((m) => m.sender_id),
    ]),
  ];
  const { data: memberData } = await supabase
    .from("members")
    .select("member_id, name, auth_user_id")
    .in("member_id", involved);

  const members = new Map(
    (
      (memberData as
        | { member_id: string; name: string; auth_user_id: string | null }[]
        | null) ?? []
    ).map((m) => [m.member_id, m]),
  );

  let sent = 0;
  const notifiedMessageIds: string[] = [];

  for (const recipientId of recipientIds) {
    if (recentlySent.has(recipientId)) continue;

    const member = members.get(recipientId);
    if (!member?.auth_user_id) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(
      member.auth_user_id,
    );
    const email = userData?.user?.email;
    if (!email) continue;

    const entry = perRecipient.get(recipientId)!;
    const senderNames = [...entry.senderIds]
      .map((id) => members.get(id)?.name ?? "someone")
      .join(", ");
    const count = entry.messageIds.length;
    const plural = count === 1 ? "message" : "messages";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CMUDadConnect <login@cmudadconnect.com>",
        to: [email],
        subject: `You have ${count} unread ${plural} on CMUDadConnect`,
        text:
          `Hi ${member.name},\n\n` +
          `You have ${count} unread ${plural} from ${senderNames} on CMUDadConnect.\n\n` +
          `Read ${count === 1 ? "it" : "them"}: ${SITE_URL}/messages\n\n` +
          `(We don't include message contents in email.)`,
      }),
    });

    if (!res.ok) continue;

    sent++;
    notifiedMessageIds.push(...entry.messageIds);

    await supabase
      .from("digest_log")
      .upsert(
        { member_id: recipientId, last_sent_at: new Date().toISOString() },
        { onConflict: "member_id" },
      );
  }

  // Mark only what we actually emailed about, so throttled members still get
  // notified on a later run.
  if (notifiedMessageIds.length) {
    await supabase
      .from("messages")
      .update({ notified_at: new Date().toISOString() })
      .in("message_id", notifiedMessageIds);
  }

  return NextResponse.json({
    ok: true,
    considered: recipientIds.length,
    sent,
  });
}

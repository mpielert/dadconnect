import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import type { Conversation, Message } from "@/lib/types";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: convoData }, { data: msgData }, names, unread] =
    await Promise.all([
      supabase.from("conversations").select("*"),
      supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false }),
      getMemberNames(),
      getUnreadCount(),
    ]);

  const conversations = (convoData as Conversation[] | null) ?? [];
  const messages = (msgData as Message[] | null) ?? [];

  // Latest message + unread count per conversation (messages are newest-first).
  const latest = new Map<string, Message>();
  const unreadPer = new Map<string, number>();
  for (const m of messages) {
    if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m);
    if (!m.read_at && m.sender_id !== me.member_id) {
      unreadPer.set(
        m.conversation_id,
        (unreadPer.get(m.conversation_id) ?? 0) + 1,
      );
    }
  }

  const rows = conversations
    .map((c) => {
      const otherId =
        c.member_a_id === me.member_id ? c.member_b_id : c.member_a_id;
      return {
        convo: c,
        otherId,
        otherName: names.get(otherId) ?? otherId,
        last: latest.get(c.conversation_id) ?? null,
        unread: unreadPer.get(c.conversation_id) ?? 0,
      };
    })
    .sort((x, y) => {
      const xt = x.last?.created_at ?? x.convo.created_at;
      const yt = y.last?.created_at ?? y.convo.created_at;
      return yt.localeCompare(xt);
    });

  return (
    <>
      <SiteHeader memberName={me.name} active="messages" unread={unread} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Messages
        </h1>
        <p className="mt-1 text-ink-soft">
          Private one-to-one conversations with other members.
        </p>

        {error === "unavailable" && (
          <p className="mt-4 rounded-lg border border-cardinal/40 bg-cardinal/5 px-4 py-3 text-sm text-cardinal">
            That member isn&apos;t accepting messages right now.
          </p>
        )}

        {rows.length === 0 ? (
          <p className="mt-8 text-ink-soft">
            No conversations yet. Start one from someone&apos;s{" "}
            <Link href="/directory" className="text-cardinal underline">
              directory profile
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((r) => (
              <li key={r.convo.conversation_id}>
                <Link
                  href={`/messages/${r.convo.conversation_id}`}
                  className="block rounded-xl border border-thread/40 bg-paper-raised p-5 transition hover:border-brass/60"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className={`font-display text-lg ${
                        r.unread > 0
                          ? "font-semibold text-ink"
                          : "font-medium text-ink"
                      }`}
                    >
                      {r.otherName}
                    </span>
                    {r.unread > 0 && (
                      <span className="rounded-full bg-cardinal px-2 py-0.5 font-mono text-[10px] text-paper">
                        {r.unread} new
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 truncate text-sm ${
                      r.unread > 0 ? "text-ink" : "text-ink-soft"
                    }`}
                  >
                    {r.last
                      ? `${r.last.sender_id === me.member_id ? "You: " : ""}${r.last.body}`
                      : "No messages yet"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

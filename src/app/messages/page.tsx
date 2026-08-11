import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { ConversationActions } from "./ConversationActions";
import type { Conversation, Message } from "@/lib/types";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; view?: string }>;
}) {
  const { error, view } = await searchParams;
  const showArchived = view === "archived";

  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: convoData }, { data: msgData }, { data: hideData }, names, unread] =
    await Promise.all([
      supabase.from("conversations").select("*"),
      supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("conversation_hides").select("conversation_id, archived_at"),
      getMemberNames(),
      getUnreadCount(),
    ]);

  const conversations = (convoData as Conversation[] | null) ?? [];
  const messages = (msgData as Message[] | null) ?? [];
  const hides = new Map(
    ((hideData as { conversation_id: string; archived_at: string }[] | null) ?? []).map(
      (h) => [h.conversation_id, h.archived_at],
    ),
  );

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

  const allRows = conversations
    .map((c) => {
      const otherId =
        c.member_a_id === me.member_id ? c.member_b_id : c.member_a_id;
      const last = latest.get(c.conversation_id) ?? null;
      const lastAt = last?.created_at ?? c.created_at;
      const archivedAt = hides.get(c.conversation_id);
      // Archived stays archived until a newer message arrives, which resurfaces it.
      const isArchived = archivedAt != null && lastAt <= archivedAt;
      return {
        convo: c,
        otherId,
        otherName: names.get(otherId) ?? otherId,
        last,
        unread: unreadPer.get(c.conversation_id) ?? 0,
        isArchived,
      };
    })
    .sort((x, y) => {
      const xt = x.last?.created_at ?? x.convo.created_at;
      const yt = y.last?.created_at ?? y.convo.created_at;
      return yt.localeCompare(xt);
    });

  const archivedCount = allRows.filter((r) => r.isArchived).length;
  const rows = allRows.filter((r) => r.isArchived === showArchived);

  return (
    <>
      <SiteHeader memberName={me.name} active="messages" unread={unread} isAdmin={me.is_admin} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Messages
        </h1>
        <p className="mt-1 text-ink-soft">
          Private one-to-one conversations with other members.
        </p>

        {(archivedCount > 0 || showArchived) && (
          <div className="mt-4 flex gap-2">
            {[
              { label: "Active", href: "/messages", active: !showArchived },
              {
                label: `Archived (${archivedCount})`,
                href: "/messages?view=archived",
                active: showArchived,
              },
            ].map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  f.active
                    ? "border-cardinal bg-cardinal text-paper"
                    : "border-thread/50 text-ink-soft hover:border-brass"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        )}

        {error === "unavailable" && (
          <p className="mt-4 rounded-lg border border-cardinal/40 bg-cardinal/5 px-4 py-3 text-sm text-cardinal">
            That member isn&apos;t accepting messages right now.
          </p>
        )}

        {rows.length === 0 ? (
          <p className="mt-8 text-ink-soft">
            {showArchived ? (
              "No archived conversations."
            ) : (
              <>
                No conversations yet. Start one from someone&apos;s{" "}
                <Link href="/directory" className="text-cardinal underline">
                  directory profile
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((r) => (
              <li
                key={r.convo.conversation_id}
                className="overflow-hidden rounded-xl border border-thread/40 bg-paper-raised transition hover:border-brass/60"
              >
                <Link
                  href={`/messages/${r.convo.conversation_id}`}
                  className="block p-5 pb-3"
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
                <div className="flex justify-end border-t border-thread/30 px-5 py-2">
                  <ConversationActions
                    conversationId={r.convo.conversation_id}
                    archived={r.isArchived}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

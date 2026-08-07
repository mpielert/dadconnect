import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { Composer } from "./Composer";
import type { Conversation, Message } from "@/lib/types";

const ORIGIN_LABEL: Record<string, string> = {
  crash_pad: "Started from a crash pad request",
  career: "Started from a career request",
  direct: "",
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const { data: convoData } = await supabase
    .from("conversations")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();

  const convo = convoData as Conversation | null;
  if (!convo) notFound(); // RLS hides conversations you're not part of

  const otherId =
    convo.member_a_id === me.member_id ? convo.member_b_id : convo.member_a_id;

  const [{ data: msgData }, names] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    getMemberNames(),
  ]);

  const messages = (msgData as Message[] | null) ?? [];
  const otherName = names.get(otherId) ?? otherId;

  // Mark their messages read on view (RLS allows this only for the recipient).
  const unreadIds = messages
    .filter((m) => !m.read_at && m.sender_id !== me.member_id)
    .map((m) => m.message_id);
  if (unreadIds.length) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("message_id", unreadIds);
  }

  const unread = await getUnreadCount();
  const originNote = convo.origin_kind
    ? ORIGIN_LABEL[convo.origin_kind] ?? ""
    : "";

  return (
    <>
      <SiteHeader memberName={me.name} active="messages" unread={unread} isAdmin={me.is_admin} />
      <main className="mx-auto flex max-w-2xl flex-col px-6 py-8">
        <Link
          href="/messages"
          className="font-mono text-xs text-thread transition hover:text-cardinal"
        >
          ← Messages
        </Link>

        <div className="mt-3 flex items-baseline justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-ink">
            {otherName}
          </h1>
          <Link
            href={`/directory/${otherId}`}
            className="font-mono text-[11px] text-thread transition hover:text-cardinal"
          >
            {otherId}
          </Link>
        </div>
        {originNote && (
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-thread">
            {originNote}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {messages.length === 0 ? (
            <p className="text-ink-soft">
              No messages yet — say hello. Sharing an address or phone number
              here is fine; nothing you send is stored on your profile.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === me.member_id;
              return (
                <div
                  key={m.message_id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      mine
                        ? "bg-cardinal text-paper"
                        : "border border-thread/40 bg-paper-raised text-ink"
                    }`}
                  >
                    <p className="whitespace-pre-line text-sm">{m.body}</p>
                    <p
                      className={`mt-1 font-mono text-[10px] ${
                        mine ? "text-paper/70" : "text-thread"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 border-t border-thread/30 pt-4">
          <Composer conversationId={conversationId} />
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { getInboxItems, type InboxKind } from "@/lib/inbox";
import { SiteHeader } from "@/components/SiteHeader";

const KIND_META: Record<InboxKind, { icon: string; label: string; tone: string }> = {
  message: { icon: "💬", label: "Message", tone: "text-cardinal" },
  crash_pad: { icon: "🏠", label: "Crash Pads", tone: "text-brass" },
  career: { icon: "💼", label: "Career", tone: "text-brass" },
  event: { icon: "📅", label: "Events", tone: "text-thread" },
};

function when(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function InboxPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const [unread, items] = await Promise.all([getUnreadCount(), getInboxItems()]);

  return (
    <>
      <SiteHeader
        memberName={me.name}
        active="inbox"
        unread={unread}
        isAdmin={me.is_admin}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Inbox</h1>
        <p className="mt-1 text-ink-soft">
          Everything waiting on you — messages, requests, and event invites — in
          one place.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-thread/40 bg-paper-raised p-8 text-center">
            <p className="text-2xl">🎉</p>
            <p className="mt-2 font-display text-lg text-ink">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-ink-soft">
              No unread messages, pending requests, or open invites right now.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {items.map((item) => {
              const meta = KIND_META[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="flex items-start gap-4 rounded-xl border border-thread/40 bg-paper-raised p-4 transition hover:border-brass"
                  >
                    <span className="mt-0.5 text-xl leading-none" aria-hidden>
                      {meta.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-wider ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                        {item.from && (
                          <span className="text-sm font-medium text-ink">
                            {item.from}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 font-mono text-[11px] text-thread">
                          {when(item.at)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-ink">{item.title}</p>
                      {item.detail && (
                        <p className="mt-0.5 truncate text-sm text-ink-soft">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

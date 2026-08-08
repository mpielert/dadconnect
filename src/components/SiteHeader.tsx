import Link from "next/link";
import { signOut } from "@/app/actions";

export function SiteHeader({
  memberName,
  active,
  unread = 0,
  isAdmin = false,
}: {
  memberName: string;
  active?:
    | "directory"
    | "career"
    | "crash-pads"
    | "travel"
    | "connections"
    | "events"
    | "messages"
    | "profile"
    | "admin";
  unread?: number;
  isAdmin?: boolean;
}) {
  const linkCls = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm transition ${
      isActive ? "bg-paper text-ink" : "text-ink-soft hover:text-ink"
    }`;

  return (
    <header className="thread-bg border-b border-thread/40 bg-paper-raised">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/directory" className="leading-none">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-brass">
            CMUDadConnect
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/directory" className={linkCls(active === "directory")}>
            Directory
          </Link>
          <Link href="/career" className={linkCls(active === "career")}>
            Career
          </Link>
          <Link href="/crash-pads" className={linkCls(active === "crash-pads")}>
            Crash Pads
          </Link>
          <Link href="/travel" className={linkCls(active === "travel")}>
            Travel
          </Link>
          <Link
            href="/connections"
            className={linkCls(active === "connections")}
          >
            Connections
          </Link>
          <Link href="/events" className={linkCls(active === "events")}>
            Events
          </Link>
          <Link
            href="/messages"
            className={`${linkCls(active === "messages")} inline-flex items-center gap-1.5`}
          >
            Messages
            {unread > 0 && (
              <span className="rounded-full bg-cardinal px-1.5 py-0.5 font-mono text-[10px] leading-none text-paper">
                {unread}
              </span>
            )}
          </Link>
          <Link href="/profile" className={linkCls(active === "profile")}>
            My profile
          </Link>
          {isAdmin && (
            <Link href="/admin" className={linkCls(active === "admin")}>
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:text-cardinal">
              Sign out
            </button>
          </form>
        </nav>
      </div>
      <div className="mx-auto -mt-1 max-w-4xl px-6 pb-3">
        <span className="font-mono text-[11px] text-thread">
          signed in as {memberName}
        </span>
      </div>
    </header>
  );
}

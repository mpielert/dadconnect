import Link from "next/link";
import { signOut } from "@/app/actions";

export function SiteHeader({
  memberName,
  active,
}: {
  memberName: string;
  active?: "directory" | "career" | "crash-pads" | "profile";
}) {
  const linkCls = (isActive: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm transition ${
      isActive
        ? "bg-paper text-ink"
        : "text-ink-soft hover:text-ink"
    }`;

  return (
    <header className="thread-bg border-b border-thread/40 bg-paper-raised">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/directory" className="leading-none">
          <span className="font-mono text-xs uppercase tracking-[0.25em] text-brass">
            DadConnect
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/directory" className={linkCls(active === "directory")}>
            Directory
          </Link>
          <Link href="/career" className={linkCls(active === "career")}>
            Career
          </Link>
          <Link
            href="/crash-pads"
            className={linkCls(active === "crash-pads")}
          >
            Crash Pads
          </Link>
          <Link href="/profile" className={linkCls(active === "profile")}>
            My profile
          </Link>
          <form action={signOut}>
            <button className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:text-cardinal">
              Sign out
            </button>
          </form>
        </nav>
      </div>
      <div className="mx-auto max-w-4xl px-6 pb-3 -mt-1">
        <span className="font-mono text-[11px] text-thread">
          signed in as {memberName}
        </span>
      </div>
    </header>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing page. Invite-only: there is deliberately NO public signup link
 * anywhere (Handoff §2, §7). Members sign in with a magic link; new members
 * arrive through an admin-issued invite.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="thread-bg flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl rounded-2xl border border-thread/40 bg-paper-raised px-8 py-12 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
          DadConnect
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
          The private hub for our group.
        </h1>
        <p className="mt-4 text-ink-soft">
          A directory to find each other, and — over time — career help, crash
          pads, and travel notes. Invite-only.
        </p>

        <div className="mt-8">
          {user ? (
            <Link
              href="/directory"
              className="inline-block rounded-lg bg-cardinal px-6 py-3 font-medium text-paper transition hover:opacity-90"
            >
              Enter the directory
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block rounded-lg bg-cardinal px-6 py-3 font-medium text-paper transition hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

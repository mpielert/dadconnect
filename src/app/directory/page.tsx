import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

/**
 * Authed landing inside the app. This is a scaffold placeholder that proves
 * the auth + RLS wiring end to end: it reads from the `member_directory` view,
 * which returns only fields each member has marked shareable (enforced in the
 * database, not here). The real Member Directory UI (Handoff §4 phase 1, §5
 * visual design) is the next build pass.
 */
export default async function DirectoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: members, error } = await supabase
    .from("member_directory")
    .select("member_id, name, is_minor, age, generation, city, role_or_school")
    .order("name");

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="thread-bg -mx-6 mb-8 border-b border-thread/40 bg-paper-raised px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
              DadConnect
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">
              Directory
            </h1>
          </div>
          <form action={signOut}>
            <button className="rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft transition hover:border-cardinal hover:text-cardinal">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-cardinal/40 bg-cardinal/5 px-4 py-3 text-sm text-cardinal">
          Could not load the directory: {error.message}
        </p>
      )}

      {members && members.length === 0 && (
        <p className="text-ink-soft">
          No members yet. Once the roster is seeded, they&apos;ll appear here.
        </p>
      )}

      <ul className="space-y-3">
        {members?.map((m) => (
          <li
            key={m.member_id}
            className="rounded-xl border border-thread/40 bg-paper-raised px-5 py-4"
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-display text-lg font-semibold text-ink">
                {m.name}
              </span>
              <span className="font-mono text-xs text-thread">
                {m.member_id}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
              {m.is_minor
                ? `minor · age ${m.age ?? "—"}`
                : [m.generation, m.city, m.role_or_school]
                    .filter(Boolean)
                    .join(" · ") || "—"}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

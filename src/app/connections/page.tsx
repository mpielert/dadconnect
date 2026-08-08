import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getDirectoryMap } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { LogConnectionForm } from "./LogConnectionForm";
import { ConnectionItem } from "./ConnectionItem";
import type { Connection } from "@/lib/types";

export type PickMember = { member_id: string; name: string };

export default async function ConnectionsPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const unread = await getUnreadCount();
  const supabase = await createClient();

  const [{ data: connData }, dir] = await Promise.all([
    supabase
      .from("connections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    getDirectoryMap(),
  ]);

  const connections = (connData as Connection[] | null) ?? [];
  const nameOf = (id: string) => dir.get(id)?.name ?? id;

  // Adults other than me, for the "who did you connect with" picker.
  const pickable: PickMember[] = [...dir.values()]
    .filter((m) => !m.is_minor && m.member_id !== me.member_id)
    .map((m) => ({ member_id: m.member_id, name: m.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <SiteHeader
        memberName={me.name}
        active="connections"
        unread={unread}
        isAdmin={me.is_admin}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Connections
        </h1>
        <p className="mt-1 text-ink-soft">
          A running chronology of how the group connects — advice given, couches
          shared, trips crossed. Log yours and read everyone else&apos;s.
        </p>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Log a connection
          </h2>
          <div className="mt-4">
            <LogConnectionForm members={pickable} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Chronology{" "}
            <span className="font-mono text-sm text-thread">
              ({connections.length})
            </span>
          </h2>

          {connections.length === 0 ? (
            <p className="mt-3 text-ink-soft">
              Nothing logged yet. When you help someone, host someone, or meet
              up, capture it here.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {connections.map((conn) => (
                <ConnectionItem
                  key={conn.connection_id}
                  connection={conn}
                  authorName={nameOf(conn.author_id)}
                  withName={nameOf(conn.with_member_id)}
                  isAuthor={conn.author_id === me.member_id}
                />
              ))}
            </ol>
          )}
        </section>
      </main>
    </>
  );
}

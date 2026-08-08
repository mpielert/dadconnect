import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getDirectoryMap } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { CreateEventForm } from "./CreateEventForm";
import { EventCard } from "./EventCard";
import type { EventItem, EventRsvp, RsvpResponse } from "@/lib/types";

export type RsvpGroups = Record<RsvpResponse, string[]>;

export default async function EventsPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const unread = await getUnreadCount();
  const supabase = await createClient();

  const [{ data: eventData }, { data: rsvpData }, dir] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: true }),
    supabase.from("event_rsvps").select("*"),
    getDirectoryMap(),
  ]);

  const events = (eventData as EventItem[] | null) ?? [];
  const rsvps = (rsvpData as EventRsvp[] | null) ?? [];
  const nameOf = (id: string) => dir.get(id)?.name ?? id;

  // Adults other than me, to invite to a "selected" event.
  const pickable = [...dir.values()]
    .filter((m) => !m.is_minor && !m.departed && m.member_id !== me.member_id)
    .map((m) => ({ member_id: m.member_id, name: m.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const groupsByEvent = new Map<string, RsvpGroups>();
  const mine = new Map<string, RsvpResponse>();
  for (const r of rsvps) {
    const g =
      groupsByEvent.get(r.event_id) ?? { going: [], maybe: [], no: [] };
    g[r.response].push(nameOf(r.member_id));
    groupsByEvent.set(r.event_id, g);
    if (r.member_id === me.member_id) mine.set(r.event_id, r.response);
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today).reverse();

  const render = (e: EventItem, isPast: boolean) => (
    <EventCard
      key={e.event_id}
      event={e}
      organizerName={nameOf(e.created_by)}
      groups={groupsByEvent.get(e.event_id) ?? { going: [], maybe: [], no: [] }}
      myResponse={mine.get(e.event_id) ?? null}
      isCreator={e.created_by === me.member_id}
      isPast={isPast}
    />
  );

  return (
    <>
      <SiteHeader
        memberName={me.name}
        active="events"
        unread={unread}
        isAdmin={me.is_admin}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Events</h1>
        <p className="mt-1 text-ink-soft">
          Reunions, meetups, and get-togethers. Post one, or RSVP to what&apos;s
          coming up.
        </p>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Post an event
          </h2>
          <div className="mt-4">
            <CreateEventForm members={pickable} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Upcoming{" "}
            <span className="font-mono text-sm text-thread">
              ({upcoming.length})
            </span>
          </h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-ink-soft">
              Nothing on the calendar yet. Be the one to start something.
            </p>
          ) : (
            <div className="mt-4 space-y-4">{upcoming.map((e) => render(e, false))}</div>
          )}
        </section>

        {past.length > 0 && (
          <section className="mt-10 opacity-75">
            <h2 className="font-display text-xl font-semibold text-ink">Past</h2>
            <div className="mt-4 space-y-4">{past.map((e) => render(e, true))}</div>
          </section>
        )}
      </main>
    </>
  );
}

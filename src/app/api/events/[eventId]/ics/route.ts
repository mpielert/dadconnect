import { createClient } from "@/lib/supabase/server";

/**
 * Downloadable .ics for one event, so a member can add it to their own
 * calendar. Session-authed, and the event is read through the member's own
 * client — so RLS (can_see_event) means you can only export an event you're
 * actually allowed to see.
 *
 * Events store a date plus a free-text time ("6:00pm ET"), so this emits an
 * all-day event and puts the time text in the description — no timezone guessing.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase
    .from("events")
    .select("event_id, title, description, location, event_date, event_time, cancelled_at")
    .eq("event_id", eventId)
    .maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });

  const ev = data as {
    event_id: string;
    title: string;
    description: string | null;
    location: string | null;
    event_date: string;
    event_time: string | null;
    cancelled_at: string | null;
  };

  const esc = (s: string) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\r?\n/g, "\\n");

  const [y, mo, d] = ev.event_date.split("-").map(Number);
  const ymd = (dt: Date) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(
      dt.getUTCDate(),
    ).padStart(2, "0")}`;
  const start = ymd(new Date(Date.UTC(y, mo - 1, d)));
  const end = ymd(new Date(Date.UTC(y, mo - 1, d + 1))); // all-day end is exclusive
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const desc = [
    ev.event_time ? `Time: ${ev.event_time}` : null,
    ev.description,
    "Details & RSVP: https://cmudadconnect.com/events",
  ]
    .filter(Boolean)
    .join("\n");

  const cancelled = !!ev.cancelled_at;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CMUDadConnect//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${ev.event_id}@cmudadconnect.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(cancelled ? `CANCELLED: ${ev.title}` : ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : null,
    `DESCRIPTION:${esc(desc)}`,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cmudadconnect-event.ics"',
    },
  });
}

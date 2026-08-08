"use client";

import { useActionState, useState } from "react";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import { RSVP_LABEL, type EventItem, type RsvpResponse } from "@/lib/types";
import type { RsvpGroups } from "./page";
import { cancelEvent, rsvpEvent, updateEvent } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const RESPONSES: RsvpResponse[] = ["going", "maybe", "no"];

export function EventCard({
  event,
  organizerName,
  groups,
  myResponse,
  isCreator,
  isPast,
}: {
  event: EventItem;
  organizerName: string;
  groups: RsvpGroups;
  myResponse: RsvpResponse | null;
  isCreator: boolean;
  isPast: boolean;
}) {
  const [rsvpState, rsvpAction] = useActionState(rsvpEvent, null);
  const [editState, editAction] = useActionState(updateEvent, null);
  const [cancelState, cancelAction] = useActionState(cancelEvent, null);
  const [editing, setEditing] = useState(false);

  const cancelled = !!event.cancelled_at;

  if (editing) {
    return (
      <article className="rounded-2xl border border-brass/50 bg-paper-raised p-6">
        <form action={editAction} className="space-y-3">
          <input type="hidden" name="event_id" value={event.event_id} />
          <input name="title" defaultValue={event.title} required className={inputCls} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input name="event_date" type="date" defaultValue={event.event_date} required className={inputCls} />
            <input name="event_time" defaultValue={event.event_time ?? ""} placeholder="Time" className={inputCls} />
            <input name="location" defaultValue={event.location ?? ""} placeholder="Location" className={inputCls} />
          </div>
          <textarea name="description" defaultValue={event.description ?? ""} rows={3} className={inputCls} />
          <div className="flex items-center gap-2">
            <SubmitButton>Save</SubmitButton>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft">
              Cancel
            </button>
            {editState?.error && <span className="text-sm text-cardinal">{editState.error}</span>}
          </div>
        </form>
      </article>
    );
  }

  return (
    <article className={`rounded-2xl border border-thread/40 bg-paper-raised p-6 ${cancelled ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl font-semibold text-ink">{event.title}</h3>
            {cancelled && <Pill tone="cardinal">Cancelled</Pill>}
            <Pill tone={event.audience === "selected" ? "brass" : "thread"}>
              {event.audience === "selected" ? "Invited only" : "Everyone"}
            </Pill>
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-thread">
            {fmtDate(event.event_date)}
            {event.event_time ? ` · ${event.event_time}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          <p className="mt-1 text-xs text-ink-soft">Organized by {organizerName}</p>
        </div>
      </div>

      {event.description && (
        <p className="mt-3 whitespace-pre-line text-ink">{event.description}</p>
      )}

      {/* RSVP control */}
      {!cancelled && !isPast && (
        <form action={rsvpAction} className="mt-4 flex flex-wrap items-center gap-2 border-t border-thread/30 pt-4">
          <input type="hidden" name="event_id" value={event.event_id} />
          {RESPONSES.map((r) => (
            <button
              key={r}
              type="submit"
              name="response"
              value={r}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                myResponse === r
                  ? "bg-cardinal text-paper"
                  : "border border-thread/50 text-ink-soft hover:border-cardinal hover:text-cardinal"
              }`}
            >
              {RSVP_LABEL[r]}
            </button>
          ))}
          {rsvpState?.error && <span className="text-sm text-cardinal">{rsvpState.error}</span>}
        </form>
      )}

      {/* Who's coming */}
      <div className="mt-3 space-y-1 text-sm">
        <AttendeeLine label="Going" names={groups.going} tone="text-ink" />
        <AttendeeLine label="Maybe" names={groups.maybe} tone="text-ink-soft" />
      </div>

      {isCreator && !cancelled && (
        <div className="mt-4 flex items-center gap-3 border-t border-thread/30 pt-3">
          <button onClick={() => setEditing(true)} className="text-xs text-ink-soft underline transition hover:text-cardinal">
            Edit
          </button>
          <form action={cancelAction}>
            <input type="hidden" name="event_id" value={event.event_id} />
            <button className="text-xs text-ink-soft underline transition hover:text-cardinal">
              Cancel event
            </button>
          </form>
          {cancelState?.error && <span className="text-xs text-cardinal">{cancelState.error}</span>}
        </div>
      )}
    </article>
  );
}

function AttendeeLine({ label, names, tone }: { label: string; names: string[]; tone: string }) {
  if (names.length === 0) return null;
  return (
    <p className={tone}>
      <span className="font-mono text-[11px] uppercase tracking-wider text-thread">
        {label} ({names.length}):
      </span>{" "}
      {names.join(", ")}
    </p>
  );
}

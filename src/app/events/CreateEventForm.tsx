"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { createEvent } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";
const labelCls = "text-sm font-medium text-ink";

export type PickMember = { member_id: string; name: string };

export function CreateEventForm({ members }: { members: PickMember[] }) {
  const [state, formAction] = useActionState(createEvent, null);
  const [audience, setAudience] = useState<"selected" | "first_gen">("selected");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setAudience("selected");
    }
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div>
        <label className={labelCls} htmlFor="title">
          Title <span className="text-cardinal">*</span>
        </label>
        <input id="title" name="title" required placeholder="e.g. Saturday golf" className={inputCls} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className={labelCls} htmlFor="event_date">
            Date <span className="text-cardinal">*</span>
          </label>
          <input id="event_date" name="event_date" type="date" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="event_time">
            Time
          </label>
          <input id="event_time" name="event_time" placeholder="6:00pm ET" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="location">
            Location
          </label>
          <input id="location" name="location" placeholder="City or venue" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls} htmlFor="description">
          Details
        </label>
        <textarea id="description" name="description" rows={3} placeholder="What's happening, who's it for, anything to bring…" className={inputCls} />
      </div>

      <fieldset className="rounded-lg border border-thread/40 p-4">
        <legend className="px-1 text-sm font-medium text-ink">Who&apos;s it for?</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="radio" name="audience" value="selected" checked={audience === "selected"} onChange={() => setAudience("selected")} className="accent-cardinal" />
          Only selected members
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="radio" name="audience" value="first_gen" checked={audience === "first_gen"} onChange={() => setAudience("first_gen")} className="accent-cardinal" />
          All first-generation CMU students
        </label>

        {audience === "selected" && (
          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-thread/40 bg-paper p-3">
            {members.length === 0 ? (
              <p className="text-sm text-ink-soft">No other members to invite yet.</p>
            ) : (
              members.map((m) => (
                <label key={m.member_id} className="flex cursor-pointer items-center gap-2 py-1 text-sm text-ink">
                  <input type="checkbox" name="invitees" value={m.member_id} className="h-4 w-4 accent-cardinal" />
                  {m.name}
                </label>
              ))
            )}
            <p className="mt-2 text-xs text-ink-soft">
              Only the people you check will see this event or be able to RSVP.
            </p>
          </div>
        )}
      </fieldset>

      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Posting…">Post event</SubmitButton>
        {state?.ok && <span className="text-sm text-thread">Posted ✓</span>}
        {state?.error && <span className="text-sm text-cardinal">{state.error}</span>}
      </div>
    </form>
  );
}

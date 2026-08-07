"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { createPost } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";
const labelCls = "text-sm font-medium text-ink";

export function NewPostForm() {
  const [state, formAction] = useActionState(createPost, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div>
        <label className={labelCls} htmlFor="destination_city">
          Destination <span className="text-cardinal">*</span>
        </label>
        <input
          id="destination_city"
          name="destination_city"
          required
          placeholder="City, region or country"
          className={inputCls}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="start_date">
            From (optional)
          </label>
          <input id="start_date" name="start_date" type="date" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="end_date">
            To (optional)
          </label>
          <input id="end_date" name="end_date" type="date" className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="highlights">
          Highlights <span className="text-cardinal">*</span>
        </label>
        <textarea
          id="highlights"
          name="highlights"
          required
          rows={4}
          placeholder="Recommendations, tips, what to skip…"
          className={inputCls}
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="has_photos" className="h-4 w-4 accent-cardinal" />
        I have a few photos to share (upload coming later)
      </label>

      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Posting…">Share trip</SubmitButton>
        {state?.ok && <span className="text-sm text-thread">Posted ✓</span>}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}

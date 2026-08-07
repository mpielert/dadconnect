"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { respondToHostingRequest } from "../actions";

export function RequestActions({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState(respondToHostingRequest, null);
  const [countering, setCountering] = useState(false);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="request_id" value={requestId} />

      {countering && (
        <div>
          <label className="text-sm font-medium text-ink">
            Counter-proposal
          </label>
          <input
            name="counter_note"
            placeholder="e.g. Can't host those dates, but the week after works."
            className="mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!countering ? (
          <>
            <button
              type="submit"
              name="status"
              value="accepted"
              className="rounded-lg bg-cardinal px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90"
            >
              Accept
            </button>
            <button
              type="submit"
              name="status"
              value="declined"
              className="rounded-lg border border-thread/50 px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-cardinal hover:text-cardinal"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => setCountering(true)}
              className="rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft transition hover:border-brass hover:text-ink"
            >
              Counter…
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="status" value="countered" />
            <SubmitButton pendingLabel="Sending…">Send counter</SubmitButton>
            <button
              type="button"
              onClick={() => setCountering(false)}
              className="rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft"
            >
              Back
            </button>
          </>
        )}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}

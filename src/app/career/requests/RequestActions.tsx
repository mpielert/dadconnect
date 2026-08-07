"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { respondToRequest } from "../actions";

export function RequestActions({ requestId }: { requestId: string }) {
  const [state, formAction] = useActionState(respondToRequest, null);
  const [redirecting, setRedirecting] = useState(false);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="request_id" value={requestId} />

      {redirecting && (
        <div>
          <label className="text-sm font-medium text-ink">
            Point them to someone
          </label>
          <input
            name="redirect_note"
            placeholder="e.g. Talk to Mike — he's actually in that industry."
            className="mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!redirecting ? (
          <>
            <ActionButton value="accepted" tone="cardinal">
              Accept
            </ActionButton>
            <ActionButton value="declined" tone="outline">
              Decline
            </ActionButton>
            <button
              type="button"
              onClick={() => setRedirecting(true)}
              className="rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft transition hover:border-brass hover:text-ink"
            >
              Redirect…
            </button>
          </>
        ) : (
          <>
            <input type="hidden" name="status" value="redirected" />
            <SubmitButton pendingLabel="Sending…">Send redirect</SubmitButton>
            <button
              type="button"
              onClick={() => setRedirecting(false)}
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

function ActionButton({
  value,
  tone,
  children,
}: {
  value: string;
  tone: "cardinal" | "outline";
  children: React.ReactNode;
}) {
  const cls =
    tone === "cardinal"
      ? "bg-cardinal text-paper hover:opacity-90"
      : "border border-thread/50 text-ink-soft hover:border-cardinal hover:text-cardinal";
  return (
    <button
      type="submit"
      name="status"
      value={value}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${cls}`}
    >
      {children}
    </button>
  );
}

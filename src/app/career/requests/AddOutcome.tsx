"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { addOutcome } from "../actions";

export function AddOutcome({
  requestId,
  current,
}: {
  requestId: string;
  current: string | null;
}) {
  const [state, formAction] = useActionState(addOutcome, null);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="request_id" value={requestId} />
      <label className="font-mono text-[11px] uppercase tracking-wider text-thread">
        Outcome (optional)
      </label>
      <textarea
        name="outcome_note"
        rows={2}
        defaultValue={current ?? ""}
        placeholder="e.g. Led to a coffee chat and a referral."
        className="w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal"
      />
      <div className="flex items-center gap-3">
        <SubmitButton>Save outcome</SubmitButton>
        {state?.ok && <span className="text-sm text-thread">Saved ✓</span>}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}

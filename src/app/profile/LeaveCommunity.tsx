"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { leaveCommunity } from "./actions";

function ConfirmButton({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!enabled || pending}
      className="rounded-lg bg-cardinal px-5 py-2.5 font-medium text-paper transition hover:opacity-90 disabled:opacity-40"
    >
      {pending ? "Leaving…" : "Leave the community"}
    </button>
  );
}

export function LeaveCommunity() {
  const [state, formAction] = useActionState(leaveCommunity, null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="rounded-xl border border-cardinal/40 bg-cardinal/5 p-5">
      <h3 className="font-display text-lg font-semibold text-cardinal">
        Leave the community
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        This removes your access and takes you out of the directory and every
        feature. Your name and details are cleared; things you posted stay but
        show as “Former member,” so other people’s conversations aren’t broken.
        Any children you manage are removed too. This can’t be undone.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-lg border border-cardinal/60 px-4 py-2 text-sm font-medium text-cardinal transition hover:bg-cardinal hover:text-paper"
        >
          Leave the community…
        </button>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <label className="block text-sm text-ink">
            Type <span className="font-mono font-semibold">LEAVE</span> to
            confirm:
            <input
              name="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal"
            />
          </label>
          <div className="flex items-center gap-3">
            <ConfirmButton enabled={confirm === "LEAVE"} />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirm("");
              }}
              className="rounded-lg border border-thread/50 px-4 py-2.5 text-sm text-ink-soft"
            >
              Cancel
            </button>
            {state?.error && (
              <span className="text-sm text-cardinal">{state.error}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

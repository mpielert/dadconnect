"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { CONNECTION_CONTEXT_LABEL, type ConnectionContext } from "@/lib/types";
import type { PickMember } from "./page";
import { logConnection } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";
const labelCls = "text-sm font-medium text-ink";

const CONTEXTS = Object.keys(CONNECTION_CONTEXT_LABEL) as ConnectionContext[];

export function LogConnectionForm({ members }: { members: PickMember[] }) {
  const [state, formAction] = useActionState(logConnection, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  if (members.length === 0) {
    return (
      <p className="text-ink-soft">
        Once there are other members to connect with, you&apos;ll be able to log
        connections here.
      </p>
    );
  }

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="with_member_id">
            Who did you connect with? <span className="text-cardinal">*</span>
          </label>
          <select
            id="with_member_id"
            name="with_member_id"
            required
            defaultValue=""
            className={inputCls}
          >
            <option value="" disabled>
              Choose a member…
            </option>
            {members.map((m) => (
              <option key={m.member_id} value={m.member_id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="context">
            How?
          </label>
          <select id="context" name="context" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {CONTEXTS.map((c) => (
              <option key={c} value={c}>
                {CONNECTION_CONTEXT_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="summary">
          Short summary <span className="text-cardinal">*</span>
        </label>
        <textarea
          id="summary"
          name="summary"
          required
          maxLength={500}
          rows={3}
          placeholder="e.g. Sue hosted me for three nights in Lisbon and showed me the best pastéis in town."
          className={inputCls}
        />
      </div>

      <div className="sm:w-48">
        <label className={labelCls} htmlFor="connected_on">
          When (optional)
        </label>
        <input
          id="connected_on"
          name="connected_on"
          type="date"
          className={inputCls}
        />
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton pendingLabel="Logging…">Log connection</SubmitButton>
        {state?.ok && <span className="text-sm text-thread">Logged ✓</span>}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}

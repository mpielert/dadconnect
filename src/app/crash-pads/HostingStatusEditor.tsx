"use client";

import { useActionState, useEffect, useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import type { HostingStatus } from "@/lib/types";
import { updateHostingStatus } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";

export function HostingStatusEditor({
  status,
}: {
  status: HostingStatus | null;
}) {
  const [state, formAction] = useActionState(updateHostingStatus, null);

  // Controlled fields, kept in sync with what's actually stored. React 19
  // auto-resets a <form> after its action runs; with uncontrolled fields that
  // reset snapped the dropdown back to "No" even after a successful save. By
  // controlling the value and re-syncing when the server sends fresh props
  // (after revalidatePath), the form always reflects the persisted status.
  const persistedStatus = status?.status ?? "no";
  const persistedConstraints = status?.constraints ?? "";
  const [statusValue, setStatusValue] = useState(persistedStatus);
  const [constraintsValue, setConstraintsValue] = useState(persistedConstraints);

  useEffect(() => {
    setStatusValue(persistedStatus);
    setConstraintsValue(persistedConstraints);
  }, [persistedStatus, persistedConstraints]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-ink" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value as typeof statusValue)}
            className={inputCls}
          >
            <option value="yes">Yes — happy to host</option>
            <option value="maybe">Maybe — ask me</option>
            <option value="no">No — not right now</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label
            className="block text-sm font-medium text-ink"
            htmlFor="constraints"
          >
            Constraints (optional)
          </label>
          <input
            id="constraints"
            name="constraints"
            placeholder="e.g. couch only · 2 weeks notice · kids welcome"
            value={constraintsValue}
            onChange={(e) => setConstraintsValue(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SubmitButton>Save status</SubmitButton>
        {state?.ok && <span className="text-sm text-thread">Saved ✓</span>}
        {state?.error && (
          <span className="text-sm text-cardinal">{state.error}</span>
        )}
      </div>
    </form>
  );
}

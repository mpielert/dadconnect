"use client";

import { useActionState } from "react";
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
            defaultValue={status?.status ?? "no"}
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
            defaultValue={status?.constraints ?? ""}
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

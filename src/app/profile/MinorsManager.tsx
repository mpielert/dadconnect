"use client";

import { useActionState, useState } from "react";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import type { Member } from "@/lib/types";
import { createMinor, updateMinor } from "./actions";

const inputCls =
  "w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";

export function MinorsManager({ minors }: { minors: Member[] }) {
  return (
    <div className="space-y-4">
      {minors.length === 0 && (
        <p className="text-sm text-ink-soft">
          You aren&apos;t managing any minor records yet.
        </p>
      )}

      {minors.map((m) => (
        <MinorRow key={m.member_id} minor={m} />
      ))}

      <AddMinor />
    </div>
  );
}

function MinorRow({ minor }: { minor: Member }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(updateMinor, null);

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-thread/40 bg-paper-raised px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg text-ink">{minor.name}</span>
          <Pill tone="thread">age {minor.age ?? "—"}</Pill>
          <span className="font-mono text-[11px] text-thread">
            {minor.member_id}
          </span>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-ink-soft transition hover:text-cardinal"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-xl border border-brass/50 bg-paper-raised px-4 py-3"
    >
      <input type="hidden" name="member_id" value={minor.member_id} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-ink-soft">Name</label>
          <input name="name" defaultValue={minor.name} required className={inputCls} />
        </div>
        <div className="w-24">
          <label className="text-xs text-ink-soft">Age</label>
          <input
            name="age"
            type="number"
            min={0}
            max={17}
            defaultValue={minor.age ?? ""}
            required
            className={inputCls}
          />
        </div>
        <div className="flex gap-2">
          <SubmitButton>Save</SubmitButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-thread/50 px-4 py-2.5 text-sm text-ink-soft"
          >
            Cancel
          </button>
        </div>
      </div>
      {state?.error && (
        <p className="mt-2 text-sm text-cardinal">{state.error}</p>
      )}
    </form>
  );
}

function AddMinor() {
  const [state, formAction] = useActionState(createMinor, null);

  return (
    <form
      action={formAction}
      className="rounded-xl border border-dashed border-thread/50 px-4 py-4"
    >
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-thread">
        Add a minor
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs text-ink-soft">Name</label>
          <input name="name" required className={inputCls} />
        </div>
        <div className="w-24">
          <label className="text-xs text-ink-soft">Age</label>
          <input
            name="age"
            type="number"
            min={0}
            max={17}
            required
            className={inputCls}
          />
        </div>
        <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Only name and age are ever stored for a minor — both visible to the
        group. Nothing else is collected.
      </p>
      {state?.error && (
        <p className="mt-2 text-sm text-cardinal">{state.error}</p>
      )}
    </form>
  );
}

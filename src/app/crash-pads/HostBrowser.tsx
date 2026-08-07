"use client";

import { useActionState, useMemo, useState } from "react";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import { HOST_STATUS_LABEL, HOST_STATUS_TONE } from "@/lib/types";
import type { HostListing } from "./page";
import { sendHostingRequest } from "./actions";

const inputCls =
  "w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";
const labelCls = "text-sm font-medium text-ink";

export function HostBrowser({ hosts }: { hosts: HostListing[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return hosts;
    return hosts.filter((h) =>
      [h.name, h.city].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [hosts, query]);

  if (hosts.length === 0) {
    return (
      <p className="text-ink-soft">
        No one is open to hosting yet. Set your own status above to get things
        started.
      </p>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by city or name…"
        className="w-full rounded-lg border border-thread/50 bg-paper px-4 py-2.5 text-ink outline-none focus:border-cardinal"
      />
      {filtered.length === 0 ? (
        <p className="mt-6 text-ink-soft">No hosts match your search.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {filtered.map((h) => (
            <HostCard key={h.member_id} host={h} />
          ))}
        </div>
      )}
    </div>
  );
}

function HostCard({ host }: { host: HostListing }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(sendHostingRequest, null);

  return (
    <div className="rounded-xl border border-thread/40 bg-paper-raised p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-ink">
              {host.name}
            </h3>
            <Pill tone={HOST_STATUS_TONE[host.status]}>
              {HOST_STATUS_LABEL[host.status]}
            </Pill>
          </div>
          <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-soft">
            {host.city ?? "City not shared"}
          </p>
          {host.constraints && (
            <p className="mt-2 text-sm text-ink-soft">{host.constraints}</p>
          )}
        </div>
        {!state?.ok && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-lg border border-cardinal/60 px-4 py-2 text-sm font-medium text-cardinal transition hover:bg-cardinal hover:text-paper"
          >
            {open ? "Cancel" : "Request to stay"}
          </button>
        )}
      </div>

      {state?.ok && (
        <p className="mt-3 rounded-lg border border-thread/40 bg-paper px-3 py-2 text-sm text-thread">
          Request sent ✓ — track it under “My requests.”
        </p>
      )}

      {open && !state?.ok && (
        <form
          action={formAction}
          className="mt-4 space-y-3 border-t border-thread/30 pt-4"
        >
          <input type="hidden" name="host_id" value={host.member_id} />
          <div>
            <label className={labelCls}>City</label>
            <input
              name="city"
              required
              defaultValue={host.city ?? ""}
              placeholder="Which city are you asking about?"
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Arrive</label>
              <input type="date" name="start_date" className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Depart</label>
              <input type="date" name="end_date" className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Headcount</label>
              <input
                type="number"
                name="headcount"
                min={1}
                defaultValue={1}
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Note</label>
            <textarea
              name="context"
              rows={3}
              placeholder="A little context — who's coming and why."
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div className="flex items-center gap-4">
            <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
            {state?.error && (
              <span className="text-sm text-cardinal">{state.error}</span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

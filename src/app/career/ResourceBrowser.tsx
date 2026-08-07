"use client";

import { useActionState, useMemo, useState } from "react";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import type { ResourceWithName } from "./page";
import { sendRequest } from "./actions";

const inputCls =
  "w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";

export function ResourceBrowser({
  resources,
}: {
  resources: ResourceWithName[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter((r) =>
      [r.name, r.industry, r.function_area, r.company_or_school]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [resources, query]);

  if (resources.length === 0) {
    return (
      <p className="text-ink-soft">
        No one has opted in as a resource yet. Be the first above.
      </p>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by industry, function, company, or name…"
        className="w-full rounded-lg border border-thread/50 bg-paper px-4 py-2.5 text-ink outline-none focus:border-cardinal"
      />

      {filtered.length === 0 ? (
        <p className="mt-6 text-ink-soft">No resources match your search.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {filtered.map((r) => (
            <ResourceCard key={r.member_id} resource={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource }: { resource: ResourceWithName }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(sendRequest, null);

  const tags = [
    resource.industry,
    resource.function_area,
    resource.company_or_school,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-xl border border-thread/40 bg-paper-raised p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {resource.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.length ? (
              tags.map((t) => (
                <Pill key={t} tone="brass">
                  {t}
                </Pill>
              ))
            ) : (
              <span className="text-sm text-ink-soft">No tags yet</span>
            )}
          </div>
        </div>
        {!state?.ok && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-lg border border-cardinal/60 px-4 py-2 text-sm font-medium text-cardinal transition hover:bg-cardinal hover:text-paper"
          >
            {open ? "Cancel" : "Request"}
          </button>
        )}
      </div>

      {state?.ok && (
        <p className="mt-3 rounded-lg border border-thread/40 bg-paper px-3 py-2 text-sm text-thread">
          Request sent ✓ — track it under “My requests.”
        </p>
      )}

      {open && !state?.ok && (
        <form action={formAction} className="mt-4 space-y-3 border-t border-thread/30 pt-4">
          <input type="hidden" name="resource_id" value={resource.member_id} />
          <div>
            <label className="text-sm font-medium text-ink">
              What are you looking for?
            </label>
            <select name="ask_kind" className={`mt-1 ${inputCls}`}>
              <option value="Advice">Advice</option>
              <option value="Introduction">An introduction</option>
              <option value="Mock interview">A mock interview</option>
              <option value="Other">Something else</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">
              Add a note (optional)
            </label>
            <textarea
              name="details"
              rows={3}
              placeholder="A sentence or two about what you're hoping for."
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

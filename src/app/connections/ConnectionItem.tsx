"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/Pill";
import { SubmitButton } from "@/components/SubmitButton";
import {
  CONNECTION_CONTEXT_LABEL,
  CONNECTION_CONTEXT_TONE,
  type Connection,
  type ConnectionContext,
} from "@/lib/types";
import { updateConnection } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";
const CONTEXTS = Object.keys(CONNECTION_CONTEXT_LABEL) as ConnectionContext[];

export function ConnectionItem({
  connection,
  authorName,
  withName,
  isAuthor,
}: {
  connection: Connection;
  authorName: string;
  withName: string;
  isAuthor: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(updateConnection, null);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  const when = connection.connected_on ?? connection.created_at.slice(0, 10);

  if (editing) {
    return (
      <li className="rounded-xl border border-brass/50 bg-paper-raised p-5">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="connection_id" value={connection.connection_id} />
          <div className="flex flex-wrap gap-3">
            <select
              name="context"
              defaultValue={connection.context ?? ""}
              className={`${inputCls} sm:w-40`}
            >
              <option value="">—</option>
              {CONTEXTS.map((c) => (
                <option key={c} value={c}>
                  {CONNECTION_CONTEXT_LABEL[c]}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="connected_on"
              defaultValue={connection.connected_on ?? ""}
              className={`${inputCls} sm:w-44`}
            />
          </div>
          <textarea
            name="summary"
            defaultValue={connection.summary}
            required
            maxLength={500}
            rows={3}
            className={inputCls}
          />
          <div className="flex items-center gap-2">
            <SubmitButton>Save</SubmitButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft"
            >
              Cancel
            </button>
            {state?.error && (
              <span className="text-sm text-cardinal">{state.error}</span>
            )}
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-thread/40 bg-paper-raised p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-ink">
          <Link
            href={`/directory/${connection.author_id}`}
            className="font-medium underline decoration-thread/40 underline-offset-2 hover:text-cardinal"
          >
            {authorName}
          </Link>
          <span className="text-thread"> ↔ </span>
          <Link
            href={`/directory/${connection.with_member_id}`}
            className="font-medium underline decoration-thread/40 underline-offset-2 hover:text-cardinal"
          >
            {withName}
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {connection.context && (
            <Pill tone={CONNECTION_CONTEXT_TONE[connection.context]}>
              {CONNECTION_CONTEXT_LABEL[connection.context]}
            </Pill>
          )}
          <span className="font-mono text-[11px] text-thread">{when}</span>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-line text-ink">{connection.summary}</p>

      {isAuthor && (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 text-xs text-ink-soft underline transition hover:text-cardinal"
        >
          Edit
        </button>
      )}
    </li>
  );
}

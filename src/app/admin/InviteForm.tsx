"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { inviteMember } from "./actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-thread/50 bg-paper px-3 py-2 text-ink outline-none focus:border-cardinal";

export function InviteForm() {
  const [state, formAction] = useActionState(inviteMember, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="email">
            Email <span className="text-cardinal">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="them@example.com"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="invited_name">
            Name (optional)
          </label>
          <input id="invited_name" name="invited_name" className={inputCls} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton pendingLabel="Inviting…">Send invitation</SubmitButton>
        {state?.ok && !state.error && (
          <span className="text-sm text-thread">
            Invited ✓ — they can sign in now.
          </span>
        )}
        {state?.error && (
          <span
            className={`text-sm ${state.ok ? "text-brass" : "text-cardinal"}`}
          >
            {state.error}
          </span>
        )}
      </div>

      <p className="text-xs text-ink-soft">
        This creates their account and emails them sign-in instructions. They
        set up their own profile the first time they sign in.
      </p>
    </form>
  );
}

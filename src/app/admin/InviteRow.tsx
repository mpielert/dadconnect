"use client";

import { useActionState } from "react";
import { Pill } from "@/components/Pill";
import { resendInvite, revokeInvite } from "./actions";

export function InviteActions({
  code,
  email,
  joined,
  revoked,
}: {
  code: string;
  email: string | null;
  joined: boolean;
  revoked: boolean;
}) {
  const [revokeState, revokeAction] = useActionState(revokeInvite, null);
  const [resendState, resendAction] = useActionState(resendInvite, null);

  if (joined) return <Pill tone="thread">Joined</Pill>;
  if (revoked) return <Pill tone="neutral">Revoked</Pill>;

  return (
    <div className="flex items-center gap-2">
      <Pill tone="brass">Invited</Pill>
      {email && (
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <button className="text-xs text-ink-soft underline transition hover:text-ink">
            {resendState?.ok ? "Resent ✓" : "Resend"}
          </button>
        </form>
      )}
      <form action={revokeAction}>
        <input type="hidden" name="code" value={code} />
        <button className="text-xs text-ink-soft underline transition hover:text-cardinal">
          Revoke
        </button>
      </form>
      {(revokeState?.error || resendState?.error) && (
        <span className="text-xs text-cardinal">
          {revokeState?.error ?? resendState?.error}
        </span>
      )}
    </div>
  );
}

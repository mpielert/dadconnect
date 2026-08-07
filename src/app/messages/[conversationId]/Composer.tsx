"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { sendMessage } from "../actions";

export function Composer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendMessage, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input
        name="body"
        required
        autoComplete="off"
        placeholder="Write a message…"
        className="flex-1 rounded-lg border border-thread/50 bg-paper px-4 py-2.5 text-ink outline-none focus:border-cardinal"
      />
      <SubmitButton pendingLabel="Sending…">Send</SubmitButton>
      {state?.error && (
        <span className="self-center text-sm text-cardinal">{state.error}</span>
      )}
    </form>
  );
}

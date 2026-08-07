"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { addReply } from "./actions";

export function ReplyForm({ postId }: { postId: string }) {
  const [state, formAction] = useActionState(addReply, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="mt-3 flex items-start gap-2">
      <input type="hidden" name="post_id" value={postId} />
      <input
        name="message"
        required
        placeholder="Ask a question or add a tip…"
        className="flex-1 rounded-lg border border-thread/50 bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-cardinal"
      />
      <SubmitButton pendingLabel="…">Reply</SubmitButton>
      {state?.error && (
        <span className="self-center text-sm text-cardinal">{state.error}</span>
      )}
    </form>
  );
}

"use client";

import { deleteMessage } from "../actions";

/** Delete one of your own messages (RLS enforces sender-only server-side). */
export function DeleteMessageButton({
  messageId,
  conversationId,
}: {
  messageId: string;
  conversationId: string;
}) {
  return (
    <form
      action={deleteMessage}
      onSubmit={(e) => {
        if (!confirm("Delete this message?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="message_id" value={messageId} />
      <input type="hidden" name="conversation_id" value={conversationId} />
      <button
        type="submit"
        className="font-mono text-[10px] text-paper/70 underline transition hover:text-paper"
      >
        delete
      </button>
    </form>
  );
}

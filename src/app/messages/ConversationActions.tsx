"use client";

import {
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
} from "./actions";

/**
 * Archive/unarchive + delete controls for a conversation. Archiving is a
 * per-user hide (reversible); deleting removes the thread and its messages for
 * both people, so it asks for confirmation first.
 */
export function ConversationActions({
  conversationId,
  archived,
  size = "sm",
}: {
  conversationId: string;
  archived: boolean;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "text-xs" : "text-[11px]";
  return (
    <div className="flex items-center gap-3">
      <form action={archived ? unarchiveConversation : archiveConversation}>
        <input type="hidden" name="conversation_id" value={conversationId} />
        <button
          type="submit"
          className={`${cls} text-ink-soft underline transition hover:text-brass`}
        >
          {archived ? "Unarchive" : "Archive"}
        </button>
      </form>
      <form
        action={deleteConversation}
        onSubmit={(e) => {
          if (
            !confirm(
              "Delete this conversation and all its messages? This can't be undone.",
            )
          )
            e.preventDefault();
        }}
      >
        <input type="hidden" name="conversation_id" value={conversationId} />
        <button
          type="submit"
          className={`${cls} text-ink-soft underline transition hover:text-cardinal`}
        >
          Delete
        </button>
      </form>
    </div>
  );
}

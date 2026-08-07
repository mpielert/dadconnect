import { startConversation } from "@/app/messages/actions";
import type { ConversationOrigin } from "@/lib/types";

/**
 * Get-or-create a conversation with `otherId` and jump into the thread.
 * Used from Directory profiles and from accepted crash-pad / career requests.
 */
export function MessageButton({
  otherId,
  origin = "direct",
  originId,
  label = "Message",
  variant = "solid",
}: {
  otherId: string;
  origin?: ConversationOrigin;
  originId?: string;
  label?: string;
  variant?: "solid" | "outline";
}) {
  const cls =
    variant === "solid"
      ? "bg-cardinal text-paper hover:opacity-90"
      : "border border-cardinal/60 text-cardinal hover:bg-cardinal hover:text-paper";

  return (
    <form action={startConversation}>
      <input type="hidden" name="other_id" value={otherId} />
      <input type="hidden" name="origin" value={origin} />
      {originId && <input type="hidden" name="origin_id" value={originId} />}
      <button
        type="submit"
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${cls}`}
      >
        {label}
      </button>
    </form>
  );
}

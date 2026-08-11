"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { getOrCreateConversation } from "@/lib/messaging";
import { str, type ActionState } from "@/lib/form";
import type { ConversationOrigin } from "@/lib/types";

/**
 * Entry point used by Directory / Crash Pads / Career: get-or-create the
 * conversation with someone, then land in the thread.
 */
export async function startConversation(formData: FormData): Promise<void> {
  const otherId = str(formData, "other_id");
  if (!otherId) redirect("/messages");

  const origin = (str(formData, "origin") ?? "direct") as ConversationOrigin;
  const originId = str(formData, "origin_id") ?? undefined;

  const convo = await getOrCreateConversation(otherId, origin, originId);
  if (!convo) redirect("/messages?error=unavailable");

  redirect(`/messages/${convo.conversation_id}`);
}

/** Send a message into an existing conversation. */
export async function sendMessage(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const conversationId = str(formData, "conversation_id");
  const body = str(formData, "body");
  if (!conversationId) return { ok: false, error: "Missing conversation." };
  if (!body) return { ok: false, error: "Write a message." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: me.member_id,
    body,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

/** Delete a whole conversation + its messages (RLS: participants only). */
export async function deleteConversation(formData: FormData): Promise<void> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const conversationId = str(formData, "conversation_id");
  if (conversationId) {
    const supabase = await createClient();
    // Messages cascade via the FK's ON DELETE CASCADE.
    await supabase.from("conversations").delete().eq("conversation_id", conversationId);
    revalidatePath("/messages");
  }
  redirect("/messages");
}

/** Hide a conversation from your own list (reversible; RLS: self only). */
export async function archiveConversation(formData: FormData): Promise<void> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const conversationId = str(formData, "conversation_id");
  if (conversationId) {
    const supabase = await createClient();
    await supabase
      .from("conversation_hides")
      .upsert(
        { conversation_id: conversationId, member_id: me.member_id },
        { onConflict: "conversation_id,member_id" },
      );
    revalidatePath("/messages");
  }
  redirect("/messages");
}

/** Restore an archived conversation to your list. */
export async function unarchiveConversation(formData: FormData): Promise<void> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const conversationId = str(formData, "conversation_id");
  if (conversationId) {
    const supabase = await createClient();
    await supabase
      .from("conversation_hides")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("member_id", me.member_id);
    revalidatePath("/messages");
  }
  redirect("/messages");
}

/** Delete a single message (RLS: sender only). */
export async function deleteMessage(formData: FormData): Promise<void> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const messageId = str(formData, "message_id");
  const conversationId = str(formData, "conversation_id");
  if (messageId) {
    const supabase = await createClient();
    await supabase.from("messages").delete().eq("message_id", messageId);
    if (conversationId) revalidatePath(`/messages/${conversationId}`);
    revalidatePath("/messages");
  }
}

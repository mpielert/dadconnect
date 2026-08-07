"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { bool, str, type ActionState } from "@/lib/form";

/** Share a trip post. */
export async function createPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const destination = str(formData, "destination_city");
  const highlights = str(formData, "highlights");
  if (!destination) return { ok: false, error: "Destination is required." };
  if (!highlights) return { ok: false, error: "Add some highlights." };

  const supabase = await createClient();
  const { error } = await supabase.from("travel_posts").insert({
    post_id: `TP-${crypto.randomUUID()}`,
    author_id: me.member_id,
    destination_city: destination,
    start_date: str(formData, "start_date"),
    end_date: str(formData, "end_date"),
    highlights,
    has_photos: bool(formData, "has_photos"),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/travel");
  return { ok: true };
}

/** Reply to a trip post. */
export async function addReply(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const postId = str(formData, "post_id");
  const message = str(formData, "message");
  if (!postId) return { ok: false, error: "Missing post." };
  if (!message) return { ok: false, error: "Write a message." };

  const supabase = await createClient();
  const { error } = await supabase.from("travel_replies").insert({
    reply_id: `TR-${crypto.randomUUID()}`,
    post_id: postId,
    author_id: me.member_id,
    message,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/travel");
  return { ok: true };
}

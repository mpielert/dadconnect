"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { str, type ActionState } from "@/lib/form";

const CONTEXTS = ["career", "crash_pad", "travel", "directory", "other"];

/** Log a connection with another member. */
export async function logConnection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const withId = str(formData, "with_member_id");
  const summary = str(formData, "summary");
  const context = str(formData, "context");

  if (!withId) return { ok: false, error: "Pick who you connected with." };
  if (withId === me.member_id) {
    return { ok: false, error: "Pick someone other than yourself." };
  }
  if (!summary) return { ok: false, error: "Add a short summary." };
  if (context && !CONTEXTS.includes(context)) {
    return { ok: false, error: "Invalid context." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("connections").insert({
    author_id: me.member_id,
    with_member_id: withId,
    context,
    summary,
    connected_on: str(formData, "connected_on"),
  });

  // RLS rejects a minor as with_member_id (is_adult_member check).
  if (error) return { ok: false, error: error.message };

  revalidatePath("/connections");
  return { ok: true };
}

/** Edit one of your own connection entries. */
export async function updateConnection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const connectionId = str(formData, "connection_id");
  const summary = str(formData, "summary");
  const context = str(formData, "context");
  if (!connectionId) return { ok: false, error: "Missing entry." };
  if (!summary) return { ok: false, error: "Summary can't be empty." };
  if (context && !CONTEXTS.includes(context)) {
    return { ok: false, error: "Invalid context." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("connections")
    .update({
      summary,
      context,
      connected_on: str(formData, "connected_on"),
    })
    .eq("connection_id", connectionId)
    .eq("author_id", me.member_id) // only the author may edit
    .select("connection_id");

  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "You can only edit your own entries." };
  }

  revalidatePath("/connections");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { intOrNull, str, type ActionState } from "@/lib/form";

/** Create a gathering. */
export async function createEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const title = str(formData, "title");
  const eventDate = str(formData, "event_date");
  if (!title) return { ok: false, error: "Give it a title." };
  if (!eventDate) return { ok: false, error: "Pick a date." };

  const audience = str(formData, "audience");
  if (audience !== "selected" && audience !== "first_gen") {
    return { ok: false, error: "Pick who it's for." };
  }
  const invitees = (formData.getAll("invitees") as string[]).filter(Boolean);
  if (audience === "selected" && invitees.length === 0) {
    return { ok: false, error: "Pick at least one member to invite." };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("events")
    .insert({
      created_by: me.member_id,
      title,
      description: str(formData, "description"),
      location: str(formData, "location"),
      event_date: eventDate,
      event_time: str(formData, "event_time"),
      audience,
    })
    .select("event_id")
    .single();
  if (error || !created) {
    return { ok: false, error: error?.message ?? "Could not create event." };
  }

  if (audience === "selected") {
    const { error: invErr } = await supabase.from("event_invitees").insert(
      invitees.map((member_id) => ({ event_id: created.event_id, member_id })),
    );
    if (invErr) return { ok: false, error: invErr.message };
  }

  revalidatePath("/events");
  return { ok: true };
}

/** Edit an event you created. */
export async function updateEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const eventId = str(formData, "event_id");
  const title = str(formData, "title");
  const eventDate = str(formData, "event_date");
  if (!eventId) return { ok: false, error: "Missing event." };
  if (!title) return { ok: false, error: "Give it a title." };
  if (!eventDate) return { ok: false, error: "Pick a date." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("events")
    .update({
      title,
      description: str(formData, "description"),
      location: str(formData, "location"),
      event_date: eventDate,
      event_time: str(formData, "event_time"),
    })
    .eq("event_id", eventId)
    .eq("created_by", me.member_id)
    .select("event_id");

  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "You can only edit events you created." };
  }

  revalidatePath("/events");
  return { ok: true };
}

/** Cancel (soft) an event you created — keeps it visible, marked cancelled. */
export async function cancelEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const eventId = str(formData, "event_id");
  if (!eventId) return { ok: false, error: "Missing event." };

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("events")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("created_by", me.member_id)
    .select("event_id");

  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "You can only cancel events you created." };
  }

  revalidatePath("/events");
  return { ok: true };
}

/** Set (or change) your RSVP to an event. */
export async function rsvpEvent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const eventId = str(formData, "event_id");
  const response = str(formData, "response");
  if (!eventId) return { ok: false, error: "Missing event." };
  if (!response || !["going", "maybe", "no"].includes(response)) {
    return { ok: false, error: "Pick a response." };
  }

  const headcount = Math.max(1, intOrNull(formData, "headcount") ?? 1);

  const supabase = await createClient();
  const { error } = await supabase.from("event_rsvps").upsert(
    {
      event_id: eventId,
      member_id: me.member_id,
      response,
      headcount,
      note: str(formData, "note"),
    },
    { onConflict: "event_id,member_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/events");
  return { ok: true };
}

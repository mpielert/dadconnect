"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { intOrNull, str, type ActionState } from "@/lib/form";

/** Set/change your own hosting status + constraints. */
export async function updateHostingStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const status = str(formData, "status");
  if (!status || !["yes", "maybe", "no"].includes(status)) {
    return { ok: false, error: "Pick a hosting status." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hosting_status").upsert(
    {
      member_id: me.member_id,
      status,
      constraints: str(formData, "constraints"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/crash-pads");
  return { ok: true };
}

/** Traveler sends a hosting request to a host. */
export async function sendHostingRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const hostId = str(formData, "host_id");
  const city = str(formData, "city");
  if (!hostId) return { ok: false, error: "Missing host." };
  if (hostId === me.member_id) {
    return { ok: false, error: "You can't request to stay with yourself." };
  }
  if (!city) return { ok: false, error: "City is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("hosting_requests").insert({
    request_id: `HR-${crypto.randomUUID()}`,
    traveler_id: me.member_id,
    host_id: hostId,
    city,
    start_date: str(formData, "start_date"),
    end_date: str(formData, "end_date"),
    headcount: intOrNull(formData, "headcount"),
    context: str(formData, "context"),
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/crash-pads/requests");
  return { ok: true };
}

/** Host responds: accept / decline / counter (with a note). */
export async function respondToHostingRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const requestId = str(formData, "request_id");
  const status = str(formData, "status");
  if (!requestId || !status) return { ok: false, error: "Missing fields." };
  if (!["accepted", "declined", "countered"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  const counterNote =
    status === "countered" ? str(formData, "counter_note") : null;
  if (status === "countered" && !counterNote) {
    return { ok: false, error: "Add a note with your counter-proposal." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("hosting_requests")
    .update({ status, counter_note: counterNote })
    .eq("request_id", requestId)
    .eq("host_id", me.member_id); // only the host may respond

  if (error) return { ok: false, error: error.message };

  revalidatePath("/crash-pads/requests");
  return { ok: true };
}

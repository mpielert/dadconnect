"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { bool, str, type ActionState } from "@/lib/form";

/** Opt in/out as a career resource and edit your tags. */
export async function updateResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.from("career_resources").upsert(
    {
      member_id: me.member_id,
      opted_in: bool(formData, "opted_in"),
      industry: str(formData, "industry"),
      company_or_school: str(formData, "company_or_school"),
      function_area: str(formData, "function_area"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "member_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/career");
  return { ok: true };
}

/** Send a structured request to a resource. */
export async function sendRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const resourceId = str(formData, "resource_id");
  if (!resourceId) return { ok: false, error: "Missing resource." };
  if (resourceId === me.member_id) {
    return { ok: false, error: "You can't send a request to yourself." };
  }

  const kind = str(formData, "ask_kind") ?? "Advice";
  const details = str(formData, "details");
  const ask = details ? `${kind} — ${details}` : kind;

  const supabase = await createClient();
  const { error } = await supabase.from("career_requests").insert({
    request_id: `CR-${crypto.randomUUID()}`,
    requester_id: me.member_id,
    resource_id: resourceId,
    ask,
    // status defaults to 'pending'; not settable on insert (RLS column grant)
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/career/requests");
  return { ok: true };
}

/** Resource responds to a request: accept / decline / redirect. */
export async function respondToRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const requestId = str(formData, "request_id");
  const status = str(formData, "status");
  if (!requestId || !status) return { ok: false, error: "Missing fields." };
  if (!["accepted", "declined", "redirected"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  const redirectNote = status === "redirected" ? str(formData, "redirect_note") : null;
  if (status === "redirected" && !redirectNote) {
    return { ok: false, error: "Add a note pointing them to someone." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("career_requests")
    .update({ status, redirect_note: redirectNote })
    .eq("request_id", requestId)
    .eq("resource_id", me.member_id) // only the resource may respond
    .eq("status", "pending") // and only if it hasn't already been answered
    .select("request_id");

  if (error) return { ok: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { ok: false, error: "This request was already responded to." };
  }

  revalidatePath("/career/requests");
  return { ok: true };
}

/** Requester adds the optional "this led to X" outcome note. */
export async function addOutcome(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const requestId = str(formData, "request_id");
  const outcome = str(formData, "outcome_note");
  if (!requestId) return { ok: false, error: "Missing request." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("career_requests")
    .update({ outcome_note: outcome })
    .eq("request_id", requestId)
    .eq("requester_id", me.member_id); // only the requester tracks outcome

  if (error) return { ok: false, error: error.message };

  revalidatePath("/career/requests");
  return { ok: true };
}

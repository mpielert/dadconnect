"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { str, type ActionState } from "@/lib/form";

const SITE_URL = "https://cmudadconnect.com";
const INVITE_DAYS = 30;

/**
 * Invite someone: create their auth account (so magic-link sign-in works —
 * the app runs with shouldCreateUser:false), record the invite, and email them.
 * They set up their own profile on first sign-in via /onboarding.
 */
export async function inviteMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Not authorized." };

  const email = str(formData, "email")?.toLowerCase();
  const name = str(formData, "invited_name");
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const supabase = createAdminClient();

  // Does an account already exist for this email?
  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const already = existing?.users?.find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );

  let authUserId = already?.id ?? null;

  if (!authUserId) {
    const { data: created, error: createErr } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // no separate confirmation step; magic link is the auth
      });
    if (createErr) return { ok: false, error: createErr.message };
    authUserId = created.user?.id ?? null;
  }

  const expiresAt = new Date(
    Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: inviteErr } = await supabase.from("invites").insert({
    email,
    invited_name: name,
    created_by: me.member_id,
    expires_at: expiresAt,
  });
  if (inviteErr) return { ok: false, error: inviteErr.message };

  // Send the invitation. Not fatal if it fails — the account still works and
  // the admin can resend.
  const resendKey = process.env.RESEND_API_KEY;
  let emailed = true;
  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CMUDadConnect <login@cmudadconnect.com>",
        to: [email],
        subject: `${me.name} invited you to CMUDadConnect`,
        text:
          `${name ? `Hi ${name},\n\n` : "Hi,\n\n"}` +
          `${me.name} has invited you to CMUDadConnect — a private site for our group.\n\n` +
          `To get in:\n` +
          `1. Go to ${SITE_URL}\n` +
          `2. Click "Sign in" and enter this email address (${email})\n` +
          `3. We'll email you a one-time sign-in link — click it and you're in\n\n` +
          `There's no password to create. Once you're in, you can set up your ` +
          `profile and choose exactly what the group can see.\n\n` +
          `See you there.`,
      }),
    });
    emailed = res.ok;
  } else {
    emailed = false;
  }

  revalidatePath("/admin");
  return {
    ok: true,
    error: emailed
      ? undefined
      : "Account created, but the invitation email could not be sent — send them the link yourself.",
  };
}

/** Revoke an invite record (does not delete the account). */
export async function revokeInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Not authorized." };

  const code = str(formData, "code");
  if (!code) return { ok: false, error: "Missing invite." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("code", code);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

/** Re-send the sign-in instructions for an outstanding invite. */
export async function resendInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Not authorized." };

  const email = str(formData, "email");
  if (!email) return { ok: false, error: "Missing email." };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { ok: false, error: "Email isn't configured." };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "CMUDadConnect <login@cmudadconnect.com>",
      to: [email],
      subject: `Reminder: your CMUDadConnect invitation`,
      text:
        `Hi,\n\n` +
        `A reminder that you've been invited to CMUDadConnect.\n\n` +
        `Go to ${SITE_URL}, click "Sign in", and enter this email address ` +
        `(${email}). We'll send you a one-time sign-in link.\n\n` +
        `See you there.`,
    }),
  });

  if (!res.ok) return { ok: false, error: "Could not send the email." };

  revalidatePath("/admin");
  return { ok: true };
}

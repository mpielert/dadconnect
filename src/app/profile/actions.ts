"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentMember } from "@/lib/members";
import { bool, intOrNull, str, type ActionState } from "@/lib/form";

/** Update the signed-in member's own profile + sharing toggles. */
export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({
      name,
      generation: str(formData, "generation"),
      class_year: intOrNull(formData, "class_year"),
      city: str(formData, "city"),
      role_or_school: str(formData, "role_or_school"),
      bio: str(formData, "bio"),
      contact_preference: str(formData, "contact_preference") ?? "in_app",
      share_city: bool(formData, "share_city"),
      share_role: bool(formData, "share_role"),
      share_bio: bool(formData, "share_bio"),
      share_contact: bool(formData, "share_contact"),
    })
    .eq("member_id", me.member_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/directory");
  revalidatePath(`/directory/${me.member_id}`);
  return { ok: true };
}

/** Guardian creates a minor record (name + age only). */
export async function createMinor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const name = str(formData, "name");
  const age = intOrNull(formData, "age");
  if (!name) return { ok: false, error: "Name is required." };
  if (age === null || age < 0 || age > 17) {
    return { ok: false, error: "Age must be between 0 and 17." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    name,
    age,
    is_minor: true,
    guardian_managed: true,
    profile_owner_id: me.member_id,
    // member_id auto-generated; auth_user_id and all other fields stay null
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true };
}

/** Guardian edits a minor they own. */
export async function updateMinor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const memberId = str(formData, "member_id");
  const name = str(formData, "name");
  const age = intOrNull(formData, "age");
  if (!memberId) return { ok: false, error: "Missing record id." };
  if (!name) return { ok: false, error: "Name is required." };
  if (age === null || age < 0 || age > 17) {
    return { ok: false, error: "Age must be between 0 and 17." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ name, age })
    .eq("member_id", memberId)
    .eq("profile_owner_id", me.member_id); // RLS also enforces this

  if (error) return { ok: false, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/directory");
  return { ok: true };
}

/**
 * Leave the community (soft leave). Scrubs the caller's personal details into a
 * "Former member" shell (member_id is permanent, so others' threads/history stay
 * intact), removes their active presence (career resource, hosting status) and
 * any minors they manage, then revokes their login. Strictly self-scoped; uses
 * the service role only after confirming the caller is who they say they are.
 */
export async function leaveCommunity(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");
  if (str(formData, "confirm") !== "LEAVE") {
    return { ok: false, error: "Type LEAVE to confirm." };
  }

  const admin = createAdminClient();

  // Don't let the last admin lock everyone out of the admin panel.
  if (me.is_admin) {
    const { count } = await admin
      .from("members")
      .select("member_id", { count: "exact", head: true })
      .eq("is_admin", true)
      .is("departed_at", null);
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error:
          "You're the only admin — make someone else an admin before leaving.",
      };
    }
  }

  // Remove active presence and any minors they manage (cascades those minors'
  // hosting_status / career_resources).
  await admin.from("career_resources").delete().eq("member_id", me.member_id);
  await admin.from("hosting_status").delete().eq("member_id", me.member_id);
  await admin
    .from("members")
    .delete()
    .eq("profile_owner_id", me.member_id)
    .eq("is_minor", true);

  // Scrub personal fields into a shell and mark departed.
  await admin
    .from("members")
    .update({
      name: "Former member",
      city: null,
      role_or_school: null,
      bio: null,
      contact_preference: "none",
      share_city: false,
      share_role: false,
      share_bio: false,
      share_contact: false,
      generation: null,
      class_year: null,
      departed_at: new Date().toISOString(),
    })
    .eq("member_id", me.member_id);

  // Revoke access: delete the auth account (FK on delete set null clears the
  // shell's auth_user_id). They can be re-invited later as a fresh account.
  if (me.auth_user_id) {
    await admin.auth.admin.deleteUser(me.auth_user_id);
  }

  // End the current session and send them to the sign-in page.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?left=1");
}

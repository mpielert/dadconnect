"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

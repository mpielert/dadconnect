"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { bool, intOrNull, str, type ActionState } from "@/lib/form";

/** First-login: create the signed-in user's own adult profile. */
export async function createOwnProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already onboarded? Don't create a second row.
  const existing = await getCurrentMember();
  if (existing) redirect("/directory");

  const name = str(formData, "name");
  if (!name) return { ok: false, error: "Name is required." };

  const rel = str(formData, "cmu_relationship");
  const isOf = rel === "spouse" || rel === "child";

  const { error } = await supabase.from("members").insert({
    auth_user_id: user.id,
    name,
    is_minor: false,
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
    cmu_relationship: rel,
    cmu_relationship_term: isOf ? str(formData, "cmu_relationship_term") : null,
    cmu_anchor_name: isOf ? str(formData, "cmu_anchor_name") : null,
  });

  if (error) return { ok: false, error: error.message };

  redirect("/directory");
}

import { createClient } from "@/lib/supabase/server";
import type { DirectoryMember, Member } from "./types";

/** member_id → masked directory row (name, city, etc.), through the RLS view. */
export async function getDirectoryMap(): Promise<Map<string, DirectoryMember>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_directory")
    .select(
      "member_id,name,is_minor,age,generation,class_year,city,role_or_school,bio,contact_preference,guardian_managed,profile_owner_id,cmu_relationship,cmu_relationship_term,cmu_anchor_name,departed",
    );
  const map = new Map<string, DirectoryMember>();
  for (const row of (data as DirectoryMember[] | null) ?? []) {
    map.set(row.member_id, row);
  }
  return map;
}

/**
 * member_id → display name, resolved through the RLS directory view. Used by
 * features (career, crash pads, travel) that reference members by id.
 */
export async function getMemberNames(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_directory")
    .select("member_id,name");
  const map = new Map<string, string>();
  for (const row of (data as { member_id: string; name: string }[] | null) ??
    []) {
    map.set(row.member_id, row.name);
  }
  return map;
}

/**
 * The signed-in member's own full row, or null if they're authenticated but
 * haven't completed onboarding yet (no `members` row). RLS lets a member read
 * their own row from the base table.
 */
export async function getCurrentMember(): Promise<Member | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data as Member | null) ?? null;
}

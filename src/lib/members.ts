import { createClient } from "@/lib/supabase/server";
import type { Member } from "./types";

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

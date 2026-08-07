import { getCurrentMember } from "@/lib/members";
import type { Member } from "@/lib/types";

/**
 * The signed-in member, but only if they're an admin. Every admin surface and
 * server action must go through this before touching the service-role client —
 * that client bypasses RLS entirely, so this check is the only gate.
 */
export async function requireAdmin(): Promise<Member | null> {
  const me = await getCurrentMember();
  if (!me || !me.is_admin) return null;
  return me;
}

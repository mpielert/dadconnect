import { createClient } from "@supabase/supabase-js";

/**
 * Admin (service-role) Supabase client. BYPASSES Row Level Security.
 *
 * Use ONLY in trusted server-side code for operations that legitimately need
 * to sidestep RLS — e.g. validating/consuming an invite before an account
 * exists, or admin tooling. Never import this into a Client Component and
 * never expose the service role key to the browser (Handoff §2, §7).
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

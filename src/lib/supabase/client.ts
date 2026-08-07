"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses the public anon key and is subject to
 * Row Level Security — it can only ever see/write what the signed-in member's
 * RLS policies allow (Handoff §2-3).
 *
 * `experimental.passkey` enables signInWithPasskey()/registerPasskey() (Face ID
 * / Touch ID via the platform password manager). Magic link remains the
 * fallback and the way new members get in the first time.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        experimental: { passkey: true },
      },
    } as Parameters<typeof createBrowserClient>[2],
  );
}

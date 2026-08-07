"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Enroll a passkey (Face ID / Touch ID via the platform password manager) for
 * the signed-in member. Magic-link email stays available as the fallback and
 * as the way in on a device with no passkey.
 */
export function PasskeySetup() {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof window.PublicKeyCredential !== "undefined",
    );
  }, []);

  async function enroll() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.registerPasskey();

    if (err) {
      setError(
        err.name === "NotAllowedError"
          ? "Cancelled — no passkey was saved."
          : err.message,
      );
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
  }

  if (!supported) return null;

  return (
    <div className="rounded-xl border border-thread/40 bg-paper-raised p-5">
      <h3 className="font-display text-lg font-semibold text-ink">
        Faster sign-in
      </h3>
      <p className="mt-1 text-sm text-ink-soft">
        Save a passkey to sign in with Face ID, Touch ID, or your password
        manager instead of waiting for an email link. You can still use email
        any time.
      </p>

      {done ? (
        <p className="mt-3 text-sm text-thread">
          Passkey saved ✓ — use “Sign in with Face ID” next time.
        </p>
      ) : (
        <button
          onClick={enroll}
          disabled={busy}
          className="mt-3 rounded-lg border border-cardinal/60 px-4 py-2 text-sm font-medium text-cardinal transition hover:bg-cardinal hover:text-paper disabled:opacity-50"
        >
          {busy ? "Waiting…" : "Turn on Face ID sign-in"}
        </button>
      )}

      {error && <p className="mt-2 text-sm text-cardinal">{error}</p>}
    </div>
  );
}

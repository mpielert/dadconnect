"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link sign in (Handoff §2 — no passwords, no public signup).
 *
 * Note: signing in only works for accounts an admin has already provisioned
 * via an invite. Supabase's "Allow new users to sign up" setting must be
 * turned OFF in the dashboard so this cannot mint accounts for arbitrary
 * emails — see README "Auth configuration".
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  async function handlePasskey() {
    setPasskeyBusy(true);
    setMessage("");
    setStatus("idle");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPasskey();

    if (error) {
      // Most common case: no passkey saved on this device yet — email is the
      // way in, and enrolling happens after sign-in.
      setStatus("error");
      setMessage(
        error.message?.toLowerCase().includes("not allowed") ||
          error.name === "NotAllowedError"
          ? "No passkey found on this device. Sign in with your email below — you can turn on Face ID afterwards."
          : error.message,
      );
      setPasskeyBusy(false);
      return;
    }

    router.push("/directory");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Do NOT create an account if the email isn't already a member.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your email for a sign-in link.");
    }
  }

  return (
    <main className="thread-bg flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-thread/40 bg-paper-raised px-8 py-10 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
          CMUDadConnect
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Use Face ID if you&apos;ve set it up, or we&apos;ll email you a
          one-time sign-in link.
        </p>

        <button
          type="button"
          onClick={handlePasskey}
          disabled={passkeyBusy}
          className="mt-6 w-full rounded-lg border border-cardinal/60 px-4 py-3 font-medium text-cardinal transition hover:bg-cardinal hover:text-paper disabled:opacity-50"
        >
          {passkeyBusy ? "Waiting…" : "Sign in with Face ID / passkey"}
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-thread/40" />
          <span className="font-mono text-[10px] uppercase tracking-wider text-thread">
            or
          </span>
          <span className="h-px flex-1 bg-thread/40" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-thread/50 bg-paper px-4 py-3 text-ink outline-none focus:border-cardinal"
          />
          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            className="w-full rounded-lg bg-cardinal px-4 py-3 font-medium text-paper transition hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm ${
              status === "error" ? "text-cardinal" : "text-ink-soft"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}

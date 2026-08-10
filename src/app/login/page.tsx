"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  // A failed sign-in link lands here as ?error=auth. Explain it, rather than
  // showing a blank sign-in page that looks like nothing happened.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setStatus("error");
      setMessage(
        "That sign-in link didn't work — links are one-time and must be opened in the same browser you requested them from (not your email app's built-in browser). Enter your email below for a fresh link, then open it in this browser. Tip: press and hold the link and choose Copy, then paste it into this tab.",
      );
    }
  }, []);

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
          ? "No passkey found on this device. Use the email option above — you can turn on Face ID from your profile once you're in."
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
          We&apos;ll email you a one-time sign-in link — no password needed.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

        <div className="mt-6 border-t border-thread/30 pt-4 text-center">
          <button
            type="button"
            onClick={handlePasskey}
            disabled={passkeyBusy}
            className="text-sm text-ink-soft underline underline-offset-2 transition hover:text-cardinal disabled:opacity-50"
          >
            {passkeyBusy
              ? "Waiting for Face ID…"
              : "Used Face ID here before? Sign in with your passkey"}
          </button>
        </div>
      </div>
    </main>
  );
}

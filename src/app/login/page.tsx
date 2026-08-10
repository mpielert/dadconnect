"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign in with an emailed numeric code (Handoff §2 — no passwords, no public
 * signup). A code you type in is immune to the two ways magic links fail for a
 * non-technical group: the email app opening the link in a different browser,
 * and email security scanners consuming the one-time link. The email also still
 * contains a link (works when opened in the same browser), and Face ID/passkey
 * is offered for members who've enrolled.
 *
 * Signing in only works for accounts an admin has already provisioned; Supabase
 * "Allow new users to sign up" must stay OFF.
 */
export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "verifying" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "auth") {
      setStatus("error");
      setMessage(
        "That sign-in link didn't work — links are one-time and must open in the same browser you started in. Enter your email below and we'll send a code you can type in instead.",
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
      setStatus("error");
      setMessage(
        error.message?.toLowerCase().includes("not allowed") ||
          error.name === "NotAllowedError"
          ? "No passkey found on this device. Use your email below — you can turn on Face ID from your profile once you're in."
          : error.message,
      );
      setPasskeyBusy(false);
      return;
    }
    router.push("/directory");
    router.refresh();
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("idle");
    setStep("code");
    setMessage(`We emailed a code to ${email}. Enter it below.`);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("verifying");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setStatus("error");
      setMessage("That code didn't work — double-check it, or request a new one.");
      return;
    }
    router.push("/directory");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-lg border border-thread/50 bg-paper px-4 py-3 text-ink outline-none focus:border-cardinal";
  const primaryBtn =
    "w-full rounded-lg bg-cardinal px-4 py-3 font-medium text-paper transition hover:opacity-90 disabled:opacity-50";

  return (
    <main className="thread-bg flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-thread/40 bg-paper-raised px-8 py-10 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">
          CMUDadConnect
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold text-ink">
          Sign in
        </h1>

        {step === "email" ? (
          <>
            <p className="mt-2 text-sm text-ink-soft">
              We&apos;ll email you a 6-digit code — no password needed.
            </p>
            <form onSubmit={sendCode} className="mt-6 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className={primaryBtn}
              >
                {status === "sending" ? "Sending…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-soft">
              Enter the code we emailed you. (The email also has a sign-in link,
              if you prefer.)
            </p>
            <form onSubmit={verifyCode} className="mt-6 space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={8}
                required
                autoFocus
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
                }
                placeholder="Code from email"
                className={`${inputCls} text-center text-2xl tracking-[0.3em]`}
              />
              <button
                type="submit"
                disabled={status === "verifying" || code.length < 6}
                className={primaryBtn}
              >
                {status === "verifying" ? "Verifying…" : "Verify & sign in"}
              </button>
            </form>
            <div className="mt-4 flex justify-between text-xs text-ink-soft">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setStatus("idle");
                  setMessage("");
                }}
                className="underline transition hover:text-cardinal"
              >
                ← Use a different email
              </button>
              <button
                type="button"
                onClick={sendCode}
                className="underline transition hover:text-cardinal"
              >
                Resend code
              </button>
            </div>
          </>
        )}

        {message && (
          <p
            className={`mt-4 text-sm ${
              status === "error" ? "text-cardinal" : "text-ink-soft"
            }`}
          >
            {message}
          </p>
        )}

        {step === "email" && (
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
        )}
      </div>
    </main>
  );
}

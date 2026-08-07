import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Already has a profile → straight to the directory.
  const me = await getCurrentMember();
  if (me) redirect("/directory");

  return (
    <main className="thread-bg min-h-screen px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-brass">
          DadConnect
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          Welcome — set up your profile
        </h1>
        <p className="mt-2 text-ink-soft">
          This is what the group will see. Everything except your name is
          optional, and you decide what&apos;s shared.
        </p>

        <div className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}

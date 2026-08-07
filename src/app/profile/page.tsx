import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfileEditor } from "./ProfileEditor";
import { MinorsManager } from "./MinorsManager";
import { PasskeySetup } from "./PasskeySetup";
import type { Member } from "@/lib/types";

export default async function ProfilePage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("profile_owner_id", me.member_id)
    .eq("is_minor", true)
    .order("name");
  const minors = (data as Member[] | null) ?? [];

  return (
    <>
      <SiteHeader memberName={me.name} active="profile" />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          My profile
        </h1>
        <p className="mt-1 text-ink-soft">
          Edit your details and choose exactly what the group can see.
        </p>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <ProfileEditor member={me} />
        </section>

        <section className="mt-8">
          <PasskeySetup />
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Minors you manage
          </h2>
          <p className="mt-1 text-ink-soft">
            Children&apos;s records are managed here — they never have their own
            login.
          </p>
          <div className="mt-4">
            <MinorsManager minors={minors} />
          </div>
        </section>
      </main>
    </>
  );
}

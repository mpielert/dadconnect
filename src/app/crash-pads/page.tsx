import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getDirectoryMap } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { HostingStatusEditor } from "./HostingStatusEditor";
import { HostBrowser } from "./HostBrowser";
import type { HostingStatus, HostStatus } from "@/lib/types";

export type HostListing = {
  member_id: string;
  name: string;
  city: string | null;
  status: HostStatus;
  constraints: string | null;
  isSelf: boolean;
};

export default async function CrashPadsPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const unread = await getUnreadCount();

  const supabase = await createClient();
  const [{ data: mine }, { data: openHosts }, dir] = await Promise.all([
    supabase
      .from("hosting_status")
      .select("*")
      .eq("member_id", me.member_id)
      .maybeSingle(),
    supabase
      .from("hosting_status")
      .select("*")
      .in("status", ["yes", "maybe"])
      .order("updated_at", { ascending: false }),
    getDirectoryMap(),
  ]);

  const myStatus = (mine as HostingStatus | null) ?? null;

  // Include your own listing so you can confirm the group sees your offer —
  // pinned to the top and marked "You" (no request button for yourself).
  const hosts: HostListing[] = ((openHosts as HostingStatus[] | null) ?? [])
    .map((h) => ({
      member_id: h.member_id,
      name: dir.get(h.member_id)?.name ?? h.member_id,
      city: dir.get(h.member_id)?.city ?? null,
      status: h.status,
      constraints: h.constraints,
      isSelf: h.member_id === me.member_id,
    }))
    .sort((a, b) => Number(b.isSelf) - Number(a.isSelf));

  return (
    <>
      <SiteHeader memberName={me.name} active="crash-pads" unread={unread} isAdmin={me.is_admin} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">
              Crash Pads
            </h1>
            <p className="mt-1 text-ink-soft">
              Offer a place to stay, or find someone who has.
            </p>
          </div>
          <Link
            href="/crash-pads/requests"
            className="shrink-0 rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft transition hover:border-brass hover:text-ink"
          >
            My requests →
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Your hosting status
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Your city comes from your profile — set it to{" "}
            <Link href="/profile" className="text-cardinal underline">
              shared
            </Link>{" "}
            so travelers can find you here. Exact addresses are never stored;
            you share those directly if you accept.
          </p>
          <div className="mt-4">
            <HostingStatusEditor status={myStatus} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Find a host
          </h2>
          <p className="mt-1 text-ink-soft">
            {hosts.length} member{hosts.length === 1 ? "" : "s"} open to hosting.
          </p>
          <div className="mt-4">
            <HostBrowser hosts={hosts} />
          </div>
        </section>
      </main>
    </>
  );
}

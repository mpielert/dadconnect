import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";
import { SiteHeader } from "@/components/SiteHeader";
import { ResourceEditor } from "./ResourceEditor";
import { ResourceBrowser } from "./ResourceBrowser";
import type { CareerResource } from "@/lib/types";

export type ResourceWithName = CareerResource & { name: string };

export default async function CareerPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();

  const [{ data: mine }, { data: all }, names] = await Promise.all([
    supabase
      .from("career_resources")
      .select("*")
      .eq("member_id", me.member_id)
      .maybeSingle(),
    supabase
      .from("career_resources")
      .select("*")
      .eq("opted_in", true)
      .order("updated_at", { ascending: false }),
    getMemberNames(),
  ]);

  const myResource = (mine as CareerResource | null) ?? null;

  const resources: ResourceWithName[] = ((all as CareerResource[] | null) ?? [])
    .filter((r) => r.member_id !== me.member_id) // don't list yourself
    .map((r) => ({ ...r, name: names.get(r.member_id) ?? r.member_id }));

  return (
    <>
      <SiteHeader memberName={me.name} active="career" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">
              Career Networking
            </h1>
            <p className="mt-1 text-ink-soft">
              Offer to help, or reach out to someone who has.
            </p>
          </div>
          <Link
            href="/career/requests"
            className="shrink-0 rounded-lg border border-thread/50 px-4 py-2 text-sm text-ink-soft transition hover:border-brass hover:text-ink"
          >
            My requests →
          </Link>
        </div>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            You as a resource
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Opt in to let others reach out to you for advice, intros, or mock
            interviews. Your name comes from the roster — this just adds your
            industry, company/school, and function.
          </p>
          <div className="mt-4">
            <ResourceEditor resource={myResource} />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold text-ink">
            Find a resource
          </h2>
          <p className="mt-1 text-ink-soft">
            {resources.length} member{resources.length === 1 ? "" : "s"} open to
            helping.
          </p>
          <div className="mt-4">
            <ResourceBrowser resources={resources} />
          </div>
        </section>
      </main>
    </>
  );
}

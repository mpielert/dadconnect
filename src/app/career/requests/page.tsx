import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";
import { SiteHeader } from "@/components/SiteHeader";
import { Pill } from "@/components/Pill";
import {
  CAREER_STATUS_LABEL,
  CAREER_STATUS_TONE,
  type CareerRequest,
} from "@/lib/types";
import { RequestActions } from "./RequestActions";
import { AddOutcome } from "./AddOutcome";

export default async function CareerRequestsPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data }, names] = await Promise.all([
    supabase
      .from("career_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    getMemberNames(),
  ]);

  const all = (data as CareerRequest[] | null) ?? [];
  const incoming = all.filter((r) => r.resource_id === me.member_id);
  const outgoing = all.filter((r) => r.requester_id === me.member_id);
  const nameOf = (id: string) => names.get(id) ?? id;

  return (
    <>
      <SiteHeader memberName={me.name} active="career" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/career"
          className="font-mono text-xs text-thread transition hover:text-cardinal"
        >
          ← Career
        </Link>
        <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
          My requests
        </h1>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            Asked of me{" "}
            <span className="font-mono text-sm text-thread">
              ({incoming.length})
            </span>
          </h2>
          {incoming.length === 0 ? (
            <p className="mt-2 text-ink-soft">No one has reached out yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {incoming.map((r) => (
                <li
                  key={r.request_id}
                  className="rounded-xl border border-thread/40 bg-paper-raised p-5"
                >
                  <RequestHeader
                    who={`From ${nameOf(r.requester_id)}`}
                    ask={r.ask}
                    status={r.status}
                  />
                  {r.status === "pending" ? (
                    <div className="mt-4 border-t border-thread/30 pt-4">
                      <RequestActions requestId={r.request_id} />
                    </div>
                  ) : (
                    r.redirect_note && (
                      <NoteLine label="Your redirect note" text={r.redirect_note} />
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Sent by me{" "}
            <span className="font-mono text-sm text-thread">
              ({outgoing.length})
            </span>
          </h2>
          {outgoing.length === 0 ? (
            <p className="mt-2 text-ink-soft">
              You haven&apos;t sent any requests.{" "}
              <Link href="/career" className="text-cardinal underline">
                Find a resource
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {outgoing.map((r) => (
                <li
                  key={r.request_id}
                  className="rounded-xl border border-thread/40 bg-paper-raised p-5"
                >
                  <RequestHeader
                    who={`To ${nameOf(r.resource_id)}`}
                    ask={r.ask}
                    status={r.status}
                  />
                  {r.redirect_note && (
                    <NoteLine label="Redirect" text={r.redirect_note} />
                  )}
                  {r.status === "accepted" && (
                    <div className="mt-4 border-t border-thread/30 pt-4">
                      <AddOutcome
                        requestId={r.request_id}
                        current={r.outcome_note}
                      />
                    </div>
                  )}
                  {r.status !== "accepted" && r.outcome_note && (
                    <NoteLine label="Outcome" text={r.outcome_note} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

function RequestHeader({
  who,
  ask,
  status,
}: {
  who: string;
  ask: string;
  status: CareerRequest["status"];
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-thread">
          {who}
        </p>
        <p className="mt-1 text-ink">{ask}</p>
      </div>
      <Pill tone={CAREER_STATUS_TONE[status]}>
        {CAREER_STATUS_LABEL[status]}
      </Pill>
    </div>
  );
}

function NoteLine({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-3 text-sm text-ink-soft">
      <span className="font-mono text-[11px] uppercase tracking-wider text-thread">
        {label}:
      </span>{" "}
      {text}
    </p>
  );
}

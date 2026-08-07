import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getMemberNames } from "@/lib/members";
import { SiteHeader } from "@/components/SiteHeader";
import { Pill } from "@/components/Pill";
import { MessageButton } from "@/components/MessageButton";
import { getUnreadCount } from "@/lib/messaging";
import {
  HOSTING_REQ_STATUS_LABEL,
  HOSTING_REQ_STATUS_TONE,
  type HostingRequest,
} from "@/lib/types";
import { RequestActions } from "./RequestActions";

function dateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates flexible";
  if (start && end) return `${start} → ${end}`;
  return start ?? end ?? "";
}

export default async function HostingRequestsPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data }, names, unread] = await Promise.all([
    supabase
      .from("hosting_requests")
      .select("*")
      .order("created_at", { ascending: false }),
    getMemberNames(),
    getUnreadCount(),
  ]);

  const all = (data as HostingRequest[] | null) ?? [];
  const incoming = all.filter((r) => r.host_id === me.member_id);
  const outgoing = all.filter((r) => r.traveler_id === me.member_id);
  const nameOf = (id: string) => names.get(id) ?? id;

  return (
    <>
      <SiteHeader memberName={me.name} active="crash-pads" unread={unread} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link
          href="/crash-pads"
          className="font-mono text-xs text-thread transition hover:text-cardinal"
        >
          ← Crash Pads
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
            <p className="mt-2 text-ink-soft">No hosting requests yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {incoming.map((r) => (
                <li
                  key={r.request_id}
                  className="rounded-xl border border-thread/40 bg-paper-raised p-5"
                >
                  <RequestBody
                    who={`From ${nameOf(r.traveler_id)}`}
                    req={r}
                    range={dateRange(r.start_date, r.end_date)}
                  />
                  {r.status === "pending" ? (
                    <div className="mt-4 border-t border-thread/30 pt-4">
                      <RequestActions requestId={r.request_id} />
                    </div>
                  ) : (
                    <>
                      {r.counter_note && (
                        <NoteLine label="Your counter" text={r.counter_note} />
                      )}
                      {(r.status === "accepted" || r.status === "countered") && (
                        <div className="mt-4 border-t border-thread/30 pt-4">
                          <p className="mb-2 text-sm text-ink-soft">
                            {r.status === "accepted"
                              ? "Message them to arrange the details — this is where you'd share your address."
                              : "Message them to work out an alternative."}
                          </p>
                          <MessageButton
                            otherId={r.traveler_id}
                            origin="crash_pad"
                            originId={r.request_id}
                            label={`Message ${nameOf(r.traveler_id)}`}
                          />
                        </div>
                      )}
                    </>
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
              <Link href="/crash-pads" className="text-cardinal underline">
                Find a host
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
                  <RequestBody
                    who={`To ${nameOf(r.host_id)}`}
                    req={r}
                    range={dateRange(r.start_date, r.end_date)}
                  />
                  {r.counter_note && (
                    <NoteLine label="Counter" text={r.counter_note} />
                  )}
                  {(r.status === "accepted" || r.status === "countered") && (
                    <div className="mt-4 border-t border-thread/30 pt-4">
                      <MessageButton
                        otherId={r.host_id}
                        origin="crash_pad"
                        originId={r.request_id}
                        label={`Message ${nameOf(r.host_id)}`}
                        variant="outline"
                      />
                    </div>
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

function RequestBody({
  who,
  req,
  range,
}: {
  who: string;
  req: HostingRequest;
  range: string;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-thread">
            {who}
          </p>
          <p className="mt-1 font-display text-lg text-ink">{req.city}</p>
        </div>
        <Pill tone={HOSTING_REQ_STATUS_TONE[req.status]}>
          {HOSTING_REQ_STATUS_LABEL[req.status]}
        </Pill>
      </div>
      <p className="mt-2 font-mono text-xs text-ink-soft">
        {range}
        {req.headcount ? ` · ${req.headcount} guest${req.headcount === 1 ? "" : "s"}` : ""}
      </p>
      {req.context && <p className="mt-2 text-sm text-ink">{req.context}</p>}
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

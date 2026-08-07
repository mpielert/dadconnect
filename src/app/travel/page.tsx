import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getDirectoryMap } from "@/lib/members";
import { SiteHeader } from "@/components/SiteHeader";
import { Pill } from "@/components/Pill";
import { NewPostForm } from "./NewPostForm";
import { ReplyForm } from "./ReplyForm";
import type { HostingStatus, TravelPost, TravelReply } from "@/lib/types";

const norm = (s: string) => s.trim().toLowerCase();

function dateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} → ${end}`;
  return start ?? end;
}

export default async function TravelPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: postData }, { data: replyData }, { data: hostData }, dir] =
    await Promise.all([
      supabase
        .from("travel_posts")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("travel_replies")
        .select("*")
        .order("created_at", { ascending: true }),
      supabase.from("hosting_status").select("*").in("status", ["yes", "maybe"]),
      getDirectoryMap(),
    ]);

  const posts = (postData as TravelPost[] | null) ?? [];
  const replies = (replyData as TravelReply[] | null) ?? [];
  const nameOf = (id: string) => dir.get(id)?.name ?? id;

  // Cross-link (presentation only): which destination cities have a host?
  const hostsByCity = new Map<string, string[]>();
  for (const h of (hostData as HostingStatus[] | null) ?? []) {
    const city = dir.get(h.member_id)?.city;
    if (!city) continue;
    const key = norm(city);
    hostsByCity.set(key, [...(hostsByCity.get(key) ?? []), nameOf(h.member_id)]);
  }

  const repliesByPost = new Map<string, TravelReply[]>();
  for (const r of replies) {
    repliesByPost.set(r.post_id, [...(repliesByPost.get(r.post_id) ?? []), r]);
  }

  return (
    <>
      <SiteHeader memberName={me.name} active="travel" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Travel Sharing
        </h1>
        <p className="mt-1 text-ink-soft">
          Trip notes and recommendations from the group.
        </p>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Share a trip
          </h2>
          <div className="mt-4">
            <NewPostForm />
          </div>
        </section>

        <section className="mt-10 space-y-5">
          {posts.length === 0 ? (
            <p className="text-ink-soft">
              No trips shared yet. Be the first above.
            </p>
          ) : (
            posts.map((post) => {
              const range = dateRange(post.start_date, post.end_date);
              const hosts = hostsByCity.get(norm(post.destination_city)) ?? [];
              const postReplies = repliesByPost.get(post.post_id) ?? [];

              return (
                <article
                  key={post.post_id}
                  className="rounded-2xl border border-thread/40 bg-paper-raised p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-ink">
                        {post.destination_city}
                      </h3>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-thread">
                        {nameOf(post.author_id)}
                        {range ? ` · ${range}` : ""}
                      </p>
                    </div>
                    {post.has_photos && <Pill tone="brass">Photos</Pill>}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-ink">
                    {post.highlights}
                  </p>

                  {hosts.length > 0 && (
                    <Link
                      href="/crash-pads"
                      className="mt-4 flex items-center gap-2 rounded-lg border border-brass/40 bg-brass/5 px-3 py-2 text-sm text-ink-soft transition hover:border-brass"
                    >
                      <span aria-hidden>🏠</span>
                      <span>
                        {hosts.join(", ")}{" "}
                        {hosts.length === 1 ? "is" : "are"} open to hosting in{" "}
                        {post.destination_city} — check Crash Pads.
                      </span>
                    </Link>
                  )}

                  <div className="mt-5 border-t border-thread/30 pt-4">
                    {postReplies.length > 0 && (
                      <ul className="space-y-3">
                        {postReplies.map((r) => (
                          <li key={r.reply_id} className="text-sm">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-thread">
                              {nameOf(r.author_id)}
                            </span>
                            <p className="mt-0.5 text-ink">{r.message}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                    <ReplyForm postId={post.post_id} />
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </>
  );
}

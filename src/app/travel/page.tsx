import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getDirectoryMap } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { Pill } from "@/components/Pill";
import { NewPostForm } from "./NewPostForm";
import { ReplyForm } from "./ReplyForm";
import { PhotoUploader } from "./PhotoUploader";
import type { HostingStatus, TravelPost, TravelReply } from "@/lib/types";

type PhotoRow = { photo_id: string; post_id: string; storage_path: string };

const norm = (s: string) => s.trim().toLowerCase();

function dateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end) return `${start} → ${end}`;
  return start ?? end;
}

export default async function TravelPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const unread = await getUnreadCount();

  const supabase = await createClient();
  const [
    { data: postData },
    { data: replyData },
    { data: hostData },
    { data: photoData },
    dir,
  ] = await Promise.all([
    supabase
      .from("travel_posts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("travel_replies")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("hosting_status").select("*").in("status", ["yes", "maybe"]),
    supabase
      .from("travel_photos")
      .select("photo_id,post_id,storage_path")
      .order("created_at", { ascending: true }),
    getDirectoryMap(),
  ]);

  // The bucket is private — mint short-lived signed URLs for rendering.
  const photos = (photoData as PhotoRow[] | null) ?? [];
  const photosByPost = new Map<string, { id: string; url: string }[]>();
  if (photos.length) {
    const { data: signed } = await supabase.storage
      .from("travel-photos")
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        60 * 60, // 1 hour
      );
    photos.forEach((p, i) => {
      const url = signed?.[i]?.signedUrl;
      if (!url) return;
      photosByPost.set(p.post_id, [
        ...(photosByPost.get(p.post_id) ?? []),
        { id: p.photo_id, url },
      ]);
    });
  }

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
      <SiteHeader memberName={me.name} active="travel" unread={unread} />
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
              const postPhotos = photosByPost.get(post.post_id) ?? [];
              const isAuthor = post.author_id === me.member_id;

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
                    {postPhotos.length > 0 && (
                      <Pill tone="brass">
                        {postPhotos.length} photo
                        {postPhotos.length === 1 ? "" : "s"}
                      </Pill>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-ink">
                    {post.highlights}
                  </p>

                  {postPhotos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {postPhotos.map((ph) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={ph.id}
                          src={ph.url}
                          alt={`From ${post.destination_city}`}
                          loading="lazy"
                          className="aspect-square w-full rounded-lg border border-thread/40 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {isAuthor && (
                    <PhotoUploader
                      postId={post.post_id}
                      memberId={me.member_id}
                      existingCount={postPhotos.length}
                    />
                  )}

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

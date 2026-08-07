import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { getCurrentMember } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { InviteForm } from "./InviteForm";
import { InviteActions } from "./InviteRow";
import type { Invite, Member } from "@/lib/types";

export default async function AdminPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  // Not an admin? This page simply doesn't exist for you.
  const admin = await requireAdmin();
  if (!admin) redirect("/directory");

  const unread = await getUnreadCount();

  // Service-role reads, gated behind the admin check above.
  const supabase = createAdminClient();
  const [{ data: inviteData }, { data: memberData }] = await Promise.all([
    supabase.from("invites").select("*").order("created_at", { ascending: false }),
    supabase.from("members").select("*").eq("is_minor", false),
  ]);

  const invites = (inviteData as Invite[] | null) ?? [];
  const members = (memberData as Member[] | null) ?? [];

  // An invite counts as accepted once a member row exists for that auth user.
  const claimedEmails = new Set<string>();
  const { data: users } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const onboardedAuthIds = new Set(
    members.map((m) => m.auth_user_id).filter(Boolean) as string[],
  );
  for (const u of users?.users ?? []) {
    if (u.email && onboardedAuthIds.has(u.id)) {
      claimedEmails.add(u.email.toLowerCase());
    }
  }

  const pending = invites.filter(
    (i) =>
      !i.revoked_at && !(i.email && claimedEmails.has(i.email.toLowerCase())),
  );

  return (
    <>
      <SiteHeader memberName={me.name} active="admin" unread={unread} isAdmin={me.is_admin} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">Admin</h1>
        <p className="mt-1 text-ink-soft">
          Invite people to the group. Only admins can see this page.
        </p>

        <section className="mt-6 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Invite someone
          </h2>
          <div className="mt-4">
            <InviteForm />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Invitations{" "}
            <span className="font-mono text-sm text-thread">
              ({pending.length} outstanding)
            </span>
          </h2>

          {invites.length === 0 ? (
            <p className="mt-2 text-ink-soft">No invitations sent yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {invites.map((i) => {
                const joined = !!(
                  i.email && claimedEmails.has(i.email.toLowerCase())
                );
                return (
                  <li
                    key={i.code}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-thread/40 bg-paper-raised px-5 py-3"
                  >
                    <div>
                      <p className="text-ink">
                        {i.invited_name ?? i.email ?? "—"}
                      </p>
                      {i.invited_name && i.email && (
                        <p className="font-mono text-[11px] text-thread">
                          {i.email}
                        </p>
                      )}
                    </div>
                    <InviteActions
                      code={i.code}
                      email={i.email}
                      joined={joined}
                      revoked={!!i.revoked_at}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-ink">
            Members{" "}
            <span className="font-mono text-sm text-thread">
              ({members.length})
            </span>
          </h2>
          <ul className="mt-4 space-y-2">
            {members.map((m) => (
              <li
                key={m.member_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-thread/40 bg-paper-raised px-5 py-3"
              >
                <span className="text-ink">{m.name}</span>
                <span className="font-mono text-[11px] text-thread">
                  {m.member_id}
                  {m.is_admin ? " · admin" : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

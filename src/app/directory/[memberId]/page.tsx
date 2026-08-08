import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { SiteHeader } from "@/components/SiteHeader";
import { Pill } from "@/components/Pill";
import { MessageButton } from "@/components/MessageButton";
import { getUnreadCount } from "@/lib/messaging";
import {
  cmuConnectionLabel,
  CONTACT_LABEL,
  GENERATION_LABEL,
  type ContactPreference,
  type DirectoryMember,
} from "@/lib/types";

const DIRECTORY_COLUMNS =
  "member_id,name,is_minor,age,generation,class_year,city,role_or_school,bio,contact_preference,guardian_managed,profile_owner_id,cmu_relationship,cmu_relationship_term,cmu_anchor_name,departed";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;

  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const supabase = await createClient();
  const { data } = await supabase
    .from("member_directory")
    .select(DIRECTORY_COLUMNS)
    .eq("member_id", memberId)
    .maybeSingle();

  const member = data as DirectoryMember | null;
  if (!member) notFound();

  const isSelf = member.member_id === me.member_id;
  const isMyWard =
    member.is_minor && member.profile_owner_id === me.member_id;
  const canEdit = isSelf || isMyWard;

  // Messaging is adults-only, and 'none' means "don't contact me" (spec §3);
  // departed members can't be contacted.
  const canMessage =
    !isSelf &&
    !member.is_minor &&
    !member.departed &&
    member.contact_preference !== "none";

  const unread = await getUnreadCount();

  return (
    <>
      <SiteHeader memberName={me.name} active="directory" unread={unread} isAdmin={me.is_admin} />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/directory"
          className="font-mono text-xs text-thread transition hover:text-cardinal"
        >
          ← Directory
        </Link>

        <div className="mt-4 rounded-2xl border border-thread/40 bg-paper-raised p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-semibold text-ink">
                {member.name}
              </h1>
              <p className="mt-1 font-mono text-xs text-thread">
                {member.member_id}
              </p>
              {!member.is_minor && cmuConnectionLabel(member) && (
                <p className="mt-2 text-sm text-ink-soft">
                  {cmuConnectionLabel(member)}
                </p>
              )}
              {member.departed && (
                <p className="mt-2 text-sm text-ink-soft">
                  This member has left the community.
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isSelf && <Pill tone="cardinal">You</Pill>}
              {member.is_minor ? (
                <Pill tone="thread">Minor</Pill>
              ) : (
                member.generation && (
                  <Pill tone="brass">
                    {GENERATION_LABEL[member.generation]}
                  </Pill>
                )
              )}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {member.is_minor ? (
              <Field label="Age" value={member.age?.toString()} />
            ) : (
              <>
                <Field label="City" value={member.city} />
                <Field label="Role / school" value={member.role_or_school} />
                <Field
                  label="Class year"
                  value={member.class_year?.toString()}
                />
                <Field
                  label="Contact"
                  value={
                    member.contact_preference
                      ? CONTACT_LABEL[
                          member.contact_preference as ContactPreference
                        ]
                      : null
                  }
                />
              </>
            )}
          </dl>

          {!member.is_minor && member.bio && (
            <div className="mt-6">
              <p className="font-mono text-[11px] uppercase tracking-wider text-thread">
                Bio
              </p>
              <p className="mt-1 whitespace-pre-line text-ink">{member.bio}</p>
            </div>
          )}

          {(canEdit || canMessage) && (
            <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-thread/30 pt-5">
              {canEdit && (
                <Link
                  href="/profile"
                  className="inline-block rounded-lg border border-cardinal/60 px-4 py-2 text-sm font-medium text-cardinal transition hover:bg-cardinal hover:text-paper"
                >
                  {isSelf ? "Edit my profile" : "Manage this record"}
                </Link>
              )}
              {canMessage && <MessageButton otherId={member.member_id} />}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-thread">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink">
        {value ? value : <span className="text-ink-soft/60">Not shared</span>}
      </dd>
    </div>
  );
}

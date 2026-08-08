import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/members";
import { getUnreadCount } from "@/lib/messaging";
import { SiteHeader } from "@/components/SiteHeader";
import { DirectoryBrowser } from "./DirectoryBrowser";
import type { DirectoryMember } from "@/lib/types";

const DIRECTORY_COLUMNS =
  "member_id,name,is_minor,age,generation,class_year,city,role_or_school,bio,contact_preference,guardian_managed,profile_owner_id,cmu_relationship,cmu_relationship_term,cmu_anchor_name,departed";

export default async function DirectoryPage() {
  const me = await getCurrentMember();
  if (!me) redirect("/onboarding");

  const unread = await getUnreadCount();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_directory")
    .select(DIRECTORY_COLUMNS)
    .order("name");

  // Departed members stay in the view (so their name resolves elsewhere) but
  // don't appear in the browse list.
  const members = ((data as DirectoryMember[] | null) ?? []).filter(
    (m) => !m.departed,
  );

  return (
    <>
      <SiteHeader memberName={me.name} active="directory" unread={unread} isAdmin={me.is_admin} />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Directory
        </h1>
        <p className="mt-1 text-ink-soft">
          Everyone in the group. Only fields members choose to share are shown.
        </p>

        {error ? (
          <p className="mt-6 rounded-lg border border-cardinal/40 bg-cardinal/5 px-4 py-3 text-sm text-cardinal">
            Could not load the directory: {error.message}
          </p>
        ) : (
          <div className="mt-6">
            <DirectoryBrowser members={members} currentMemberId={me.member_id} />
          </div>
        )}
      </main>
    </>
  );
}

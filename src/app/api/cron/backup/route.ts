import { NextResponse } from "next/server";
import { createAdminClient, listAllAuthUsers } from "@/lib/supabase/admin";

/**
 * Weekly off-site data backup (the Free plan has no database backups). Dumps
 * every public table + auth user identities to JSON and emails it to the
 * admin(s) via Resend — so a copy lives in an inbox, a different failure domain
 * from Supabase. Schema/RLS live in git, so this snapshot + the repo is a full
 * recovery picture.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (same as the digest). Scheduled by
 * pg_cron. Uses no dangerous "export everything" DB function — it reads each
 * table with the service role, so nothing new is exposed to members.
 */

export const dynamic = "force-dynamic";

// Keep in sync when adding a data table.
const TABLES = [
  "members",
  "invites",
  "hosting_status",
  "hosting_requests",
  "travel_posts",
  "travel_replies",
  "travel_photos",
  "career_resources",
  "career_requests",
  "conversations",
  "messages",
  "connections",
  "events",
  "event_rsvps",
  "event_invitees",
  "digest_log",
];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });
  }

  const supabase = createAdminClient();

  const tables: Record<string, unknown[]> = {};
  let totalRows = 0;
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) {
      return NextResponse.json({ error: `${t}: ${error.message}` }, { status: 500 });
    }
    tables[t] = data ?? [];
    totalRows += data?.length ?? 0;
  }

  const authUsers = await listAllAuthUsers(supabase);
  tables["auth_users"] = authUsers.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
  }));
  totalRows += authUsers.length;

  // Recipients: current admins' email addresses.
  const { data: adminRows } = await supabase
    .from("members")
    .select("auth_user_id")
    .eq("is_admin", true)
    .is("departed_at", null);
  const adminAuthIds = new Set(
    (adminRows as { auth_user_id: string | null }[] | null)?.map((a) => a.auth_user_id).filter(Boolean) ?? [],
  );
  const to = authUsers
    .filter((u) => adminAuthIds.has(u.id) && u.email)
    .map((u) => u.email as string);
  if (to.length === 0) {
    return NextResponse.json({ error: "no admin email to send to" }, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const json = JSON.stringify(
    { exported_at: new Date().toISOString(), rows: totalRows, tables },
    null,
    2,
  );
  const content = Buffer.from(json).toString("base64");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "CMUDadConnect <login@cmudadconnect.com>",
      to,
      subject: `CMUDadConnect backup — ${date} (${totalRows} rows)`,
      text:
        `Weekly data backup for CMUDadConnect (${date}).\n\n` +
        `${totalRows} rows across ${TABLES.length} tables + auth identities, attached as JSON.\n\n` +
        `Keep this somewhere safe — it contains member data. Combined with the ` +
        `code repo (which holds the schema), it's a full recovery picture.`,
      attachments: [{ filename: `cmudadconnect-backup-${date}.json`, content }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `email failed: ${await res.text()}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, rows: totalRows, sent_to: to.length });
}

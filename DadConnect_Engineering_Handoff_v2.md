# DadConnect — Engineering Handoff Plan
**Version:** 2
**For:** Claude Code (or any engineer picking this up)
**Purpose:** Take DadConnect from validated prototype to a real, running, privately-hosted app.
**Changed from v1:** Career Networking data schema now exists (see §0) — the "flag back" item for it is resolved. Minors' name+age visibility resolved as visible to the whole group, not guardian-only — the RLS note in §3 and the open item in §8 are updated accordingly.

---

## 0. What already exists — read these first
This plan assumes the following files from the DadConnect project are available as reference. Don't re-derive the product decisions in them — they're settled; this plan is about *implementing* them.

**Product specs:**
- `PRD_Member_Directory_v2.md`, `PRD_Career_Networking_v2.md`, `PRD_Crash_Pads_v2.md`, `PRD_Travel_Sharing_v2.md`
- `Rollout_Roadmap_v2.md` — build order is Directory → Career Networking → Crash Pads → Travel Sharing

**Data schemas (translate these into real tables — see §3):**
- `Member_Directory_Data_Schema_v2.md`, `Crash_Pads_Data_Schema_v2.md`, `Travel_Sharing_Data_Schema_v2.md`, `Career_Networking_Data_Schema_v1.md`

**Working prototypes (reference for interaction patterns and visual design — see §5):**
- `member-directory-prototype.html`, `crash-pads-prototype.html`, `travel-sharing-prototype.html`
- These are static mockups with fake data and a fake "log in as" dropdown. Do not carry over the fake-login pattern — see §2.

**Sample data (fictional, safe to use for seeding a dev database — never for production):**
- `member_roster_sample_v1.json`, `crash_pad_sample_v1.json`, `travel_post_sample_v1.json`

---

## 1. Stack
- **Framework:** Next.js (App Router), TypeScript
- **Backend/DB/Auth/Storage:** Supabase (Postgres + built-in auth + Row Level Security + file storage for the "a couple photos" feature later)
- **Styling:** Tailwind CSS, using the design tokens in §5 — don't default to generic Tailwind slate/blue, the prototypes already established a visual identity
- **Hosting:** Vercel (pairs cleanly with Next.js; free tier is enough for a group this size)

**Why this stack:** one person is maintaining this alongside a day job (or retirement!). Supabase collapses "build a database + build auth + build access control" into one managed service instead of three things to build and operate separately. This is a deliberate trade of some flexibility for a lot less ongoing maintenance burden.

**Accounts the human needs to create** (Claude Code can't do this step — it needs real credentials):
- Supabase project (free tier to start)
- Vercel account, connected to the GitHub repo
- A domain, if desired (can launch on the default `*.vercel.app` URL first and add a domain later — no need to block on this)

---

## 2. Build first: auth, before any feature
Every feature depends on this. Do not build Directory, Career, Crash Pads, or Travel Sharing against fake/mock identity — build real auth first, then build every feature against it from day one.

**Requirements:**
- **Invite-only.** No public signup form. An admin (the project owner) generates an invite link or code per person; account creation requires a valid, unused invite.
- **Adults only get accounts.** Minors (under 18) never sign up or log in — enforce this at signup (no account creation flow for anyone marking themselves as under 18) and structurally in the data model (see §3 — minors are rows a guardian manages, not auth users).
- **Guardian-managed minor records.** An adult's account can create/edit a linked minor record (name + age only — see schema). This is an app-level permission, not a separate auth identity.
- **Sessions via Supabase Auth** (magic link is the simplest UX for a group this size — no passwords to manage or forget).
- **Row Level Security (RLS) enforces the minors policy at the database level**, not just in the UI. A minor's row should have no columns for city/role/bio/contact to leak in the first place (matches the schema docs — the fields don't exist, so there's nothing for a policy to accidentally expose). Adult profile visibility fields (`shareCity`, `shareRole`, etc.) should also be enforced via RLS, not just hidden client-side.

**Do not ship any feature that reads or writes member data until this is in place and tested with at least two real accounts (an adult and a guardian-managed minor record).**

---

## 3. Database schema
Translate the three schema docs into Postgres tables. Rough shape (adjust types/constraints as needed once building — this is a starting point, not a final migration):

```sql
-- members (the roster — see Member_Directory_Data_Schema_v2.md)
create table members (
  member_id text primary key,
  auth_user_id uuid references auth.users(id), -- null for minors
  name text not null,
  is_minor boolean not null default false,
  age int, -- populated only when is_minor = true
  generation text check (generation in ('original','next_gen')),
  class_year int,
  city text, -- null for minors
  role_or_school text, -- null for minors
  bio text, -- null for minors
  contact_preference text check (contact_preference in ('in_app','email','phone','none')),
  share_city boolean, share_role boolean, share_bio boolean, share_contact boolean, -- null for minors
  guardian_managed boolean not null default false,
  profile_owner_id text references members(member_id), -- guardian's member_id, for minors
  created_at timestamptz default now()
);

-- crash pads — see Crash_Pads_Data_Schema_v2.md
create table hosting_status (
  member_id text primary key references members(member_id),
  status text check (status in ('yes','maybe','no')),
  constraints text,
  updated_at timestamptz default now()
);

create table hosting_requests (
  request_id text primary key,
  traveler_id text references members(member_id),
  host_id text references members(member_id),
  city text not null,
  start_date date, end_date date,
  headcount int,
  context text,
  status text check (status in ('pending','accepted','declined','countered')),
  counter_note text,
  created_at timestamptz default now()
);

-- travel sharing — see Travel_Sharing_Data_Schema_v2.md
create table travel_posts (
  post_id text primary key,
  author_id text references members(member_id),
  destination_city text not null,
  start_date date, end_date date,
  highlights text not null,
  has_photos boolean default false,
  created_at timestamptz default now()
);

create table travel_replies (
  reply_id text primary key,
  post_id text references travel_posts(post_id),
  author_id text references members(member_id),
  message text not null,
  created_at timestamptz default now()
);

-- career networking — see Career_Networking_Data_Schema_v1.md
create table career_resources (
  member_id text primary key references members(member_id),
  opted_in boolean default false,
  industry text, company_or_school text, function_area text,
  updated_at timestamptz default now()
);

create table career_requests (
  request_id text primary key,
  requester_id text references members(member_id),
  resource_id text references members(member_id),
  ask text not null, -- what they're looking for: advice / intro / mock interview
  status text check (status in ('pending','accepted','declined','redirected')),
  redirect_note text, -- only when status = 'redirected'
  outcome_note text, -- the optional "this led to X" light tracking
  created_at timestamptz default now()
);
```

**No address field exists anywhere in this schema**, on purpose — matches the Crash Pads PRD's privacy model. Address exchange happens through messaging (§6), never as a stored column.

**RLS policies needed at minimum:**
- A member can read their own full row, and can read other adult members' rows only for the fields those members have marked shareable.
- A minor's `name` and `age` are visible to the whole group (resolved product decision) — no restriction needed on those two columns beyond "must be an authenticated member." Everything else about a minor's row (edit access) is restricted to the guardian: only the account where `profile_owner_id` = their own `member_id` can write to it.
- Only the row's own `auth_user_id` (or, for minors, the guardian's `auth_user_id` via `profile_owner_id`) can write to it.

---

## 4. Build order
Matches `Rollout_Roadmap_v2.md`. Each phase should be a deployed, usable milestone — not all four built before anything ships.

1. **Foundation:** auth (§2) + database (§3) + Member Directory, replacing the prototype's mock data with real Supabase-backed reads/writes. Self-edit and guardian-edit flows from the prototype carry over, now persisting for real.
2. **Career Networking:** build against `Career_Networking_Data_Schema_v1.md` (now written — see §0).
3. **Crash Pads:** hosting status + request/accept/counter flow. The prototype's request lifecycle (pending → accepted/declined/countered) maps directly.
4. **Travel Sharing:** posts + replies + the crash-pad cross-link (computed at query time by joining `travel_posts.destination_city` against `hosting_status`/`members.city` — not a stored field, matching the schema doc).

---

## 5. Design system to carry over
The prototypes already established a visual identity — don't let the real build default to generic Tailwind styling. Carry these over:

**Colors:**
```
--ink:        #202A26
--ink-soft:   #4B5850
--paper:      #EAE3D3
--paper-raised: #F1ECDE
--cardinal:   #9C2B2F
--brass:      #AD8A4E
--thread:     #8C9A8F
```

**Fonts:** Fraunces (serif, headings/display), Inter (body), IBM Plex Mono (data — member IDs, dates, status labels, tags)

**Signature motifs from the prototypes worth preserving:** the crossing-hairline "thread" pattern in the header background and card corners, monospace ledger-style member IDs, status pills for hosting/request states. Read `frontend-design` skill guidance before implementing, and treat the three prototype HTML files as the visual reference — matching them isn't optional polish, it's the difference between this feeling like "our thing" versus a generic template to the people using it.

---

## 6. Explicitly deferred (not this build pass)
- **Real messaging.** The prototypes mock every "contact" and "message directly" action with a toast. Building actual in-app messaging (or an email-relay fallback) is its own scope — don't build it ad hoc inside the Directory or Crash Pads work. Worth a short spec of its own before starting.
- **Native iOS.** Ship a well-built responsive/installable web app first. Revisit native (or a wrapped build via something like Capacitor) once there's real usage to justify it — see the earlier discussion in this project about why building native too early is a common way small projects like this stall out.
- **Photo uploads.** `has_photos` is currently just a boolean flag. Real image storage (Supabase Storage) can come later without a schema change.
- **Payments, ratings/reviews, formal mentorship matching, job board** — all explicitly out of scope per the individual PRDs.

---

## 7. Privacy/security checklist before any real member data goes in
- [ ] No public signup route exists anywhere in the deployed app
- [ ] Minors cannot create accounts, full stop — verified by trying
- [ ] RLS policies tested with a second real account, not just assumed from the code
- [ ] No address field exists in the schema or anywhere in application code
- [ ] Environment variables (Supabase keys) are not committed to the repo
- [ ] Sample/fictional data is clearly separated from any real data — don't seed a shared dev database with real member PII

---

## 8. What to flag back rather than deciding silently
- Domain name and final hosting account setup require the project owner's own accounts/credit card — can't be automated end-to-end (see §9 for the immediate next step on this).

---

## 9. Reminder: accounts you need to create before Claude Code can build against a real backend
This can't be delegated — Claude Code needs real credentials, not just instructions. Before starting §1-2 of this plan:
- [ ] **Create a Supabase project** (free tier is fine to start) — this is where the real database, auth, and RLS policies from §2-3 will actually live.
- [ ] **Create a Vercel account** and connect it to the GitHub repo Claude Code will set up — this is what makes the app actually reachable at a URL instead of just running locally.

Both take a few minutes each. Nothing else in this plan can be built against a real backend until these exist.


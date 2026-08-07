# DadConnect

A private, invite-only web app for the DadConnect group — member directory
first, then career networking, crash pads, and travel sharing (build order per
`Rollout_Roadmap_v2.md`).

Stack (Handoff §1): **Next.js** (App Router, TypeScript) · **Supabase**
(Postgres + Auth + RLS + Storage) · **Tailwind CSS** with the design tokens from
`DadConnect_Engineering_Handoff_v2.md` §5 · deployed on **Vercel**.

> This repo currently contains the **foundation scaffold**: auth wiring, the
> database schema + RLS, and the design system. The four feature UIs are the
> next build passes (Handoff §4).

---

## Prerequisites

- **Node.js 18.18+** (20 LTS recommended) and npm — _not currently installed on
  this machine; install before the steps below (e.g. `nvm install --lts`)._
- A **Supabase** project (free tier) — Handoff §9.
- A **Vercel** account connected to this GitHub repo — Handoff §9.
- Optional: the **Supabase CLI** (`brew install supabase/tap/supabase`) to push
  migrations from the command line.

## 1. Install & configure

```bash
npm install
cp .env.example .env.local   # then paste your real values into .env.local
```

`.env.local` needs the three keys from **Supabase → Project Settings → API**:

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key | public (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **secret** — server only, bypasses RLS |

`.env.local` is gitignored and must never be committed (Handoff §7). The same
three values must also be set in **Vercel → Project → Settings → Environment
Variables** (Production, Preview, Development) for the deployed app.

## 2. Apply the database schema + RLS

The migrations live in `supabase/migrations/`:

- `20260807010000_schema.sql` — tables, minors constraints, the
  `member_directory` masking view, helper functions.
- `20260807010001_rls.sql` — Row Level Security policies.

**Option A — Supabase CLI** (once installed):

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B — no CLI:** open **Supabase → SQL Editor**, paste the contents of
`20260807010000_schema.sql`, run it, then do the same for
`20260807010001_rls.sql` (in order).

## 3. Auth configuration (do this in the Supabase dashboard)

Invite-only is enforced in code (no signup route; `shouldCreateUser: false`),
but also lock it down in the dashboard so nothing can mint accounts:

- **Authentication → Providers → Email:** enable **Email** with **magic link**.
- **Authentication → Sign-ups:** turn **"Allow new users to sign up" OFF.**
- **Authentication → URL Configuration:** set Site URL and add
  `.../auth/callback` as a redirect URL (localhost for dev, the Vercel URL for
  prod).

New members are added by an admin: create the `auth.users` entry (dashboard →
Add user) and the matching `members` row (via the service-role client / SQL),
optionally gated by a row in `invites`.

## 4. Run

```bash
npm run dev        # http://localhost:3000
```

## 5. Deploy

Push to GitHub and import the repo in Vercel (framework auto-detected as
Next.js). Set the three env vars in Vercel first, then deploy.

---

## Security model (Handoff §2, §3, §7)

- **No public signup** anywhere in the app. Magic-link sign-in only, for
  already-provisioned members.
- **Minors never have accounts.** They are `members` rows a guardian manages
  (`is_minor = true`, `profile_owner_id` = guardian). A DB `CHECK` makes it
  structurally impossible for a minor row to hold city/role/bio/contact — only
  `name` + `age` exist, both visible group-wide by product decision.
- **Field-level visibility is enforced in the database.** From the `members`
  base table a member can read only their own row (RLS); all cross-member reads
  go through the `member_directory` view, which masks fields a member hasn't
  marked shareable. It is not client-side hiding.
- **No address field exists** anywhere in the schema or code — by design.
- **Secrets** (`SUPABASE_SERVICE_ROLE_KEY`) never ship to the browser and are
  never committed.

### Known linter note

`member_directory` is intentionally a `SECURITY DEFINER` view (it must read rows
the caller's RLS hides, in order to return them masked). Supabase's advisor will
flag it as "Security Definer View" — that is expected here; the masking logic in
the view is the whole reason it exists.

## Not built yet (deferred — Handoff §6)

Real messaging, native iOS, photo uploads, payments/ratings/job-board. The four
feature UIs (Directory → Career → Crash Pads → Travel) are the next passes.

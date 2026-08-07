# Messaging — Spec

**Version:** 1
**Status:** Draft for review — not yet built
**Why this exists:** `DadConnect_Engineering_Handoff_v2.md` §6 defers real messaging and calls for "a short spec of its own before starting," precisely so it doesn't get built ad hoc inside Directory or Crash Pads. This is that spec.

---

## 1. The problem

Three shipped features currently dead-end at the moment of actual human contact:

| Feature | Where it dead-ends |
|---|---|
| Member Directory | `contact_preference` says *how* someone likes to be reached, but there's no way to reach them. |
| Crash Pads | A host accepts — and then has no in-app way to send the address. This is the sharpest gap: the whole privacy model (§3) assumes address exchange happens *in messaging*. |
| Career Networking | A resource accepts a request — then what? The conversation has nowhere to live. |

Messaging is the shared primitive all three need. `Rollout_Roadmap_v2.md` Phase 1 anticipated this ("a shared primitive the other three features reuse, so it's built once here rather than per-feature").

## 2. Goals / non-goals

**Goals**
- 1:1 conversations between two adult members.
- Reachable from a member's profile, an accepted crash-pad request, and an accepted career request.
- Enough delivery reliability that a host can send an address and trust it arrives (email notification for unread messages).
- Preserve the platform privacy model: no contact details exposed, no minors.

**Non-goals (v1)**
- Group threads. 1:1 only.
- Attachments/photos. (Travel Sharing has its own photo storage; messaging doesn't need it yet.)
- Read receipts, typing indicators, reactions, editing/unsending.
- Real-time push/websockets — see §6 on why polling is enough to start.
- Moderation tooling, blocking, reporting. Small trusted group; revisit if it ever stops being one.

## 3. Privacy and safety rules (non-negotiable)

These follow directly from the existing platform policies:

1. **Adults only.** Minors have no accounts (§2), therefore no messages. A minor's `member_id` must never appear as a participant. Enforce with a DB `CHECK`-style guard or a policy that verifies both participants have `is_minor = false`.
2. **No contact detail leakage.** Messaging never exposes email or phone. It is the *substitute* for exposing them.
3. **Addresses live in messages, never in columns.** This is the point of the Crash Pads privacy model — do not add an address field anywhere as a result of this feature.
4. **RLS-enforced.** A member can read/write only conversations they are a participant in — enforced in the database, consistent with every other feature, and verified with a second real account before ship.
5. **`contact_preference = "none"`** means a member does not want to be contacted: hide the "Message" affordance and reject sends to them at the action layer.

## 4. Data model (proposed)

Two tables, following existing conventions (text ids, `references members(member_id)`, RLS on everything):

```sql
create table conversations (
  conversation_id text primary key default ('CV-' || gen_random_uuid()),
  member_a_id     text not null references members (member_id),
  member_b_id     text not null references members (member_id),
  -- Optional provenance: which request started this conversation.
  origin_kind     text check (origin_kind in ('direct','crash_pad','career')),
  origin_id       text,
  created_at      timestamptz not null default now(),
  -- One conversation per pair: enforce a canonical ordering (a < b).
  constraint conversations_pair_ordered check (member_a_id < member_b_id),
  constraint conversations_pair_unique unique (member_a_id, member_b_id)
);

create table messages (
  message_id      text primary key default ('MS-' || gen_random_uuid()),
  conversation_id text not null references conversations (conversation_id) on delete cascade,
  sender_id       text not null references members (member_id),
  body            text not null,
  read_at         timestamptz,          -- null = unread by the recipient
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on messages (conversation_id, created_at);
```

Notes:
- The **canonical pair ordering** (`member_a_id < member_b_id` + unique) prevents duplicate conversations when both people start one simultaneously. Get-or-create should insert with `on conflict do nothing` then select.
- `read_at` on the message (not a per-conversation cursor) keeps the unread-count query trivial and supports the email-notification job in §6.
- `origin_kind`/`origin_id` are for context only ("started from a crash pad request") — not a hard dependency.

## 5. RLS policies

- **conversations SELECT:** `member_a_id = current_member_id() or member_b_id = current_member_id()`
- **conversations INSERT:** creator must be one of the two participants; both participants must be adults; recipient's `contact_preference <> 'none'`.
- **messages SELECT:** the message's conversation must be one the caller participates in.
- **messages INSERT:** `sender_id = current_member_id()` **and** the caller participates in that conversation.
- **messages UPDATE:** only to set `read_at`, and only by the *recipient* (not the sender).
- **No DELETE** for members in v1 (consistent with `members` — destructive ops are admin/service-role).

## 6. Notifications

A message nobody sees is worse than no messaging at all — especially when it's an address for a trip next week. But real-time infrastructure is overkill for this group.

**v1 approach:**
- In-app: an unread badge in the site header, from a cheap `count(*) where read_at is null` query.
- Email: a **digest for unread messages**, sent via the existing Resend SMTP setup — "You have 2 unread messages on CMUDadConnect," linking to the conversation. Never include message bodies in the email (privacy).
- Delivery: a scheduled job (Supabase cron / a Vercel cron route) running every ~15 minutes, emailing only about messages unread for more than ~10 minutes, and at most once per hour per member.

**Deliberately deferred:** Supabase Realtime subscriptions for live updates. Polling on page load is sufficient at this scale and avoids a whole class of connection-state bugs. Revisit if usage justifies it.

## 7. Surfaces (UI)

1. **`/messages`** — conversation list: other participant's name, snippet of the last message, unread bold, most-recent first.
2. **`/messages/[conversationId]`** — the thread: messages oldest→newest, compose box at the bottom, marks as read on view.
3. **Entry points** (each does get-or-create then routes to the thread):
   - Directory profile → **Message** button (hidden when `contact_preference = 'none'` or the member is a minor).
   - Crash Pads request, once **accepted** → *"Message [host] to arrange details"* — the intended path for address exchange.
   - Career request, once **accepted** → *"Message [name]"*.
4. **Header** — unread count badge next to a "Messages" nav item.

Design follows the established system (§5): Fraunces headings, mono metadata/timestamps, paper-raised cards, cardinal for the send action.

## 8. Open questions for the project owner

1. **Email digest cadence** — is every 15 minutes right, or is a single daily digest less intrusive for this group?
2. **Can a member opt out of messaging entirely?** `contact_preference = 'none'` currently implies it; should that be a separate, explicit toggle?
3. **Guardian visibility** — minors have no accounts, so nothing to decide for them; but should a guardian see anything about their own conversations differently? (Assumed: no, guardians are just adults.)
4. **Retention** — keep messages forever, or is there any desire to auto-expire old threads?

## 9. Estimated build order

1. Migration: `conversations` + `messages` + RLS. Verify with a second real account.
2. `/messages` list + `/messages/[id]` thread + send action.
3. Entry points from Directory, Crash Pads (accepted), Career (accepted).
4. Unread badge.
5. Email digest job (needs an answer to §8.1).

Steps 1–4 are the meaningful milestone: they close the Crash Pads address-exchange gap, which is the most concrete thing messaging unblocks.

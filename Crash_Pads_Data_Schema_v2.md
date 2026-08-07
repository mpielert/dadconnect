# Crash Pads — Data Schema
**Version:** 2
**Companion files:** `crash_pad_sample_v1.json`, `member_roster_sample_v1.json`
**Depends on:** Member Directory Data Schema (v2)
**Changed from v1:** Threaded the DadConnect name through; versioning scheme changed to whole numbers.

## Purpose
This file structures hosting status and hosting requests for DadConnect. It references members by `memberId` rather than duplicating name/city/contact fields — the roster stays the single source of truth for who someone is; this file only tracks whether they host and what's been requested.

Per the minors policy, **minors never appear in this file at all** — crash pads is out of scope for members under 18 in v1 (no hosting status, no requests, as either traveler or host).

## `hostingStatus[]` — one entry per adult member who has set a status

| Field | Type | Notes |
|---|---|---|
| `memberId` | string | FK to the roster. Adults only. |
| `status` | `"yes"` \| `"maybe"` \| `"no"` | Self-set, changeable any time. Members who haven't set one default to `"no"` / not shown as a host. |
| `constraints` | string or null | Free text, e.g. "couch only," "2 weeks notice," "kids welcome." Optional. |
| `updatedAt` | string (ISO date) | So a traveler can see how fresh a status is — a "yes" from 8 months ago is worth less than one from last week. |

Note: **city is not duplicated here.** A host's city always comes from their roster record (`member_roster_sample_v1.json`) via `memberId` — if it ever needs to change, it changes in exactly one place.

## `requests[]` — one entry per hosting request, traveler-to-host

| Field | Type | Notes |
|---|---|---|
| `requestId` | string | Permanent, never reused, even if a request is withdrawn or expires. |
| `travelerId` | string | FK to roster — who's asking. |
| `hostId` | string | FK to roster — who's being asked. |
| `city` | string | Copied at request time for display convenience (a host's city could theoretically change later; the request should still show what city it was about). |
| `dates` | object `{start, end}` | ISO dates. |
| `headcount` | integer | How many people. |
| `context` | string | Short free-text note from the traveler (why, who's coming, etc.). |
| `status` | `"pending"` \| `"accepted"` \| `"declined"` \| `"countered"` | Set by the host's response. |
| `counterNote` | string or null | Host's counter-proposal text (e.g. "can't host but happy to grab dinner"), only when `status = "countered"`. |
| `createdAt` | string (ISO date) | |

## What's deliberately **not** in this schema
- **No address field, anywhere.** Per the Crash Pads PRD, exact address is never stored as structured data — it's exchanged person-to-person via in-app message only after a host accepts. This isn't an oversight; it's the privacy model. An `addressRevealed` boolean isn't included either, since revealing happens in the messaging layer, not this data layer.
- **No minors.** Consistent with DadConnect's platform-wide minors policy — a minor can't be a host or a traveler in v1.
- **No payment/cost fields** — explicitly out of scope per the PRD.

## Sample data note
`crash_pad_sample_v1.json` uses the same fictional placeholder members as the roster sample, per project privacy standards.

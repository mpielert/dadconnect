# Career Networking — Data Schema
**Version:** 1
**Companion file:** none yet (no sample data drafted for this feature so far — flag if you'd like one before handoff)
**Depends on:** Member Directory Data Schema (v2)

## Purpose
Structures who's opted in as a career resource and the requests made to them, for DadConnect. References members by `memberId` only, same pattern as Crash Pads and Travel Sharing — the roster stays the single source of truth.

Per DadConnect's platform-wide minors policy, **minors never appear in this file.** Opting in as a resource or sending a request both require the kind of self-service account minors don't get, so career networking simply doesn't apply to minor profiles in v1 — consistent with the other three feature schemas.

## `careerResources[]` — one entry per adult member who has opted in

| Field | Type | Notes |
|---|---|---|
| `memberId` | string | FK to the roster. Adults only. |
| `optedIn` | boolean | Self-set. A member with no entry, or `optedIn = false`, doesn't appear in browse/search results. |
| `industry` | string or null | Free text or a small controlled list (e.g., "Finance," "Healthcare," "Software") — worth deciding which when this gets built; the PRD's example searches ("anyone in finance") suggest at least loose categorization matters more than free text alone. |
| `companyOrSchool` | string or null | Current employer or, for a next-gen member early in their career, their school/program — mirrors the roster's `roleOrSchool` field but kept separate here since someone might share their role in the directory without opting into career conversations, or vice versa. |
| `functionArea` | string or null | e.g. "engineering," "sales," "operations" — optional, adds a second axis to search beyond industry. |
| `updatedAt` | string (ISO date) | Same freshness rationale as Crash Pads' hosting status — a resource entry from two years ago is worth less than one from last month. |

Note: **name, city, and contact info are not duplicated here** — they come from the roster via `memberId`, same pattern as `hostingStatus[]` in Crash Pads.

## `careerRequests[]` — one entry per request from a kid/member to a resource

| Field | Type | Notes |
|---|---|---|
| `requestId` | string | Permanent, never reused, even if withdrawn or expired. |
| `requesterId` | string | FK to roster — who's asking (per the PRD, typically a next-gen member). |
| `resourceId` | string | FK to roster — who's being asked. |
| `ask` | string | Free text: what they're looking for (advice, an intro, a mock interview, etc.) — matches the PRD's "structured request" flow. |
| `status` | `"pending"` \| `"accepted"` \| `"declined"` \| `"redirected"` | `"redirected"` covers the PRD's "respond and connect... or redirects" case — the resource points the requester to someone better suited rather than accepting or declining outright. |
| `redirectNote` | string or null | Only when `status = "redirected"` — e.g. "Talk to Mike, he's actually in that industry." |
| `outcomeNote` | string or null | Optional, added after the fact — the PRD's "light tracking (optional)... this led to X" step. Free text, not a structured outcome type; this is meant to be a nice-to-have signal, not a CRM. |
| `createdAt` | string (ISO date) | |

## What's deliberately **not** in this schema
- **No resume/document storage.** Resume review tooling is explicitly out of scope per the PRD.
- **No job postings.** A job board is explicitly out of scope per the PRD.
- **No matching algorithm fields** (compatibility scores, etc.) — the PRD calls this out as deferred; browse/search is manual, not algorithmic, in v1.
- **No minors** — consistent with every other feature schema.

## Open question carried over from the PRD
The PRD's target user includes "a student... looking for advice" — worth confirming during build whether that's meant to include next-gen members who are adults but still in school (college), which this schema assumes, versus anyone younger. Since minors are excluded from accounts entirely per the platform-wide policy, this schema treats "student" as shorthand for "adult member currently in school," not literally any age.
